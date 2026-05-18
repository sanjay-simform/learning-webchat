import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../context/SocketContext";
import type { ConversationSummaryDto } from "../../api-client/services/conversation/conversation.service.dto";

interface ConversationMemberPayload {
  conversationId: string;
  conversation: {
    id: string;
    createdAt: string;
    members: Array<{
      userId: string;
      user: {
        id: string;
        username: string;
        profile: {
          avatarUrl: string | null;
          displayName: string | null;
        };
      };
      encryptedConversationKey: string;
    }>;
  };
  userId: string;
  encryptedConversationKey: string;
}

/**
 * Hook to handle conversation invitation events
 * When a user is invited to a conversation, this hook:
 * 1. Receives the event via WebSocket
 * 2. Transforms the membership data to ConversationSummaryDto format
 * 3. Updates the React Query cache to show the new conversation immediately
 * 4. Triggers a callback so parent component can show a toast notification
 *
 * Uses useEffect to properly manage listener lifecycle and prevent duplicate listeners
 */
export const useConversationMemberEvent = (
  onConversationInvited?: (username: string) => void,
) => {
  const { onEvent } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Register the event listener - onEvent returns an unsubscribe function
    const unsubscribe = onEvent(
      "conversation_invitation",
      (payload: ConversationMemberPayload) => {
        console.log("Received conversation invitation:", payload);

        // Transform the membership data to ConversationSummaryDto format
        const invitingUser = payload.conversation.members.find(
          (member) => member.userId !== payload.userId,
        );

        if (!invitingUser) {
          console.error("Inviting user not found in conversation");
          return;
        }

        // Create ConversationSummaryDto from the event payload
        // const newConversation: ConversationSummaryDto = {
        //   id: payload.conversation.id,
        //   createdAt: payload.conversation.createdAt,
        //   encryptedConversationKey: payload.encryptedConversationKey,
        //   peer: {
        //     id: invitingUser.user.id,
        //     username: invitingUser.user.username,
        //     userProfile: invitingUser.user.profile,
        //   },
        // };

        // Call the callback to notify parent component (e.g., show toast)
        if (onConversationInvited) {
          onConversationInvited(invitingUser.user.username);
        }
      },
    );

    // Cleanup: unsubscribe from the event listener when component unmounts or dependencies change
    return () => {
      unsubscribe();
    };
  }, [onEvent, queryClient, onConversationInvited]);
};
