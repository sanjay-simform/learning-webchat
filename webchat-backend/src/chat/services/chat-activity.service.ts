import { Injectable, Logger } from '@nestjs/common';

/**
 * Tracks which conversation each user is currently actively viewing
 * per WebSocket connection.
 *
 * This helps determine whether to increment unread count for incoming messages:
 * - If user is actively viewing a conversation, don't increment unread
 * - If user is viewing a different conversation or not in chat, increment unread
 */
@Injectable()
export class ChatActivityService {
  private readonly logger = new Logger(ChatActivityService.name);

  // Map: userId -> { conversationId, socketId }
  // Note: A single user can have multiple WebSocket connections (multiple tabs/devices)
  private activeChats: Map<
    string,
    Map<string, { conversationId: string | null; socketId: string }>
  > = new Map();

  /**
   * Register a socket connection for a user
   * Initially, no conversation is "active"
   */
  registerConnection(userId: string, socketId: string): void {
    if (!this.activeChats.has(userId)) {
      this.activeChats.set(userId, new Map());
    }
    this.activeChats.get(userId)!.set(socketId, {
      conversationId: null,
      socketId,
    });
  }

  /**
   * Set the active conversation for a specific socket connection
   */
  setActiveConversation(
    userId: string,
    socketId: string,
    conversationId: string,
  ): void {
    const userConnections = this.activeChats.get(userId);
    if (userConnections && userConnections.has(socketId)) {
      userConnections.get(socketId)!.conversationId = conversationId;
      this.logger.debug(
        `User ${userId} (socket ${socketId}) set active conversation: ${conversationId}`,
      );
    }
  }

  /**
   * Clear the active conversation for a specific socket connection
   */
  clearActiveConversation(userId: string, socketId: string): void {
    const userConnections = this.activeChats.get(userId);
    if (userConnections && userConnections.has(socketId)) {
      userConnections.get(socketId)!.conversationId = null;
    }
  }

  /**
   * Remove a socket connection (when user disconnects)
   */
  removeConnection(userId: string, socketId: string): void {
    const userConnections = this.activeChats.get(userId);
    if (userConnections) {
      userConnections.delete(socketId);
      if (userConnections.size === 0) {
        this.activeChats.delete(userId);
      }
    }
  }

  /**
   * Check if user is actively viewing a specific conversation
   * Returns true if ANY of the user's connections are viewing that conversation
   */
  isUserViewingConversation(userId: string, conversationId: string): boolean {
    const userConnections = this.activeChats.get(userId);
    if (!userConnections) return false;

    for (const connection of userConnections.values()) {
      if (connection.conversationId === conversationId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the active conversation for a user (returns the first active one if multiple)
   */
  getActiveConversation(userId: string): string | null {
    const userConnections = this.activeChats.get(userId);
    if (!userConnections) return null;

    for (const connection of userConnections.values()) {
      if (connection.conversationId) {
        return connection.conversationId;
      }
    }
    return null;
  }
}
