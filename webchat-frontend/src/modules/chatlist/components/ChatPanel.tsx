import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion } from "motion/react";
import EmojiPicker from "emoji-picker-react";
import type { Chat, Message, MessagePayload } from "../../../types/chat";
import { MessageStatus } from "../../../types/chat";
import { EmptyChat } from "./EmptyChat";
import { LoadingSpinner } from "../../../components/LoadingSpinner";
import {
  Check,
  CheckCheck,
  CircleAlert,
  Loader2,
  Smile,
  Image,
} from "lucide-react";
import { useListVirtualizer } from "../../../hooks/useListVirtualizer.ts";
import ImageUploadExample from "../../../components/ImageUploadExample.tsx";
import type { ImageUploadExampleHandle } from "../../../components/ImageUploadExample.tsx";
import { getBlobUrlFromFile } from "../../../utils/image-enc.util.ts";
import { extractGifFromClipboard } from "../../../utils/preview-image.util.ts";
import { useSocket } from "../../../context/SocketContext";
import { TenorGifPicker } from "../../../components/TenorGifPicker.tsx";

import { AttachmentMessage } from "./AttachmentMessage.tsx";

interface ChatPanelProps {
  chat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  currentUserId?: string | null;
  onSendMessage: (
    content: string,
    payload: Partial<MessagePayload>,
  ) => Promise<void>;
  onLoadMoreMessages: () => Promise<unknown>;
  conversationMessageKey: () => string | null;
}

export const ChatPanel = ({
  chat,
  messages,
  isLoading,
  isLoadingMoreMessages,
  hasMoreMessages,
  currentUserId,
  onLoadMoreMessages,
  conversationMessageKey,
  onSendMessage,
}: ChatPanelProps) => {
  "use no memo";

  const { sendEvent, onEvent } = useSocket();
  const [messageContent, setMessageContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingGif, setIsExtractingGif] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const [uploadedImage, setUploadedImage] = useState<{
    url: string;
    fileName: string;
    file: File;
    authTag: string;
    iv: string;
    type: string;
    size: number;
  } | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const topLoadArmedRef = useRef(false);
  const pendingLoadMoreMetricsRef = useRef<{
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);
  const imageUploadRef = useRef<ImageUploadExampleHandle>(null);
  const renderedAt = new Date();

  const messagesVirtualizer = useListVirtualizer({
    count: messages.length,
    getScrollElement: () => messagesContainerRef.current,
    estimateSize: () => 88,
    overscan: 8,
    getItemKey: (index) => messages[index]?.id ?? index,
  });

  const virtualItems = messagesVirtualizer.getVirtualItems();
  const totalMessageSize = messagesVirtualizer.getTotalSize();

  const scrollToBottomIfNeeded = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (isNearBottomRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  };

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    setShowScrollButton(false);
  };

  useLayoutEffect(() => {
    scrollToBottomIfNeeded();
  }, [chat?.id, messages.length, totalMessageSize]);

  useLayoutEffect(() => {
    if (isLoadingMoreMessages) {
      return;
    }

    const pendingLoadMoreMetrics = pendingLoadMoreMetricsRef.current;
    if (!pendingLoadMoreMetrics) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) {
      pendingLoadMoreMetricsRef.current = null;
      return;
    }

    const heightDelta =
      container.scrollHeight - pendingLoadMoreMetrics.scrollHeight;
    if (heightDelta !== 0) {
      container.scrollTop = pendingLoadMoreMetrics.scrollTop + heightDelta;
    }

    pendingLoadMoreMetricsRef.current = null;
  }, [isLoadingMoreMessages, messages.length, totalMessageSize]);

  useEffect(() => {
    isNearBottomRef.current = true;
    topLoadArmedRef.current = false;
    pendingLoadMoreMetricsRef.current = null;
    // Clear typing state when chat changes
    setPeerIsTyping(false);
    setShowEmojiPicker(false);
  }, [chat?.id]);

  useEffect(() => {
    setShowScrollButton(false);
  }, [chat?.id]);

  // Handle typing indicators
  useEffect(() => {
    const unsubscribeTyping = onEvent("user_typing", (data: unknown) => {
      const typingData = data as { conversationId: string };
      if (typingData.conversationId === chat?.id) {
        setPeerIsTyping(true);
      }
    });

    const unsubscribeStopTyping = onEvent(
      "user_stop_typing",
      (data: unknown) => {
        const typingData = data as { conversationId: string };
        if (typingData.conversationId === chat?.id) {
          setPeerIsTyping(false);
        }
      },
    );

    // Cleanup when chat changes - clear peer typing
    return () => {
      setPeerIsTyping(false);
      unsubscribeTyping?.();
      unsubscribeStopTyping?.();
    };
  }, [chat?.id, onEvent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromTop = container.scrollTop;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    isNearBottomRef.current = distanceFromBottom < 120;

    // Show scroll button when user scrolls up (not near bottom)
    setShowScrollButton(distanceFromBottom > 300);

    if (distanceFromTop > 180) {
      topLoadArmedRef.current = false;
      return;
    }

    if (
      hasMoreMessages &&
      !isLoadingMoreMessages &&
      distanceFromTop < 120 &&
      !topLoadArmedRef.current
    ) {
      topLoadArmedRef.current = true;
      pendingLoadMoreMetricsRef.current = {
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      };
      void onLoadMoreMessages();
    }
  };

  const submitMessage = async () => {
    if (!messageContent.trim() && !uploadedImage) return;
    if (!chat || isSending || isLoading || isUploading) return;

    setIsSending(true);
    console.log("Submitting message:", {
      content: messageContent,
      uploadedImage,
    });
    try {
      let messagePayload: Partial<MessagePayload> = {};
      if (uploadedImage) {
        messagePayload = {
          ...messagePayload,
          mediaUrl: uploadedImage.url,
          fileName: uploadedImage.fileName,
          mimeType: uploadedImage.type,
          authTag: uploadedImage.authTag,
          iv: uploadedImage.iv,
          fileSize: uploadedImage.size,
        };
      }
      await onSendMessage(messageContent, messagePayload);
      setMessageContent("");
      setUploadedImage(null);
      setUploadProgress(0);
      setSendError(null);

      // Emit stop typing when message is sent
      setIsTyping(false);
      if (typingTimeoutRef.current !== null) {
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      try {
        sendEvent("user_stop_typing", { conversationId: chat.id });
      } catch {
        // Socket might not be ready, ignore
      }
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Failed to send message",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submitMessage();
  };

  if (!chat) {
    return <EmptyChat />;
  }

  const handleUploadProgress = (percentage: number) => {
    setUploadProgress(percentage);
    setIsUploading(percentage < 100);
  };

  const handleUploadSuccess = (
    file: File,
    imageData: {
      url: string;
      fileName: string;
      size: number;
      authTag: string;
      type: string;
      iv: string;
    },
  ) => {
    setUploadedImage({ ...imageData, file });
    setIsUploading(false);
    setUploadProgress(100);
    setTimeout(() => setUploadProgress(0), 1000);
  };

  const handleUploadError = (error: string) => {
    setSendError(error);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setUploadProgress(0);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;

    if (!clipboardData) return;

    const items = Array.from(clipboardData.items);

    const hasImageFile = items.some(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );

    const hasHtml = clipboardData.types.includes("text/html");
    if (!hasImageFile && !hasHtml) {
      return;
    }
    if (hasHtml && hasImageFile) {
      setIsExtractingGif(true);

      try {
        const gif = await extractGifFromClipboard(clipboardData);

        if (gif && imageUploadRef.current) {
          e.preventDefault();

          await imageUploadRef.current.handleUpload(gif);
          return;
        }
      } catch (error) {
        console.error("Error extracting GIF:", error);
      } finally {
        setIsExtractingGif(false);
      }
    }
    // Image file paste
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        e.preventDefault();

        const file = item.getAsFile();

        if (file && imageUploadRef.current) {
          try {
            await imageUploadRef.current.handleUpload(file);
          } catch (error) {
            console.error("Error uploading pasted image:", error);
          }
        }

        return;
      }
    }
  };

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    setMessageContent((prev) => prev + emojiData.emoji);
  };

  const handleGifSelected = async (gifFile: File) => {
    if (imageUploadRef.current) {
      try {
        await imageUploadRef.current.handleUpload(gifFile);
        // Keep the GIF picker open after selection
      } catch (error) {
        console.error("Error uploading GIF:", error);
        setSendError("Failed to upload GIF");
      }
    }
  };

  return (
    <ImageUploadExample
      ref={imageUploadRef}
      onUploadProgress={handleUploadProgress}
      onUploadSuccess={handleUploadSuccess}
      onUploadError={handleUploadError}
      encryptionKey={conversationMessageKey() || ""}
    >
      <div className="flex flex-col h-full bg-base relative">
        {/* GIF Extraction Loading Overlay */}
        {isExtractingGif && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50 rounded-lg pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="animate-spin text-accent-cyan" />
              <p className="text-sm text-white font-medium">
                Extracting GIF...
              </p>
            </div>
          </div>
        )}

        {/* Upload Loading Overlay */}
        {isUploading && !isExtractingGif && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50 rounded-lg pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="animate-spin text-accent-cyan" />
              <p className="text-sm text-white font-medium">
                Uploading image...
              </p>
            </div>
          </div>
        )}

        {/* Chat Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 md:px-6 py-4 border-b border-obsidian-500 border-opacity-30 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-accent-cyan via-accent-violet to-accent-rose bg-opacity-20 flex items-center justify-center shrink-0 relative">
              <span className="text-xs font-semibold text-accent-cyan">
                {chat.username?.charAt(0).toUpperCase()}
              </span>
              {chat.isOnline && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-semantic-success rounded-full border-2 border-base" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-primary truncate">
                {chat.username}
              </h2>
              <p className="text-xs text-text-secondary">
                {peerIsTyping ? (
                  <span className="text-accent-cyan animate-pulse">
                    typing...
                  </span>
                ) : chat.isOnline ? (
                  "Active now"
                ) : (
                  "Away"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="p-2 hover:bg-elevated rounded-lg transition-colors">
              <svg
                className="w-5 h-5 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
            <button className="p-2 hover:bg-elevated rounded-lg transition-colors">
              <svg
                className="w-5 h-5 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5A2.25 2.25 0 008.25 22.5h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25h-2.25m0 18h5m-5-4h5"
                />
              </svg>
            </button>
          </div>
        </motion.div>

        {/* Messages Container */}
        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="flex-1 overflow-y-auto px-4 md:px-6 py-4 smooth-scroll "
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center">
                <p className="text-sm text-text-secondary">
                  Start a conversation with {chat.username}
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              {isLoadingMoreMessages && (
                <div className="sticky top-0 z-10 mb-3 pointer-events-none">
                  <MessageHistorySkeleton />
                </div>
              )}
              <div
                className="relative w-full"
                style={{ height: `${totalMessageSize}px` }}
              >
                {virtualItems.map((virtualItem) => {
                  const message = messages[virtualItem.index];
                  if (!message) {
                    return null;
                  }

                  const previousMessage = messages[virtualItem.index - 1];
                  const shouldShowDateSeparator =
                    virtualItem.index === 0 ||
                    !isSameCalendarDay(
                      previousMessage?.timestamp,
                      message.timestamp,
                    );
                  const dateLabel = shouldShowDateSeparator
                    ? formatMessageDateLabel(message.timestamp, renderedAt)
                    : null;
                  const isCurrentUserMessage =
                    message.senderId === currentUserId;

                  return (
                    <div
                      key={virtualItem.key}
                      ref={messagesVirtualizer.measureElement}
                      data-index={virtualItem.index}
                      className="absolute left-0 top-0 w-full"
                      style={{
                        transform: `translateY(${virtualItem.start}px)`,
                        paddingBottom:
                          virtualItem.index === messages.length - 1 ? 0 : 12,
                      }}
                    >
                      <div className="flex flex-col">
                        {shouldShowDateSeparator && dateLabel && (
                          <MessageDateSeparator label={dateLabel} />
                        )}

                        <div
                          className={`flex ${
                            isCurrentUserMessage
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={` max-w-[75%]
                                  rounded-2xl
                                  px-4
                                  py-3
                                  shadow-sm
                                  wrap-break-word
                                  whitespace-pre-wrap
                                  border ${
                                    isCurrentUserMessage
                                      ? `
                                        bg-accent-cyan/20
                                        text-primary
                                        border border-accent-cyan/30
                                        rounded-br-none
                                      `
                                      : `
                                        bg-elevated
                                        text-primary
                                        border border-border
                                        rounded-bl-none
                                      `
                                  }
                                  
                                  `}
                          >
                            {message.imgUrl ? (
                              message.payload?.mimeType?.includes("image") ? (
                                <img
                                  src={message.imgUrl}
                                  alt="Message attachment"
                                  className="w-full rounded-lg mb-2 max-h-80 object-cover"
                                  onError={(e) => {
                                    // Fallback if blob URL expires
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                  }}
                                />
                              ) : (
                                <>
                                  {/* a file attachement with name and size and download link */}
                                  <AttachmentMessage
                                    className="rounded-lg mb-2 max-h-80"
                                    attachment={{
                                      ...message.payload,
                                      imgUrl: message.imgUrl || "",
                                    }}
                                  ></AttachmentMessage>
                                </>
                              )
                            ) : null}
                            {message.content && (
                              <p className="text-sm wrap-break-word">
                                {message.content}
                              </p>
                            )}
                            <div className="mt-1 flex items-center justify-between gap-3">
                              <p
                                className={`text-xs ${
                                  isCurrentUserMessage
                                    ? "text-accent-cyan text-opacity-70"
                                    : "text-text-muted"
                                }`}
                              >
                                {formatMessageTime(message.timestamp)}
                              </p>
                              {isCurrentUserMessage && (
                                <MessageStatusIndicator
                                  status={message.status}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={scrollToBottom}
            className="absolute bottom-32 right-2
             -translate-x-1/2 z-50 flex items-center justify-center
              w-10 h-10 rounded-full
             btn-primary
              text-base shadow-lg transition-colors"
            aria-label="Scroll to bottom"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </motion.button>
        )}

        {/* Message Input */}

        {/* Image Preview Section */}
        {uploadedImage && (
          <div className="px-4 md:px-6 py-3 border-b border-obsidian-500 border-opacity-30 bg-transparent">
            <div className="flex items-end gap-3">
              <div className="relative w-50 h-50 shrink-0">
                <img
                  src={getBlobUrlFromFile(uploadedImage.file)}
                  alt="Upload preview"
                  className="w-full h-full object-cover rounded-lg border border-border"
                />
                <button
                  onClick={handleRemoveImage}
                  disabled={isSending}
                  className="absolute -top-2 -right-2 bg-semantic-danger rounded-full w-6 h-6 flex items-center justify-center text-white bg-red-700 hover:bg-red-800 transition-colors disabled:opacity-50"
                >
                  X
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-secondary truncate">
                  {uploadedImage.fileName}
                </p>
                {isUploading && (
                  <div className="mt-1 w-full bg-obsidian-500/20 rounded-full h-1.5">
                    <div
                      className="bg-accent-cyan h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                {!isUploading && uploadProgress === 100 && (
                  <p className="text-xs text-semantic-success mt-1">
                    Upload complete
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress Bar (when no preview yet) */}
        {isUploading && !uploadedImage && (
          <div className="px-4 md:px-6 py-3 border-b border-obsidian-500 border-opacity-30">
            <div className="flex items-center gap-3">
              <Loader2
                size={16}
                className="animate-spin text-accent-cyan shrink-0"
              />
              <div className="flex-1">
                <div className="w-full bg-obsidian-500/20 rounded-full h-1.5">
                  <div
                    className="bg-accent-cyan h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-text-secondary whitespace-nowrap">
                {uploadProgress}%
              </span>
            </div>
          </div>
        )}

        {/* Upload Progress Bar (with preview) */}
        {isUploading && uploadedImage && (
          <div className="px-4 md:px-6 py-3 border-b border-obsidian-500 border-opacity-30 bg-obsidian-500/10">
            <div className="flex items-center gap-3">
              <Loader2
                size={16}
                className="animate-spin text-accent-cyan shrink-0"
              />
              <div className="flex-1">
                <p className="text-xs text-text-secondary mb-1.5">
                  Uploading image...
                </p>
                <div className="w-full bg-obsidian-500/20 rounded-full h-1.5">
                  <div
                    className="bg-accent-cyan h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-text-secondary whitespace-nowrap">
                {uploadProgress}%
              </span>
            </div>
          </div>
        )}

        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSendMessage}
          className="px-4 md:px-6 py-4 border-t border-obsidian-500 border-opacity-30 flex items-end gap-3"
        >
          <button
            type="button"
            disabled={isLoading}
            className="p-2.5 hover:bg-elevated rounded-lg transition-colors shrink-0"
          >
            <svg
              className="w-5 h-5 text-accent-cyan"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 hover:bg-elevated rounded-lg transition-colors shrink-0"
            aria-label="Open emoji picker"
          >
            <Smile className="w-5 h-5 text-accent-cyan" />
          </button>
          {/* 
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setShowGifPicker(!showGifPicker)}
            className="p-2.5 hover:bg-elevated rounded-lg transition-colors shrink-0"
            aria-label="Open GIF picker"
          >
            <Image className="w-5 h-5 text-accent-cyan" />
          </button> */}

          <div className="flex-1">
            <textarea
              value={messageContent}
              disabled={isLoading || isUploading || isExtractingGif}
              onChange={(e) => {
                const newContent = e.target.value;
                setMessageContent(newContent);
                if (sendError) {
                  setSendError(null);
                }

                // Handle typing indicator
                if (newContent.trim() && chat?.id) {
                  if (!isTyping) {
                    setIsTyping(true);
                  }

                  // Send typing event
                  try {
                    sendEvent("user_typing", { conversationId: chat.id });
                  } catch {
                    // Socket might not be ready, ignore
                  }

                  // Clear existing timeout
                  if (typingTimeoutRef.current !== null) {
                    window.clearTimeout(typingTimeoutRef.current);
                  }

                  // Set new timeout for stop typing
                  typingTimeoutRef.current = window.setTimeout(() => {
                    setIsTyping(false);
                    try {
                      sendEvent("user_stop_typing", {
                        conversationId: chat.id,
                      });
                    } catch {
                      // Socket might not be ready, ignore
                    }
                  }, 3000);
                } else if (!newContent.trim() && isTyping && chat?.id) {
                  // Clear typing if input is empty
                  setIsTyping(false);
                  if (typingTimeoutRef.current !== null) {
                    window.clearTimeout(typingTimeoutRef.current);
                  }
                  try {
                    sendEvent("user_stop_typing", { conversationId: chat.id });
                  } catch {
                    // Socket might not be ready, ignore
                  }
                }
              }}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submitMessage();
                }
              }}
              placeholder={
                isExtractingGif
                  ? "Extracting GIF..."
                  : isUploading
                    ? "Uploading image..."
                    : "Type a message..."
              }
              className="w-full chat-input pl-4 pr-4 py-2.5 text-sm resize-none max-h-32 disabled:opacity-60 disabled:cursor-not-allowed"
              rows={1}
            />
          </div>

          <button
            type="submit"
            disabled={
              (!messageContent.trim() && !uploadedImage) ||
              isSending ||
              isLoading ||
              isUploading
            }
            className="p-2.5 hover:bg-elevated rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <svg
                className="w-5 h-5 text-accent-cyan animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-accent-cyan"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.951-1.488 5.951 1.488a1 1 0 001.169-1.409l-7-14z" />
              </svg>
            )}
          </button>
        </motion.form>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-2 md:px-4 py-2 border-t border-obsidian-500 border-opacity-30 bg-elevated"
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme={"dark" as any}
              width="100%"
              height={350}
              previewConfig={{ showPreview: false }}
              searchPlaceHolder="Search emoji..."
              skinTonesDisabled={true}
            />
          </motion.div>
        )}

        {/* GIF Picker */}
        {showGifPicker && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <TenorGifPicker
              onGifSelected={handleGifSelected}
              isLoading={isUploading || isExtractingGif}
            />
          </motion.div>
        )}

        {sendError && (
          <div className="px-4 md:px-6 pb-3 text-xs text-semantic-danger">
            {sendError}
          </div>
        )}
      </div>
    </ImageUploadExample>
  );
};

const formatMessageTime = (date: Date): string => {
  if (!isValidDate(date)) {
    return "--:--";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMessageDateLabel = (
  date: Date,
  referenceDate: Date = new Date(),
): string => {
  if (!isValidDate(date)) {
    return "Unknown date";
  }

  if (isSameCalendarDay(date, referenceDate)) {
    return "Today";
  }

  if (isYesterday(date, referenceDate)) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== referenceDate.getFullYear()
        ? "numeric"
        : undefined,
  });
};

const isValidDate = (date: Date | undefined): date is Date => {
  return date != null && !Number.isNaN(date.getTime());
};

const getCalendarDayKey = (date: Date | undefined): string => {
  if (!isValidDate(date)) {
    return "invalid";
  }

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const isSameCalendarDay = (
  leftDate: Date | undefined,
  rightDate: Date | undefined,
): boolean => {
  return getCalendarDayKey(leftDate) === getCalendarDayKey(rightDate);
};

const isYesterday = (date: Date, referenceDate: Date): boolean => {
  if (!isValidDate(date) || !isValidDate(referenceDate)) {
    return false;
  }

  const startOfReferenceDay = new Date(referenceDate);
  startOfReferenceDay.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfReferenceDay);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  return isSameCalendarDay(date, startOfYesterday);
};

const MessageDateSeparator = ({ label }: { label: string }) => {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="h-px flex-1 bg-border/60" />
      <span className="shrink-0 rounded-full border border-border/60 bg-elevated px-3 py-1 text-[11px] font-medium text-text-secondary shadow-sm">
        {label}
      </span>
      <span className="h-px flex-1 bg-border/60" />
    </div>
  );
};

const MessageHistorySkeleton = () => {
  return (
    <div className="space-y-3">
      {["start", "end", "start"].map((alignment, index) => (
        <div
          key={`${alignment}-${index}`}
          className={`flex ${alignment === "end" ? "justify-end" : "justify-start"}`}
        >
          <div className="w-full max-w-xs md:max-w-md rounded-lg bg-elevated border border-obsidian-500 border-opacity-40 px-4 py-3 animate-pulse">
            <div className="h-3 w-3/5 rounded-full bg-obsidian-500 bg-opacity-40" />
            <div className="mt-3 h-3 w-2/5 rounded-full bg-obsidian-500 bg-opacity-30" />
          </div>
        </div>
      ))}
    </div>
  );
};

const MessageStatusIndicator = ({ status }: { status?: MessageStatus }) => {
  if (
    !status ||
    status === MessageStatus.PENDING ||
    status === MessageStatus.QUEUED
  ) {
    return (
      <Loader2
        size={16}
        className="shrink-0 animate-spin text-accent-cyan"
        aria-label="Message is queued"
      />
    );
  }

  if (status === MessageStatus.DELIVERED) {
    return (
      <Check
        size={16}
        className="shrink-0 text-text-secondary"
        aria-label="Message delivered"
      />
    );
  }

  if (status === MessageStatus.SEEN) {
    return (
      <CheckCheck
        size={16}
        className="shrink-0 text-accent-cyan"
        aria-label="Message seen"
      />
    );
  }

  if (status === MessageStatus.FAILED) {
    return (
      <CircleAlert
        size={16}
        className="shrink-0 text-semantic-danger"
        aria-label="Message failed"
      />
    );
  }

  return null;
};
