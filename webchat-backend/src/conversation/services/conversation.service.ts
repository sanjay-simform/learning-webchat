import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Conversation } from 'src/database/schemas/conversation.schema';
import { ConversationMember } from 'src/database/schemas/conversation-member.schema';
import { User } from 'src/database/schemas/user.schema';
import {
  ConversationPeerDto,
  ConversationSummaryDto,
} from '../dtos/conversation-summary.dto';
import { ConversationCryptoService } from './conversation-crypto.service';
import { DataSource } from 'typeorm';
import { UserProfile } from 'src/database/schemas/user-profile.schema';
import { ConnectionRegistryService } from 'src/chat/services/connection-registry.service';

interface ConversationUserProjection {
  id: string;
  username: string;
  rsa_public_key: string;
  profile: UserProfile | null;
}

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(ConversationMember)
    private conversationMemberRepository: Repository<ConversationMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private conversationCryptoService: ConversationCryptoService,
    private dataSource: DataSource,
    private connectionRegistry: ConnectionRegistryService,
  ) {}

  async inviteUserById(
    currentUserId: string,
    invitedUserId: string,
  ): Promise<ConversationSummaryDto> {
    const invitedUser = await this.findConversationUserById(invitedUserId);
    if (!invitedUser) {
      throw new NotFoundException('User not found');
    }

    if (invitedUser.id === currentUserId) {
      throw new BadRequestException('You cannot invite yourself');
    }

    const currentUser = await this.findConversationUserById(currentUserId);
    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    if (!currentUser.rsa_public_key || !invitedUser.rsa_public_key) {
      throw new BadRequestException('User public key is missing');
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const participantIds = [currentUser.id, invitedUser.id].sort();

      await queryRunner.manager
        .createQueryBuilder(User, 'user')
        .where('user.id IN (:...participantIds)', { participantIds })
        .orderBy('user.id', 'ASC')
        .setLock('pessimistic_write')
        .getMany();

      const existingConversationId =
        await this.findExistingDirectConversationId(
          queryRunner.manager.getRepository(ConversationMember),
          currentUser.id,
          invitedUser.id,
        );

      if (existingConversationId) {
        const [existingConversation, currentMembership] = await Promise.all([
          queryRunner.manager.findOne(Conversation, {
            where: {
              id: existingConversationId,
            },
          }),
          queryRunner.manager.findOne(ConversationMember, {
            where: {
              conversationId: existingConversationId,
              userId: currentUser.id,
            },
          }),
        ]);

        if (!existingConversation || !currentMembership) {
          throw new NotFoundException('Conversation not found');
        }

        await queryRunner.commitTransaction();

        return this.toSummaryDto(
          existingConversation.id,
          existingConversation.createdAt,
          currentMembership.encryptedConversationKey,
          invitedUser,
        );
      }

      const conversation = await queryRunner.manager.save(
        queryRunner.manager.create(Conversation, {}),
      );

      const conversationKey =
        this.conversationCryptoService.generateConversationKey();

      const encryptedForCurrentUser =
        this.conversationCryptoService.encryptConversationKeyForPublicKey(
          conversationKey,
          currentUser.rsa_public_key,
        );

      const encryptedForInvitedUser =
        this.conversationCryptoService.encryptConversationKeyForPublicKey(
          conversationKey,
          invitedUser.rsa_public_key,
        );

      const members = queryRunner.manager.create(ConversationMember, [
        {
          conversationId: conversation.id,
          userId: currentUser.id,
          encryptedConversationKey: encryptedForCurrentUser,
        },
        {
          conversationId: conversation.id,
          userId: invitedUser.id,
          encryptedConversationKey: encryptedForInvitedUser,
        },
      ]);

      await queryRunner.manager.save(members);
      await queryRunner.commitTransaction();
      const membership = await this.conversationMemberRepository.findOne({
        where: {
          conversationId: conversation.id,
          userId: Not(currentUser.id),
        },
        relations: {
          conversation: {
            members: {
              user: {
                profile: true,
              },
            },
          },
        },
        order: {
          conversation: {
            createdAt: 'DESC',
          },
        },
      });
      this.connectionRegistry.emitToUser(
        invitedUser.id,
        'conversation_invitation',
        membership,
      );
      return this.toSummaryDto(
        conversation.id,
        conversation.createdAt,
        encryptedForCurrentUser,
        invitedUser,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async listConversationsForUser(
    currentUserId: string,
  ): Promise<ConversationSummaryDto[]> {
    const memberships = await this.conversationMemberRepository.find({
      where: {
        userId: currentUserId,
      },
      relations: {
        conversation: {
          members: {
            user: {
              profile: true,
            },
          },
        },
      },
      order: {
        conversation: {
          createdAt: 'DESC',
        },
      },
    });

    return memberships
      .filter((membership) => membership.conversation.members.length === 2)
      .map((membership) => {
        const peerMember = membership.conversation.members.find(
          (member) => member.userId !== currentUserId,
        );

        if (!peerMember || !peerMember.user) {
          throw new NotFoundException('Conversation peer not found');
        }

        return this.toSummaryDto(
          membership.conversation.id,
          membership.conversation.createdAt,
          membership.encryptedConversationKey,
          {
            id: peerMember.user.id,
            username: peerMember.user.username,
            rsa_public_key: peerMember.user.rsa_public_key,
            profile: peerMember.user.profile,
          },
          membership.unreadCount,
        );
      });
  }

  private async findConversationUserById(
    id: string,
  ): Promise<ConversationUserProjection | null> {
    return this.userRepository.findOne({
      where: {
        id,
      },
      relations: {
        profile: true,
      },
      select: ['id', 'username', 'rsa_public_key', 'profile'],
    });
  }

  private async findExistingDirectConversationId(
    memberRepository: Repository<ConversationMember>,
    currentUserId: string,
    invitedUserId: string,
  ): Promise<string | null> {
    const currentUserMemberships = await memberRepository.find({
      where: {
        userId: currentUserId,
      },
      select: ['conversationId'],
    });

    if (currentUserMemberships.length === 0) {
      return null;
    }

    const candidateConversationIds = currentUserMemberships.map(
      (membership) => membership.conversationId,
    );

    const invitedUserMemberships = await memberRepository.find({
      where: {
        userId: invitedUserId,
        conversationId: In(candidateConversationIds),
      },
      select: ['conversationId'],
    });

    if (invitedUserMemberships.length === 0) {
      return null;
    }

    for (const membership of invitedUserMemberships) {
      const memberCount = await memberRepository.count({
        where: {
          conversationId: membership.conversationId,
        },
      });

      if (memberCount === 2) {
        return membership.conversationId;
      }
    }

    return null;
  }

  private toSummaryDto(
    conversationId: string,
    createdAt: Date,
    encryptedConversationKey: string,
    peerUser: ConversationUserProjection,
    unreadCount: number = 0,
  ): ConversationSummaryDto {
    const peer: ConversationPeerDto = {
      id: peerUser.id,
      username: peerUser.username,
      userProfile: peerUser.profile,
    };

    return {
      id: conversationId,
      createdAt,
      encryptedConversationKey,
      peer,
      unreadCount,
    };
  }

  /**
   * Increment unread count for a user in a specific conversation
   */
  async incrementUnreadCount(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.conversationMemberRepository
      .createQueryBuilder()
      .update(ConversationMember)
      .set({
        unreadCount: () => '"unreadCount" + 1',
      })
      .where('conversationId = :conversationId AND userId = :userId', {
        conversationId,
        userId,
      })
      .execute();
  }

  /**
   * Reset unread count to 0 for a user in a specific conversation
   */
  async resetUnreadCount(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.conversationMemberRepository.update(
      {
        conversationId,
        userId,
      },
      {
        unreadCount: 0,
      },
    );
  }

  /**
   * Get unread count for a user in a specific conversation
   */
  async getUnreadCount(
    conversationId: string,
    userId: string,
  ): Promise<number> {
    const membership = await this.conversationMemberRepository.findOne({
      where: {
        conversationId,
        userId,
      },
      select: ['unreadCount'],
    });

    return membership?.unreadCount ?? 0;
  }

  /**
   * Get all unread counts for a user
   */
  async getUnreadCountsForUser(userId: string): Promise<Map<string, number>> {
    const memberships = await this.conversationMemberRepository.find({
      where: {
        userId,
      },
      select: ['conversationId', 'unreadCount'],
    });

    const unreadCounts = new Map<string, number>();
    for (const membership of memberships) {
      unreadCounts.set(membership.conversationId, membership.unreadCount);
    }
    return unreadCounts;
  }
}
