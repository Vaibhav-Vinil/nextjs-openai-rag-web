import OpenAI from "openai";

const openai = new OpenAI({
  maxRetries: 3,
  timeout: 30000, // 30 seconds
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function uploadWithRetry(fileObject: any, attempt = 1): Promise<any> {
  try {
    console.log(`Upload attempt ${attempt} for file: ${fileObject.name} (${Math.round(fileObject.content.length / 1024)} KB)`);
    
    const fileBuffer = Buffer.from(fileObject.content, "base64");
    const fileBlob = new Blob([fileBuffer], {
      type: "application/octet-stream",
    });

    const file = await openai.files.create({
      file: new File([fileBlob], fileObject.name),
      purpose: "assistants",
    });

    console.log(`Successfully uploaded file: ${file.id} (${file.filename})`);
    return file;
  } catch (error: any) {
    console.error(`Attempt ${attempt} failed:`, error.message);
    
    if (attempt >= MAX_RETRIES) {
      throw error;
    }

    // Exponential backoff
    const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
    console.log(`Retrying in ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return uploadWithRetry(fileObject, attempt + 1);
  }
}

export async function POST(request: Request) {
  try {
    const { fileObject } = await request.json();
    
    if (!fileObject || !fileObject.content || !fileObject.name) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid file object",
          details: "File object must contain 'content' and 'name' properties"
        }), 
        { status: 400 }
      );
    }

    console.log(`Starting file upload: ${fileObject.name}`);
    const file = await uploadWithRetry(fileObject);
    
    return new Response(JSON.stringify(file), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error("File upload failed:", {
      error: error.message,
      code: error.code,
      status: error.status,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    return new Response(
      JSON.stringify({ 
        error: "Failed to upload file",
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        status: error.status || 500
      }), 
      { 
        status: error.status || 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
