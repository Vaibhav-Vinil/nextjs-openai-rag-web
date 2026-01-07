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
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        // Try to parse the error response as JSON
        const errorData = await response.json();
        console.error("Error saving conversation:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: url
        });
        errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
      } catch {
        // If JSON parsing fails, get the text response
        const text = await response.text();
        console.error("Error saving conversation (non-JSON response):", {
          status: response.status,
          statusText: response.statusText,
          responseText: text,
          url: url
        });
        errorMessage = text || response.statusText;
      }
      console.error("Error saving conversation:", errorMessage);
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
  conversationId: string,
  isAdminView: boolean = false
): Promise<ConversationData | null> {
  try {
    const url = isAdminView
      ? `/admin/api/conversations/view/${conversationId}`
      : `/api/conversations/${conversationId}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("Error loading conversation:", error);
      return null;
    }

    const data = await response.json();

    // Handle both regular and admin API response formats
    const conversation = data.conversation || data;

    if (!conversation) {
      console.error("No conversation data found in response:", data);
      return null;
    }

    return {
      conversation_items: conversation.conversation_items || [],
      chat_messages: conversation.chat_messages || [],
    };
  } catch (error) {
    console.error("Error loading conversation:", error);
    return null;
  }
}

// List all conversations
export async function listConversations(
  limit: number = 20,
  offset: number = 0,
  query: string = ""
): Promise<Conversation[]> {
  try {
    const url = new URL("/api/conversations", window.location.origin);
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());
    if (query) url.searchParams.set("q", query);

    const response = await fetch(url.toString());

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
  userId: string,
  limit: number = 20,
  offset: number = 0,
  query: string = ""
): Promise<Conversation[]> {
  try {
    const url = new URL(`/admin/api/users/${userId}/conversations`, window.location.origin);
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());
    if (query) url.searchParams.set("q", query);

    const response = await fetch(url.toString());

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

