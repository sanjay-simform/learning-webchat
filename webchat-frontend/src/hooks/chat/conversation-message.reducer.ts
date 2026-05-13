import type { Message } from "../../types/chat";

export type ConversationMessagePatch = {
  clientMsgId?: string;
  messageId?: string;
  updates: Partial<Message>;
};

export type ConversationMessageAction =
  | { type: "reset" }
  | { type: "hydrate"; messages: Message[] }
  | { type: "upsert"; message: Message }
  | { type: "patch"; patch: ConversationMessagePatch };

function messageMatchesPatch(
  message: Message,
  patch: ConversationMessagePatch,
): boolean {
  if (patch.clientMsgId && message.clientMsgId === patch.clientMsgId) {
    return true;
  }

  if (patch.messageId && message.id === patch.messageId) {
    return true;
  }

  return false;
}

function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort((left, right) => {
    const leftTime = new Date(left.timestamp).getTime();
    const rightTime = new Date(right.timestamp).getTime();

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.id.localeCompare(right.id);
  });
}

function upsertMessage(messages: Message[], nextMessage: Message): Message[] {
  const index = messages.findIndex((message) => {
    if (message.id === nextMessage.id) {
      return true;
    }

    if (
      nextMessage.clientMsgId &&
      message.clientMsgId === nextMessage.clientMsgId
    ) {
      return true;
    }

    if (message.clientMsgId && message.clientMsgId === nextMessage.id) {
      return true;
    }

    return false;
  });

  if (index === -1) {
    return sortMessages([...messages, nextMessage]);
  }

  const updatedMessages = [...messages];
  updatedMessages[index] = {
    ...updatedMessages[index],
    ...nextMessage,
  };

  return sortMessages(updatedMessages);
}

function patchMessage(
  messages: Message[],
  patch: ConversationMessagePatch,
): Message[] {
  const index = messages.findIndex((message) =>
    messageMatchesPatch(message, patch),
  );

  if (index === -1) {
    return messages;
  }

  const updatedMessages = [...messages];
  updatedMessages[index] = {
    ...updatedMessages[index],
    ...patch.updates,
  };

  return sortMessages(updatedMessages);
}

export function conversationMessagesReducer(
  state: Message[],
  action: ConversationMessageAction,
): Message[] {
  switch (action.type) {
    case "reset":
      return [];
    case "hydrate":
      return action.messages.reduce(upsertMessage, state);
    case "upsert":
      return upsertMessage(state, action.message);
    case "patch":
      return patchMessage(state, action.patch);
    default:
      return state;
  }
}

export function createQueuedPatch(
  clientMsgId: string,
): ConversationMessagePatch {
  return {
    clientMsgId,
    updates: {
      status: "queued",
    },
  };
}

export function createDeliveryPatch(params: {
  clientMsgId?: string | null;
  messageId: string;
  status: "delivered" | "stored";
}): ConversationMessagePatch {
  return {
    clientMsgId: params.clientMsgId ?? undefined,
    messageId: params.messageId,
    updates: {
      id: params.messageId,
      status: params.status,
    },
  };
}

export function createFailedPatch(
  clientMsgId: string,
): ConversationMessagePatch {
  return {
    clientMsgId,
    updates: {
      status: "failed",
    },
  };
}
