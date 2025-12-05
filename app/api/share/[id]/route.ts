import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Create Supabase client without authentication requirement
    const supabase = await createClient();
    
    // Fetch conversation publicly
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      conversation: {
        conversation_items: data.conversation_items,
        chat_messages: data.chat_messages,
        title: data.title,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    });

  } catch (error) {
    console.error("Error loading shared conversation:", error);
    return NextResponse.json(
      { error: "Failed to load conversation" },
      { status: 500 }
    );
  }
}
