import OpenAI from "openai";

const openai = new OpenAI();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vectorStoreId = searchParams.get("vector_store_id");

  if (!vectorStoreId) {
    return new Response(
      JSON.stringify({ error: "vector_store_id is required" }),
      { status: 400 }
    );
  }

  try {
    // First verify the vector store exists
    try {
      await openai.vectorStores.retrieve(vectorStoreId);
    } catch (error: any) {
      if (error.status === 404) {
        return new Response(
          JSON.stringify({ 
            error: "Vector store not found",
            code: "vector_store_not_found",
            vector_store_id: vectorStoreId
          }),
          { status: 404 }
        );
      }
      throw error;
    }

    const files = await openai.vectorStores.files.list(vectorStoreId);
    return new Response(JSON.stringify(files), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error("Error fetching files:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to fetch files",
        code: error.code,
        status: error.status || 500
      }),
      { 
        status: error.status || 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
