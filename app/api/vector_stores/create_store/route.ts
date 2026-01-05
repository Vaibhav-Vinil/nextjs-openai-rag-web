import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createVectorStoreSchema, validateRequestBody } from "@/lib/validation/schemas";
import { applyRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Apply rate limiting for vector store creation
    const rateLimitResponse = applyRateLimit(request, RATE_LIMIT_CONFIGS.upload, user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Validate request body
    const validation = await validateRequestBody(request, createVectorStoreSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { name } = validation.data;

    const vectorStore = await openai.vectorStores.create({
      name,
    });

    return NextResponse.json(vectorStore, { status: 200 });
  } catch (error) {
    console.error("Error creating vector store:", error);
    return NextResponse.json(
      { error: "Error creating vector store" },
      { status: 500 }
    );
  }
}
