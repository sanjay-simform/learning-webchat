import { Injectable, Logger } from '@nestjs/common';
import WebSocket from 'ws';

@Injectable()
export class ConnectionRegistryService {
  private readonly logger = new Logger(ConnectionRegistryService.name);
  private readonly socketsByUser = new Map<string, Set<WebSocket>>();
  private onUserOffline: ((userId: string) => void) | null = null;

  register(userId: string, socket: WebSocket): void {
    const sockets = this.socketsByUser.get(userId) ?? new Set<WebSocket>();
    sockets.add(socket);
    this.socketsByUser.set(userId, sockets);
    console.log('Connected client ,', userId);
  }

  remove(userId: string, socket: WebSocket): void {
    const sockets = this.socketsByUser.get(userId);
    if (!sockets) {
      return;
    }

    sockets.delete(socket);
    if (sockets.size === 0) {
      this.socketsByUser.delete(userId);
      // User went offline (no more active connections)
      if (this.onUserOffline) {
        this.onUserOffline(userId);
      }
    }
  }

  /**
   * Check if user is currently online (has active WebSocket connection)
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.socketsByUser.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  /**
   * Get all currently online user IDs
   */
  getOnlineUsers(): string[] {
    return Array.from(this.socketsByUser.keys());
  }

  /**
   * Set callback for when a user goes offline
   */
  setOnUserOfflineCallback(callback: (userId: string) => void): void {
    this.onUserOffline = callback;
  }

  emitToUser(userId: string, event: string, data: unknown): number {
    const sockets = this.socketsByUser.get(userId);
    if (!sockets || sockets.size === 0) {
      return 0;
    }

    const staleSockets: WebSocket[] = [];
    const payload = JSON.stringify({ event, data });
    let delivered = 0;

    for (const socket of sockets) {
      if (socket.readyState !== WebSocket.OPEN) {
        staleSockets.push(socket);
        continue;
      }

      try {
        socket.send(payload);
        delivered += 1;
      } catch (error) {
        this.logger.warn(
          `Failed to send socket payload for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        staleSockets.push(socket);
        socket.terminate();
      }
    }

    for (const socket of staleSockets) {
      sockets.delete(socket);
    }

    if (sockets.size === 0) {
      this.socketsByUser.delete(userId);
      // User went offline (no more active connections)
      if (this.onUserOffline) {
        this.onUserOffline(userId);
      }
    }

    return delivered;
  }
}
