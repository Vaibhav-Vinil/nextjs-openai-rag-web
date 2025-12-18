import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    const { vectorStoreId, fileId } = await request.json();
    
    if (!vectorStoreId || !fileId) {
      return new Response(
        JSON.stringify({ 
          error: "vectorStoreId and fileId are required" 
        }), 
        { status: 400 }
      );
    }

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

    const result = await openai.vectorStores.files.create(
      vectorStoreId,
      { file_id: fileId }
    );

    return new Response(JSON.stringify(result), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error("Error adding file to vector store:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to add file to vector store",
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
