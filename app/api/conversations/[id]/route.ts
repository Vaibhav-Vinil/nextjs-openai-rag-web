import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { conversationUpdateSchema, validateRequestBody, uuidSchema } from "@/lib/validation/schemas";
import { applyRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter";

// GET: Get a specific conversation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMIT_CONFIGS.standard, user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { id } = await params;

    // Validate ID format
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: "Invalid conversation ID format" },
        { status: 400 }
      );
    }

    // First check if user is admin
    const { data: adminData } = await supabase.rpc('is_admin');
    const isAdmin = adminData || false;

    let data, error;

    if (isAdmin) {
      // Use the admin function that bypasses RLS
      const result = await supabase
        .rpc('get_conversation_for_admin', { p_conversation_id: id });
      data = result.data;
      error = result.error;
    } else {
      // Regular user access with RLS
      const result = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching conversation:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversation: data });
  } catch (error) {
    console.error("Error in GET handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update a conversation
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMIT_CONFIGS.standard, user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { id } = await params;

    // Validate ID format
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: "Invalid conversation ID format" },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = await validateRequestBody(request, conversationUpdateSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { title, conversation_items, chat_messages, is_shared } = validation.data;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (conversation_items !== undefined) updateData.conversation_items = conversation_items;
    if (chat_messages !== undefined) updateData.chat_messages = chat_messages;
    if (is_shared !== undefined) updateData.is_shared = is_shared;

    const { data, error } = await supabase
      .from("conversations")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
      console.error("Error updating conversation:", error);
      return NextResponse.json(
        { error: "Failed to update conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversation: data });
  } catch (error) {
    console.error("Error in PUT handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a conversation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    // Apply rate limiting
    const rateLimitResponse = applyRateLimit(request, RATE_LIMIT_CONFIGS.standard, user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { id } = await params;

    // Validate ID format
    const idValidation = uuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: "Invalid conversation ID format" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting conversation:", error);
      return NextResponse.json(
        { error: "Failed to delete conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE handler:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
