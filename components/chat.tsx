"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ToolCall from "./tool-call";
import Message from "./message";
import Annotations, { Annotation } from "./annotations";
import McpToolsList from "./mcp-tools-list";
import McpApproval from "./mcp-approval";
import { Item, McpApprovalRequestItem } from "@/lib/assistant";
import LoadingMessage from "./loading-message";
import ConversationLoading from "./conversation-loading";
import useConversationStore from "@/stores/useConversationStore";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface ChatProps {
  items: Item[];
  onSendMessage: (message: string) => void;
  onApprovalResponse: (approve: boolean, id: string) => void;
  readOnly?: boolean;
}

const Chat: React.FC<ChatProps> = ({
  items,
  onSendMessage,
  onApprovalResponse,
  readOnly = false,
}) => {
  const itemsEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemKeyMapRef = useRef(new WeakMap<Item, string>());
  const [inputMessageText, setinputMessageText] = useState<string>("");
  // This state is used to provide better user experience for non-English IMEs such as Japanese
  const [isComposing, setIsComposing] = useState(false);
  const { isAssistantLoading, isConversationLoading } = useConversationStore();
  const previousItemsLengthRef = useRef<number>(0);
  const isInitialMountRef = useRef<boolean>(true);
  const hasUserSentMessage = items.some(item => item.type === "message" && item.role === "user");

  const scrollToBottom = (smooth = false) => {
    if (itemsEndRef.current && scrollContainerRef.current) {
      itemsEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
    }
  };

  const router = useRouter();
  const supabase = createClient();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const sendMessage = useCallback(async () => {
    // In read-only mode, never send messages
    if (readOnly) return;

    if (!inputMessageText.trim()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Show login prompt for anonymous users viewing a shared conversation
        setShowLoginPrompt(true);
        return;
      }
      onSendMessage(inputMessageText);
      setinputMessageText("");
    } catch (err) {
      console.error("Error checking auth before send:", err);
      setShowLoginPrompt(true);
    }
  }, [inputMessageText, onSendMessage, supabase, readOnly]);

  const getItemKey = useCallback(
    (item: Item, index: number) => {
      const existingId = (item as any).id;
      if (typeof existingId === "string" && existingId.length > 0) {
        return existingId;
      }
      const map = itemKeyMapRef.current;
      if (!map.has(item)) {
        map.set(
          item,
          `item-${index}-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`
        );
      }
      return map.get(item)!;
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!readOnly && event.key === "Enter" && !event.shiftKey && !isComposing) {
        event.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage, isComposing]
  );

  // Handle scroll events for fade effect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 10);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Only auto-scroll if new items were added (not on initial mount or when loading old conversation)
  useEffect(() => {
    // Skip scroll on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousItemsLengthRef.current = items.length;
      return;
    }

    // Only scroll if items increased (new message added)
    if (items.length > previousItemsLengthRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    }
    
    previousItemsLengthRef.current = items.length;
  }, [items.length]);

  return (
    <div className="flex justify-center items-stretch size-full h-full bg-transparent">
      <div className="flex grow flex-col h-full w-full max-w-3xl min-w-0">
        <div
          ref={scrollContainerRef}
          className={`flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 ${hasUserSentMessage ? 'pt-2' : 'pt-6'} pb-6 flex flex-col min-h-0 relative`}
          style={{
            maskImage: isScrolled 
              ? 'linear-gradient(to bottom, transparent 0%, black 2rem, black 100%)' 
              : 'none',
            WebkitMaskImage: isScrolled 
              ? 'linear-gradient(to bottom, transparent 0%, black 2rem, black 100%)' 
              : 'none',
          }}
        >
          {isConversationLoading && <ConversationLoading />}
          <div className="flex-1 flex flex-col justify-end">
            {/* Initial centered logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {!hasUserSentMessage && !isAssistantLoading && !isConversationLoading && (
                <div className="w-full flex justify-center">
                  <Image 
                    src="/PvChatbot-logo.png" 
                    alt="PV Chatbot Logo" 
                    width={250}
                    height={200}
                    className="opacity-62 object-contain"
                  />
                </div>
              )}
            </div>
            <div className="space-y-5">
              {items.map((item, index) => (
                <React.Fragment key={getItemKey(item, index)}>
                  {item.type === "tool_call" ? (
                    <ToolCall toolCall={item} />
                  ) : item.type === "message" ? (
                    <div className="flex flex-col gap-1">
                      <Message message={item} messageIndex={index} />
                      {item.content &&
                        item.content[0].annotations &&
                        item.content[0].annotations.length > 0 && (
                          <Annotations
                            annotations={item.content[0].annotations.filter(
                              (annotation: Annotation) => annotation.type !== "url_citation"
                            )}
                          />
                        )}
                    </div>
                  ) : item.type === "mcp_list_tools" ? (
                    <McpToolsList item={item} />
                  ) : item.type === "mcp_approval_request" ? (
                    <McpApproval
                      item={item as McpApprovalRequestItem}
                      onRespond={onApprovalResponse}
                    />
                  ) : null}
                </React.Fragment>
              ))}
              {isAssistantLoading && <LoadingMessage />}
              <div ref={itemsEndRef} />
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 md:px-10 pb-6">
          <div className="flex w-full items-center">
            <div className="flex w-full flex-col gap-1.5 rounded-[20px] p-2.5 pl-1.5 transition-all bg-white/20 backdrop-blur-lg border border-white/30 shadow-lg">
              <div className="flex items-end gap-1.5 md:gap-2 pl-4">
                <div className="flex min-w-0 flex-1 flex-col">
                  <textarea
                    id="prompt-textarea"
                    tabIndex={0}
                    dir="auto"
                    rows={2}
                    placeholder={readOnly ? "Read-only admin view – chatting is disabled" : "Message..."}
                    className="mb-2 resize-none border-0 focus:outline-none text-sm bg-transparent px-0 pb-6 pt-2"
                    value={inputMessageText}
                    onChange={(e) => setinputMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                </div>
                <button
                  disabled={!inputMessageText || readOnly}
                  data-testid="send-button"
                  className="flex size-8 items-end justify-center rounded-full bg-black text-white transition-colors hover:opacity-70 focus-visible:outline-none focus-visible:outline-black disabled:bg-[#D7D7D7] disabled:text-[#f4f4f4] disabled:hover:opacity-100"
                  onClick={() => {
                    void sendMessage();
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    fill="none"
                    viewBox="0 0 32 32"
                    className="icon-2xl"
                  >
                    <path
                      fill="currentColor"
                      fillRule="evenodd"
                      d="M15.192 8.906a1.143 1.143 0 0 1 1.616 0l5.143 5.143a1.143 1.143 0 0 1-1.616 1.616l-3.192-3.192v9.813a1.143 1.143 0 0 1-2.286 0v-9.813l-3.192 3.192a1.143 1.143 0 1 1-1.616-1.616z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLoginPrompt(false)} />
          <div className="relative bg-white rounded-lg p-6 shadow-lg w-full max-w-sm">
            <h3 className="text-lg font-medium mb-2">Sign in to continue</h3>
            <p className="text-sm text-gray-600 mb-4">You must be signed in to continue the conversation. Please sign in to send messages.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="px-3 py-1 rounded bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => router.push('/login')}
                className="px-3 py-1 rounded bg-black text-white hover:opacity-90"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
