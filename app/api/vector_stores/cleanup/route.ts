import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI();
const TABLE_NAME = "vector_store_config";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vectorStoreId = searchParams.get("vector_store_id");

    if (!vectorStoreId) {
      return NextResponse.json(
        { error: "vector_store_id is required" },
        { status: 400 }
      );
    }

    // 1. Get all files in the vector store
    const files = await openai.vectorStores.files.list(vectorStoreId);
    
    // 2. Delete each file from the vector store and from OpenAI storage
    for (const file of files.data) {
      try {
        // Delete from vector store
        await openai.vectorStores.files.del(vectorStoreId, file.id);
        
        // Delete the actual file
        await openai.files.del(file.id);
      } catch (error) {
        console.error(`Error deleting file ${file.id}:`, error);
        // Continue with next file even if one fails
      }
    }

    // 3. Delete the vector store
    await openai.vectorStores.del(vectorStoreId);

    // 4. Remove from our database
    const supabase = await createClient();
    await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("store_id", vectorStoreId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error during cleanup:", error);
    return NextResponse.json(
      { error: "Failed to clean up vector store" },
      { status: 500 }
    );
  }
}
