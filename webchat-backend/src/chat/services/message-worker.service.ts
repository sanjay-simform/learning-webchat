import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type IORedis from 'ioredis';
import { Repository } from 'typeorm';
import { ConversationMember } from 'src/database/schemas/conversation-member.schema';
import { MessageEntity } from 'src/database/schemas/messages.schema';
import {
  REDIS_CONNECTION,
  REDIS_PUBLISHER_CONNECTION,
} from 'src/redis/constants';
import {
  CHAT_OUTBOUND_CHANNEL,
  CHAT_STREAM_BATCH_SIZE,
  CHAT_STREAM_BLOCK_MS,
  CHAT_STREAM_CLAIM_BATCH_SIZE,
  CHAT_STREAM_CLAIM_MIN_IDLE_MS,
  CHAT_STREAM_GROUP,
  CHAT_STREAM_KEY,
} from '../constants';
import { OutboundChatMessageEvent } from '../types/chat-events';

interface ParsedStreamMessage {
  streamId: string;
  conversationId: string;
  senderUserId: string;
  cipherText: string;
  iv: string;
  authTag: string;
  clientMsgId: string | null;
}

type StreamEntry = [streamId: string, values: string[]];
type XReadGroupResponse = [streamName: string, entries: StreamEntry[]][] | null;
type XAutoClaimResponse = [
  nextStartId: string,
  entries: StreamEntry[],
  string[]?,
];

@Injectable()
export class MessageWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageWorkerService.name);
  private readonly consumerName = `chat-worker-${process.pid}`;
  private running = false;
  private consumePromise: Promise<void> | null = null;

  constructor(
    @Inject(REDIS_PUBLISHER_CONNECTION)
    private readonly streamRedis: IORedis,
    @Inject(REDIS_CONNECTION)
    private readonly commandRedis: IORedis,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(ConversationMember)
    private readonly conversationMemberRepository: Repository<ConversationMember>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureStreamGroup();
    await this.recoverPendingEntries();

    this.running = true;
    this.consumePromise = this.consumeLoop();
  }

  async onModuleDestroy(): Promise<void> {
    this.running = false;
    if (this.consumePromise) {
      await this.consumePromise;
    }
  }

  private async ensureStreamGroup(): Promise<void> {
    try {
      await this.streamRedis.call(
        'XGROUP',
        'CREATE',
        CHAT_STREAM_KEY,
        CHAT_STREAM_GROUP,
        '$',
        'MKSTREAM',
      );
      this.logger.log(
        `Created stream group ${CHAT_STREAM_GROUP} on ${CHAT_STREAM_KEY}`,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toUpperCase().includes('BUSYGROUP')
      ) {
        return;
      }
      throw error;
    }
  }

  private async recoverPendingEntries(): Promise<void> {
    let nextStartId = '0-0';

    while (true) {
      const claimResult = (await this.streamRedis.call(
        'XAUTOCLAIM',
        CHAT_STREAM_KEY,
        CHAT_STREAM_GROUP,
        this.consumerName,
        String(CHAT_STREAM_CLAIM_MIN_IDLE_MS),
        nextStartId,
        'COUNT',
        String(CHAT_STREAM_CLAIM_BATCH_SIZE),
      )) as XAutoClaimResponse;

      const [newStartId, entries] = claimResult;
      if (!entries || entries.length === 0) {
        break;
      }

      this.logger.log(`Re-claimed ${entries.length} pending stream entries`);
      await this.processEntries(entries);

      nextStartId = newStartId;
      if (nextStartId === '0-0') {
        break;
      }
    }
  }

  private async consumeLoop(): Promise<void> {
    while (this.running) {
      try {
        const response = (await this.streamRedis.call(
          'XREADGROUP',
          'GROUP',
          CHAT_STREAM_GROUP,
          this.consumerName,
          'COUNT',
          String(CHAT_STREAM_BATCH_SIZE),
          'BLOCK',
          String(CHAT_STREAM_BLOCK_MS),
          'STREAMS',
          CHAT_STREAM_KEY,
          '>',
        )) as XReadGroupResponse;

        if (!response || response.length === 0) {
          continue;
        }

        for (const [, entries] of response) {
          await this.processEntries(entries);
        }
      } catch (error) {
        this.logger.error(
          `Message worker loop failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async processEntries(entries: StreamEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.processEntry(entry);
    }
  }

  private async processEntry(entry: StreamEntry): Promise<void> {
    const payload = this.parseStreamEntry(entry);
    if (!payload) {
      await this.ackEntry(entry[0]);
      return;
    }

    try {
      const members = await this.conversationMemberRepository.find({
        where: {
          conversationId: payload.conversationId,
        },
        select: ['userId'],
      });

      if (members.length < 2) {
        this.logger.warn(
          `Conversation ${payload.conversationId} has less than 2 members; dropping message`,
        );
        await this.ackEntry(payload.streamId);
        return;
      }

      const isSenderMember = members.some(
        (member) => member.userId === payload.senderUserId,
      );

      if (!isSenderMember) {
        this.logger.warn(
          `Sender ${payload.senderUserId} not member of conversation ${payload.conversationId}; dropping message`,
        );
        await this.ackEntry(payload.streamId);
        return;
      }

      const recipient = members.find(
        (member) => member.userId !== payload.senderUserId,
      );
      if (!recipient) {
        this.logger.warn(
          `Could not resolve recipient for conversation ${payload.conversationId}; dropping message`,
        );
        await this.ackEntry(payload.streamId);
        return;
      }

      const savedMessage = await this.messageRepository.save(
        this.messageRepository.create({
          conversationId: payload.conversationId,
          senderUserId: payload.senderUserId,
          cipherText: payload.cipherText,
          iv: payload.iv,
          authTag: payload.authTag,
        }),
      );

      const outboundEvent: OutboundChatMessageEvent = {
        messageId: savedMessage.id,
        clientMsgId: payload.clientMsgId,
        conversationId: savedMessage.conversationId,
        senderUserId: savedMessage.senderUserId,
        recipientUserId: recipient.userId,
        cipherText: savedMessage.cipherText,
        iv: savedMessage.iv,
        authTag: savedMessage.authTag,
        createdAt: savedMessage.createdAt.toISOString(),
      };

      await this.commandRedis.publish(
        CHAT_OUTBOUND_CHANNEL,
        JSON.stringify(outboundEvent),
      );

      await this.ackEntry(payload.streamId);
    } catch (error) {
      this.logger.error(
        `Failed processing stream entry ${payload.streamId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private parseStreamEntry(entry: StreamEntry): ParsedStreamMessage | null {
    const [streamId, fieldValues] = entry;
    const fields = this.toFieldMap(fieldValues);

    const conversationId = fields.conversationId;
    const senderUserId = fields.senderUserId;
    const cipherText = fields.cipherText;
    const iv = fields.iv;
    const authTag = fields.authTag;

    if (!conversationId || !senderUserId || !cipherText || !iv || !authTag) {
      this.logger.warn(
        `Invalid stream message ${streamId}; required fields missing`,
      );
      return null;
    }

    const clientMsgId = fields.clientMsgId || null;

    return {
      streamId,
      conversationId,
      senderUserId,
      cipherText,
      iv,
      authTag,
      clientMsgId,
    };
  }

  private toFieldMap(fieldValues: string[]): Record<string, string> {
    const fieldMap: Record<string, string> = {};

    for (let index = 0; index < fieldValues.length; index += 2) {
      const key = fieldValues[index];
      const value = fieldValues[index + 1] ?? '';
      fieldMap[key] = value;
    }

    return fieldMap;
  }

  private async ackEntry(streamId: string): Promise<void> {
    await this.streamRedis.call(
      'XACK',
      CHAT_STREAM_KEY,
      CHAT_STREAM_GROUP,
      streamId,
    );
  }
}
