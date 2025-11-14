import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: List all conversations for the current user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversations: data || [] });
  } catch (error) {
    console.error("Error in GET handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new conversation
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, conversation_items, chat_messages } = body;

    if (!conversation_items || !chat_messages) {
      return NextResponse.json(
        { error: "conversation_items and chat_messages are required" },
        { status: 400 }
      );
    }

    // Generate title from first user message if not provided
    let conversationTitle = title;
    if (!conversationTitle && chat_messages.length > 0) {
      const firstUserMessage = chat_messages.find(
        (msg: any) => msg.type === "message" && msg.role === "user"
      );
      if (firstUserMessage) {
        const textContent = firstUserMessage.content?.find(
          (c: any) => c.type === "input_text" || c.type === "output_text"
        );
        conversationTitle = textContent?.text?.slice(0, 50) || "New Conversation";
      }
    }

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title: conversationTitle || "New Conversation",
        conversation_items: conversation_items,
        chat_messages: chat_messages,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversation: data });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

