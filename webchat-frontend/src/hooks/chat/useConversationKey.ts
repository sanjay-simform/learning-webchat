import { useEffect, useState } from "react";
import type { ConversationSummaryDto } from "../../api-client/services/conversation/conversation.service.dto";
import { decryptConversationKey } from "../../utils/crypto-utils";

const conversationKeyCache = new Map<string, string>();

interface UseConversationKeyResult {
  conversationKey: string | null;
  isDecrypting: boolean;
}

export function useConversationKey(
  conversation: ConversationSummaryDto | null,
  rsaPrivateKey: string | null | undefined,
): UseConversationKeyResult {
  const [conversationKey, setConversationKey] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    if (!conversation) {
      setConversationKey(null);
      setIsDecrypting(false);
      return;
    }

    const cachedKey = conversationKeyCache.get(conversation.id);
    if (cachedKey) {
      setConversationKey(cachedKey);
      setIsDecrypting(false);
      return;
    }

    if (!rsaPrivateKey) {
      setConversationKey(null);
      setIsDecrypting(false);
      return;
    }

    let cancelled = false;
    setIsDecrypting(true);

    void (async () => {
      try {
        const nextConversationKey = await decryptConversationKey(
          conversation.encryptedConversationKey,
          rsaPrivateKey,
        );

        if (!cancelled) {
          conversationKeyCache.set(conversation.id, nextConversationKey);
          setConversationKey(nextConversationKey);
        }
      } catch {
        if (!cancelled) {
          setConversationKey(null);
        }
      } finally {
        if (!cancelled) {
          setIsDecrypting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversation, rsaPrivateKey]);

  return {
    conversationKey,
    isDecrypting,
  };
}
