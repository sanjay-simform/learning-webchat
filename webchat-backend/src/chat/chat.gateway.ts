import { Inject, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
  type WsResponse,
} from '@nestjs/websockets';
import type { IncomingMessage } from 'http';
import type IORedis from 'ioredis';
import { REDIS_CONNECTION } from 'src/redis/constants';
import { JwtService } from 'src/shared/services/jwt.service';
import WebSocket from 'ws';
import {
  CHAT_DELIVERED_CHANNEL,
  CHAT_SEEN_CHANNEL,
  CHAT_STREAM_KEY,
} from './constants';
import {
  MarkMessagesDeliveredDto,
  MarkMessagesSeenDto,
  SendMessageDto,
} from './dtos';
import { ConnectionRegistryService } from './services/connection-registry.service';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
}

interface MessageQueuedResponse {
  clientMsgId: string | null;
  status: 'queued';
}

@WebSocketGateway({
  path: '/ws',
})
export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly connectionRegistry: ConnectionRegistryService,
    @Inject(REDIS_CONNECTION)
    private readonly commandRedis: IORedis,
  ) {}

  async handleConnection(
    client: WebSocket,
    request: IncomingMessage,
  ): Promise<void> {
    const token = this.extractToken(request);
    if (!token) {
      this.emitDirect(client, 'auth_error', { message: 'Missing token' });
      client.terminate();
      return;
    }

    try {
      const payload = (await this.jwtService.verify(token)) as {
        sub?: string;
      };

      if (!payload.sub) {
        this.emitDirect(client, 'auth_error', { message: 'Invalid token' });
        client.terminate();
        return;
      }

      const authenticatedClient = client as AuthenticatedSocket;
      authenticatedClient.userId = payload.sub;

      this.connectionRegistry.register(payload.sub, client);

      // Broadcast to all other online users that this user came online
      this.broadcastPresenceUpdate(payload.sub, 'user_came_online');
    } catch {
      this.emitDirect(client, 'auth_error', { message: 'Invalid token' });
      client.terminate();
    }
  }

  handleDisconnect(client: WebSocket): void {
    const authenticatedClient = client as AuthenticatedSocket;
    if (!authenticatedClient.userId) {
      return;
    }

    this.connectionRegistry.remove(authenticatedClient.userId, client);

    // Check if user is now completely offline
    if (!this.connectionRegistry.isUserOnline(authenticatedClient.userId)) {
      this.broadcastPresenceUpdate(
        authenticatedClient.userId,
        'user_went_offline',
      );
    }
  }

  @SubscribeMessage('send_message')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async handleSendMessage(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() dto: SendMessageDto,
  ): Promise<WsResponse<MessageQueuedResponse>> {
    const authenticatedClient = client as AuthenticatedSocket;
    const senderUserId = authenticatedClient.userId;

    if (!senderUserId) {
      throw new WsException('Unauthorized websocket session');
    }

    try {
      await this.commandRedis.call(
        'XADD',
        CHAT_STREAM_KEY,
        '*',
        'conversationId',
        dto.conversationId,
        'senderUserId',
        senderUserId,
        'cipherText',
        dto.cipherText,
        'iv',
        dto.iv,
        'authTag',
        dto.authTag,
        'clientMsgId',
        dto.clientMsgId ?? '',
        'payload',
        JSON.stringify(dto.payload),
      );

      return {
        event: 'message_queued',
        data: {
          clientMsgId: dto.clientMsgId ?? null,
          status: 'queued',
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to enqueue chat message: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new WsException('Failed to queue message');
    }
  }

  @SubscribeMessage('mark_messages_seen')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async handleMarkMessagesSeen(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() dto: MarkMessagesSeenDto,
  ): Promise<void> {
    const authenticatedClient = client as AuthenticatedSocket;
    const recipientUserId = authenticatedClient.userId;

    if (!recipientUserId) {
      throw new WsException('Unauthorized websocket session');
    }

    const messageIds = [...new Set(dto.messageIds)];
    if (messageIds.length === 0) {
      return;
    }

    try {
      await this.commandRedis.publish(
        CHAT_SEEN_CHANNEL,
        JSON.stringify({
          messageIds,
          recipientUserId,
          seenAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue seen receipt: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new WsException('Failed to mark messages as seen');
    }
  }

  @SubscribeMessage('mark_messages_delivered')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async handleMarkMessagesDelivered(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() dto: MarkMessagesDeliveredDto,
  ): Promise<void> {
    const authenticatedClient = client as AuthenticatedSocket;
    const recipientUserId = authenticatedClient.userId;

    if (!recipientUserId) {
      throw new WsException('Unauthorized websocket session');
    }

    const messageIds = [...new Set(dto.messageIds)];
    if (messageIds.length === 0) {
      return;
    }

    try {
      await this.commandRedis.publish(
        CHAT_DELIVERED_CHANNEL,
        JSON.stringify({
          messageIds,
          recipientUserId,
          deliveredAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue delivered receipt: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new WsException('Failed to mark messages as delivered');
    }
  }

  private emitDirect(client: WebSocket, event: string, data: unknown): void {
    if (client.readyState !== WebSocket.OPEN) {
      return;
    }

    client.send(
      JSON.stringify({
        event,
        data,
      }),
    );
  }

  private extractToken(request: IncomingMessage): string | null {
    const requestUrl = request.url;
    if (!requestUrl) {
      return null;
    }

    const parsedUrl = new URL(requestUrl, 'ws://localhost');
    const token = parsedUrl.searchParams.get('token');

    if (!token) {
      return null;
    }

    if (token.startsWith('Bearer ')) {
      return token.slice(7);
    }

    return token;
  }

  /**
   * Handle user typing indicator
   */
  @SubscribeMessage('user_typing')
  handleUserTyping(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() dto: { conversationId: string },
  ): void {
    const authenticatedClient = client as AuthenticatedSocket;
    if (!authenticatedClient.userId) {
      throw new WsException('Unauthorized websocket session');
    }

    // Broadcast typing indicator to all other online users
    const onlineUsers = this.connectionRegistry.getOnlineUsers();
    for (const onlineUserId of onlineUsers) {
      if (onlineUserId !== authenticatedClient.userId) {
        this.connectionRegistry.emitToUser(onlineUserId, 'user_typing', {
          typingUserId: authenticatedClient.userId,
          conversationId: dto.conversationId,
        });
      }
    }
  }

  /**
   * Broadcast presence update to all other online users
   */
  private broadcastPresenceUpdate(
    userId: string,
    event: 'user_came_online' | 'user_went_offline',
  ): void {
    const onlineUsers = this.connectionRegistry.getOnlineUsers();
    for (const onlineUserId of onlineUsers) {
      if (onlineUserId !== userId) {
        this.connectionRegistry.emitToUser(onlineUserId, event, {
          userId,
          timestamp: Math.floor(Date.now() / 1000),
        });
      }
    }
  }
}
