import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type IORedis from 'ioredis';
import {
  REDIS_CONNECTION,
  REDIS_SUBSCRIBER_CONNECTION,
} from 'src/redis/constants';
import {
  MessageEntity,
  MessageStatus,
} from 'src/database/schemas/messages.schema';
import {
  CHAT_ACK_CHANNEL,
  CHAT_DELIVERED_CHANNEL,
  CHAT_OUTBOUND_CHANNEL,
  CHAT_SEEN_CHANNEL,
} from '../constants';
import {
  MessageDeliveryAckEvent,
  MessageDeliveredReceiptEvent,
  MessageSeenReceiptEvent,
  OutboundChatMessageEvent,
} from '../types/chat-events';
import { In, Repository } from 'typeorm';
import { ConnectionRegistryService } from './connection-registry.service';

@Injectable()
export class ChatFanoutService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatFanoutService.name);

  private readonly redisMessageHandler = (
    channel: string,
    rawMessage: string,
  ) => {
    void this.handleRedisMessage(channel, rawMessage);
  };

  constructor(
    private readonly connectionRegistry: ConnectionRegistryService,
    @Inject(REDIS_CONNECTION as string)
    private readonly commandRedis: IORedis,
    @Inject(REDIS_SUBSCRIBER_CONNECTION as string)
    private readonly subscriberRedis: IORedis,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.subscriberRedis.on('message', this.redisMessageHandler);
    await this.subscriberRedis.subscribe(
      CHAT_OUTBOUND_CHANNEL,
      CHAT_ACK_CHANNEL,
      CHAT_DELIVERED_CHANNEL,
      CHAT_SEEN_CHANNEL,
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.subscriberRedis.off('message', this.redisMessageHandler);
    await this.subscriberRedis.unsubscribe(
      CHAT_OUTBOUND_CHANNEL,
      CHAT_ACK_CHANNEL,
      CHAT_DELIVERED_CHANNEL,
      CHAT_SEEN_CHANNEL,
    );
  }

  private async handleRedisMessage(
    channel: string,
    rawMessage: string,
  ): Promise<void> {
    if (channel === CHAT_OUTBOUND_CHANNEL) {
      await this.handleOutboundMessage(rawMessage);
      return;
    }

    if (channel === CHAT_ACK_CHANNEL) {
      void this.handleDeliveryAck(rawMessage);
      return;
    }

    if (channel === CHAT_DELIVERED_CHANNEL) {
      await this.handleDeliveredReceipt(rawMessage);
      return;
    }

    if (channel === CHAT_SEEN_CHANNEL) {
      await this.handleSeenReceipt(rawMessage);
    }
  }

  private async handleOutboundMessage(rawMessage: string): Promise<void> {
    try {
      const outboundEvent = JSON.parse(rawMessage) as OutboundChatMessageEvent;

      const deliveredSockets = this.connectionRegistry.emitToUser(
        outboundEvent.recipientUserId,
        'new_message',
        outboundEvent,
      );

      const deliveryAck: MessageDeliveryAckEvent = {
        messageId: outboundEvent.messageId,
        clientMsgId: outboundEvent.clientMsgId,
        conversationId: outboundEvent.conversationId,
        senderUserId: outboundEvent.senderUserId,
        recipientUserId: outboundEvent.recipientUserId,
        status: MessageStatus.DELIVERED,
        ackAt: new Date().toISOString(),
        payload: outboundEvent.payload,
      };

      const persistedStatus = await this.persistMessageStatus(
        deliveryAck.messageId,
        MessageStatus.DELIVERED,
      );

      if (persistedStatus === MessageStatus.SEEN) {
        return;
      }

      await this.commandRedis.publish(
        CHAT_ACK_CHANNEL,
        JSON.stringify(deliveryAck),
      );
    } catch (error) {
      this.logger.error(
        `Failed handling outbound chat event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleDeliveryAck(rawMessage: string): Promise<void> {
    try {
      const ackEvent = JSON.parse(rawMessage) as MessageDeliveryAckEvent;

      if (ackEvent.status === MessageStatus.DELIVERED) {
        const persistedStatus = await this.persistMessageStatus(
          ackEvent.messageId,
          MessageStatus.DELIVERED,
        );

        if (persistedStatus === MessageStatus.SEEN) {
          return;
        }
      }

      this.connectionRegistry.emitToUser(
        ackEvent.senderUserId,
        'message_delivery',
        ackEvent,
      );
    } catch (error) {
      this.logger.error(
        `Failed handling delivery ack event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleDeliveredReceipt(rawMessage: string): Promise<void> {
    try {
      const deliveredReceipt = JSON.parse(
        rawMessage,
      ) as MessageDeliveredReceiptEvent;
      const uniqueMessageIds = [...new Set(deliveredReceipt.messageIds)];

      if (uniqueMessageIds.length === 0) {
        return;
      }

      const messages = await this.messageRepository.findBy({
        id: In(uniqueMessageIds),
      });

      for (const message of messages) {
        if (message.senderUserId === deliveredReceipt.recipientUserId) {
          continue;
        }

        if (
          message.status === MessageStatus.DELIVERED ||
          message.status === MessageStatus.SEEN
        ) {
          continue;
        }

        await this.persistMessageStatus(message.id, MessageStatus.DELIVERED);

        this.connectionRegistry.emitToUser(
          message.senderUserId,
          'message_delivery',
          {
            messageId: message.id,
            clientMsgId: null,
            conversationId: message.conversationId,
            senderUserId: message.senderUserId,
            recipientUserId: deliveredReceipt.recipientUserId,
            status: MessageStatus.DELIVERED,
            ackAt: deliveredReceipt.deliveredAt,
            payload: message.payload,
          } satisfies MessageDeliveryAckEvent,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed handling delivered receipt event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleSeenReceipt(rawMessage: string): Promise<void> {
    try {
      const seenReceipt = JSON.parse(rawMessage) as MessageSeenReceiptEvent;
      const uniqueMessageIds = [...new Set(seenReceipt.messageIds)];

      if (uniqueMessageIds.length === 0) {
        return;
      }

      const messages = await this.messageRepository.findBy({
        id: In(uniqueMessageIds),
      });

      for (const message of messages) {
        if (message.senderUserId === seenReceipt.recipientUserId) {
          continue;
        }

        if (message.status !== MessageStatus.SEEN) {
          await this.persistMessageStatus(message.id, MessageStatus.SEEN);
        }

        this.connectionRegistry.emitToUser(
          message.senderUserId,
          'message_delivery',
          {
            messageId: message.id,
            clientMsgId: null,
            conversationId: message.conversationId,
            senderUserId: message.senderUserId,
            recipientUserId: seenReceipt.recipientUserId,
            status: MessageStatus.SEEN,
            ackAt: seenReceipt.seenAt,
            payload: message.payload,
          } satisfies MessageDeliveryAckEvent,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed handling seen receipt event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async persistMessageStatus(
    messageId: string,
    status: MessageStatus,
  ): Promise<MessageStatus | null> {
    try {
      const message = await this.messageRepository.findOneBy({ id: messageId });
      if (!message) {
        this.logger.warn(
          `Message ${messageId} was not found while updating status ${status}`,
        );
        return null;
      }

      if (status === MessageStatus.DELIVERED) {
        if (message.status === MessageStatus.SEEN) {
          return MessageStatus.SEEN;
        }

        if (message.status !== MessageStatus.DELIVERED) {
          await this.messageRepository.update(messageId, { status });
        }

        return MessageStatus.DELIVERED;
      }

      if (status === MessageStatus.SEEN) {
        if (message.status !== MessageStatus.SEEN) {
          await this.messageRepository.update(messageId, { status });
        }

        return MessageStatus.SEEN;
      }

      await this.messageRepository.update(messageId, { status });
      return status;
    } catch (error) {
      this.logger.error(
        `Failed to persist message ${messageId} status ${status}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
