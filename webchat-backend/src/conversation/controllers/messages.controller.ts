import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ConversationMember } from 'src/database/schemas/conversation-member.schema';
import { MessageEntity } from 'src/database/schemas/messages.schema';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { MessagesQueryDto } from '../dtos/messages-query.dto';
import { MessagesResponseDto } from '../dtos/messages-response.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  private static readonly DEFAULT_LIMIT = 50;

  constructor(
    @InjectRepository(ConversationMember)
    private readonly conversationMemberRepository: Repository<ConversationMember>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}

  @Get(':conversationId/messages')
  async getMessages(
    @Req() req: Request,
    @Param('conversationId') conversationId: string,
    @Query() query: MessagesQueryDto,
  ): Promise<MessagesResponseDto> {
    const currentUser = req.user as { id: string };

    const membership = await this.conversationMemberRepository.findOne({
      where: {
        conversationId,
        userId: currentUser.id,
      },
      select: ['id'],
    });

    if (!membership) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    const limit = query.limit ?? MessagesController.DEFAULT_LIMIT;

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', {
        conversationId,
      })
      .orderBy('message.id', 'DESC')
      .limit(limit);

    if (query.cursor) {
      queryBuilder.andWhere('message.id < :cursor', {
        cursor: query.cursor,
      });
    }

    const messages = await queryBuilder.getMany();

    return {
      items: messages.map((message) => ({
        id: message.id,
        conversationId: message.conversationId,
        senderUserId: message.senderUserId,
        cipherText: message.cipherText,
        iv: message.iv,
        authTag: message.authTag,
        createdAt: message.createdAt,
      })),
      nextCursor:
        messages.length === limit ? messages[messages.length - 1].id : null,
    };
  }
}
