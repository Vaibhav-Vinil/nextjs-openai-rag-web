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

interface ChatProps {
  items: Item[];
  onSendMessage: (message: string) => void;
  onApprovalResponse: (approve: boolean, id: string) => void;
}

const Chat: React.FC<ChatProps> = ({
  items,
  onSendMessage,
  onApprovalResponse,
}) => {
  const itemsEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [inputMessageText, setinputMessageText] = useState<string>("");
  // This state is used to provide better user experience for non-English IMEs such as Japanese
  const [isComposing, setIsComposing] = useState(false);
  const { isAssistantLoading, isConversationLoading } = useConversationStore();
  const previousItemsLengthRef = useRef<number>(0);
  const isInitialMountRef = useRef<boolean>(true);

  const scrollToBottom = (smooth = false) => {
    if (itemsEndRef.current && scrollContainerRef.current) {
      itemsEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
    }
  };

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey && !isComposing) {
        event.preventDefault();
        onSendMessage(inputMessageText);
        setinputMessageText("");
      }
    },
    [onSendMessage, inputMessageText, isComposing]
  );

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
    <div className="flex justify-center items-stretch size-full h-full bg-white">
      <div className="flex grow flex-col h-full w-full max-w-3xl min-w-0">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 py-6 flex flex-col min-h-0 relative"
        >
          {isConversationLoading && <ConversationLoading />}
          <div className="flex-1 flex flex-col justify-end">
            <div className="space-y-5">
              {items.map((item, index) => (
                <React.Fragment key={index}>
                  {item.type === "tool_call" ? (
                    <ToolCall toolCall={item} />
                  ) : item.type === "message" ? (
                    <div className="flex flex-col gap-1">
                      <Message message={item} />
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
            <div className="flex w-full flex-col gap-1.5 rounded-[20px] p-2.5 pl-1.5 transition-colors bg-white shadow-md">
              <div className="flex items-end gap-1.5 md:gap-2 pl-4">
                <div className="flex min-w-0 flex-1 flex-col">
                  <textarea
                    id="prompt-textarea"
                    tabIndex={0}
                    dir="auto"
                    rows={2}
                    placeholder="Message..."
                    className="mb-2 resize-none border-0 focus:outline-none text-sm bg-transparent px-0 pb-6 pt-2"
                    value={inputMessageText}
                    onChange={(e) => setinputMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                  />
                </div>
                <button
                  disabled={!inputMessageText}
                  data-testid="send-button"
                  className="flex size-8 items-end justify-center rounded-full bg-black text-white transition-colors hover:opacity-70 focus-visible:outline-none focus-visible:outline-black disabled:bg-[#D7D7D7] disabled:text-[#f4f4f4] disabled:hover:opacity-100"
                  onClick={() => {
                    onSendMessage(inputMessageText);
                    setinputMessageText("");
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
    </div>
  );
};

export default Chat;
