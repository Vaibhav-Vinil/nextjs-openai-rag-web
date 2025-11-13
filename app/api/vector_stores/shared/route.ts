import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TABLE_NAME = "vector_store_config";
const SHARED_KEY = "shared";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("store_id, store_name, updated_at")
      .eq("key", SHARED_KEY)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching shared vector store:", error);
      return NextResponse.json(
        { error: "Failed to fetch shared vector store" },
        { status: 500 }
      );
    }

    return NextResponse.json({ store: data ?? null });
  } catch (error) {
    console.error("Unexpected error fetching shared vector store:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared vector store" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const storeId = payload.store_id;
    const storeName = payload.store_name ?? "";

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json(
        { error: "store_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(
        [
          {
            key: SHARED_KEY,
            store_id: storeId,
            store_name: storeName,
          },
        ],
        { onConflict: "key" }
      );

    if (error) {
      console.error("Error saving shared vector store:", error);
      return NextResponse.json(
        { error: "Failed to save shared vector store" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error saving shared vector store:", error);
    return NextResponse.json(
      { error: "Failed to save shared vector store" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("key", SHARED_KEY);

    if (error) {
      console.error("Error clearing shared vector store:", error);
      return NextResponse.json(
        { error: "Failed to clear shared vector store" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error clearing shared vector store:", error);
    return NextResponse.json(
      { error: "Failed to clear shared vector store" },
      { status: 500 }
    );
  }
}

