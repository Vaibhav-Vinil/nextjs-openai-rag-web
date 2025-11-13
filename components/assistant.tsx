"use client";
import React, { useEffect, useRef } from "react";
import Chat from "./chat";
import useConversationStore from "@/stores/useConversationStore";
import { Item, processMessages } from "@/lib/assistant";
import { saveConversation } from "@/lib/conversations";

export default function Assistant() {
  const { 
    chatMessages, 
    conversationItems,
    currentConversationId,
    addConversationItem, 
    addChatMessage, 
    setAssistantLoading,
    setCurrentConversationId 
  } = useConversationStore();

  // Debounce save function
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const autoSaveConversation = async () => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 2 seconds after last change
    saveTimeoutRef.current = setTimeout(async () => {
      // Don't save if conversation is empty (only has initial message)
      if (conversationItems.length === 0) {
        return;
      }

      const savedId = await saveConversation(
        conversationItems,
        chatMessages,
        currentConversationId || null
      );

      if (savedId && savedId !== currentConversationId) {
        setCurrentConversationId(savedId);
      }
    }, 2000);
  };

  // Auto-save when conversation changes
  useEffect(() => {
    if (conversationItems.length > 0) {
      autoSaveConversation();
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationItems.length, chatMessages.length]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userItem: Item = {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: message.trim() }],
    };
    const userMessage: any = {
      role: "user",
      content: message.trim(),
    };

    try {
      setAssistantLoading(true);
      addConversationItem(userMessage);
      addChatMessage(userItem);
      await processMessages();
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  const handleApprovalResponse = async (
    approve: boolean,
    id: string
  ) => {
    const approvalItem = {
      type: "mcp_approval_response",
      approve,
      approval_request_id: id,
    } as any;
    try {
      addConversationItem(approvalItem);
      await processMessages();
    } catch (error) {
      console.error("Error sending approval response:", error);
    }
  };

  return (
    <div className="h-full p-4 w-full bg-white">
      <Chat
        items={chatMessages}
        onSendMessage={handleSendMessage}
        onApprovalResponse={handleApprovalResponse}
      />
    </div>
  );
}
