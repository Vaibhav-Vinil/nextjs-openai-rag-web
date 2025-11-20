import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Mark conversation as publicly shareable
    const { data, error } = await supabase
      .from("conversations")
      .update({ is_publicly_shareable: true })
      .eq("id", id)
      .eq("user_id", user.id) // Ensure user owns the conversation
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Conversation not found or not owned by user" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: data
    });

  } catch (error) {
    console.error("Error marking conversation as shareable:", error);
    return NextResponse.json(
      { error: "Failed to mark conversation as shareable" },
      { status: 500 }
    );
  }
}
