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

    // 0. Check if vector store exists
    try {
      await openai.vectorStores.retrieve(vectorStoreId);
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`Vector store ${vectorStoreId} not found, cleaning up local references only`);
        // Continue to clean up local references even if store doesn't exist
      } else {
        throw error; // Re-throw other errors
      }
    }

    // 1. Try to get all files in the vector store
    try {
      const files = await openai.vectorStores.files.list(vectorStoreId);
      
      // 2. Delete each file from the vector store and from OpenAI storage
      for (const file of files.data) {
        try {
          // Try to delete from vector store if it still exists
          try {
            await openai.vectorStores.files.del(vectorStoreId, file.id);
          } catch (e) {
            console.warn(`Failed to remove file ${file.id} from vector store (may already be deleted):`, e);
          }
          
          // Delete the actual file
          try {
            await openai.files.del(file.id);
          } catch (e) {
            console.warn(`Failed to delete file ${file.id} (may already be deleted):`, e);
          }
        } catch (error) {
          console.error(`Error processing file ${file.id}:`, error);
          // Continue with next file even if one fails
        }
      }
    } catch (error) {
      console.warn('Error listing vector store files, proceeding with cleanup:', error);
    }

    // 3. Try to delete the vector store if it still exists
    try {
      await openai.vectorStores.del(vectorStoreId);
      console.log(`Successfully deleted vector store ${vectorStoreId}`);
    } catch (error: any) {
      if (error.status !== 404) { // Ignore 404 errors (already deleted)
        console.error('Error deleting vector store:', error);
        throw error;
      }
    }

    // 4. Always clean up our database references
    const supabase = await createClient();
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq("store_id", vectorStoreId);
      
      if (error) throw error;
      
      return NextResponse.json({ 
        success: true,
        message: 'Cleanup completed successfully' 
      });
    } catch (error) {
      console.error('Error cleaning up database references:', error);
      // Even if database cleanup fails, we can still return success
      // since the main cleanup operations are complete
      return NextResponse.json({ 
        success: true,
        warning: 'Cleanup completed with some non-critical errors',
        details: 'Some references might not have been fully cleaned up'
      });
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: "Failed to clean up vector store",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
