import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type IORedis from 'ioredis';
import {
  REDIS_CONNECTION,
  REDIS_SUBSCRIBER_CONNECTION,
} from 'src/redis/constants';
import { CHAT_ACK_CHANNEL, CHAT_OUTBOUND_CHANNEL } from '../constants';
import {
  MessageDeliveryAckEvent,
  OutboundChatMessageEvent,
} from '../types/chat-events';
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
    @Inject(REDIS_CONNECTION)
    private readonly commandRedis: IORedis,
    @Inject(REDIS_SUBSCRIBER_CONNECTION)
    private readonly subscriberRedis: IORedis,
  ) {}

  async onModuleInit(): Promise<void> {
    this.subscriberRedis.on('message', this.redisMessageHandler);
    await this.subscriberRedis.subscribe(
      CHAT_OUTBOUND_CHANNEL,
      CHAT_ACK_CHANNEL,
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.subscriberRedis.off('message', this.redisMessageHandler);
    await this.subscriberRedis.unsubscribe(
      CHAT_OUTBOUND_CHANNEL,
      CHAT_ACK_CHANNEL,
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
      this.handleDeliveryAck(rawMessage);
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
        status: deliveredSockets > 0 ? 'delivered' : 'stored',
        ackAt: new Date().toISOString(),
      };

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

  private handleDeliveryAck(rawMessage: string): void {
    try {
      const ackEvent = JSON.parse(rawMessage) as MessageDeliveryAckEvent;
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
}
