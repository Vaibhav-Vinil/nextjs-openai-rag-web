import { Item } from "@/lib/assistant";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationData {
  conversation_items: any[];
  chat_messages: Item[];
}

// Save conversation to Supabase
export async function saveConversation(
  conversationItems: any[],
  chatMessages: Item[],
  conversationId: string | null = null
): Promise<string | null> {
  try {
    const url = conversationId
      ? `/api/conversations/${conversationId}`
      : "/api/conversations";

    const method = conversationId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_items: conversationItems,
        chat_messages: chatMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Error saving conversation:", error);
      return null;
    }

    const data = await response.json();
    return data.conversation?.id || conversationId;
  } catch (error) {
    console.error("Error saving conversation:", error);
    return null;
  }
}

// Load conversation from Supabase
export async function loadConversation(
  conversationId: string
): Promise<ConversationData | null> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}`);

    if (!response.ok) {
      const error = await response.json();
      console.error("Error loading conversation:", error);
      return null;
    }

    const data = await response.json();
    return {
      conversation_items: data.conversation.conversation_items,
      chat_messages: data.conversation.chat_messages,
    };
  } catch (error) {
    console.error("Error loading conversation:", error);
    return null;
  }
}

// List all conversations
export async function listConversations(): Promise<Conversation[]> {
  try {
    const response = await fetch("/api/conversations");

    if (!response.ok) {
      const error = await response.json();
      console.error("Error listing conversations:", error);
      return [];
    }

    const data = await response.json();
    return data.conversations || [];
  } catch (error) {
    console.error("Error listing conversations:", error);
    return [];
  }
}

// List all conversations for a specific user (admin view)
export async function listUserConversationsForAdmin(
  userId: string
): Promise<Conversation[]> {
  try {
    const response = await fetch(`/admin/api/users/${userId}/conversations`);

    if (!response.ok) {
      const error = await response.json();
      console.error("Error listing user conversations for admin:", error);
      return [];
    }

    const data = await response.json();
    return data.conversations || [];
  } catch (error) {
    console.error("Error listing user conversations for admin:", error);
    return [];
  }
}

// Delete conversation
export async function deleteConversation(
  conversationId: string
): Promise<boolean> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Error deleting conversation:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return false;
  }
}

