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
import { CHAT_STREAM_KEY } from './constants';
import { SendMessageDto } from './dtos/send-message.dto';
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
}
