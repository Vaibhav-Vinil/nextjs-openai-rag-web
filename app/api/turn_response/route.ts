import { getDeveloperPrompt, MODEL } from "@/config/constants";
import { getTools } from "@/lib/tools/tools";
import { checkQueryLimit, recordQuery } from "@/lib/security/queryLimiter";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

import { turnResponseSchema, validateRequestBody } from "@/lib/validation/schemas";
import { applyRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter";



export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    // Apply rate limiting (30 requests/minute for AI endpoints)
    const rateLimitResponse = applyRateLimit(request, RATE_LIMIT_CONFIGS.ai, user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Validate request body with Zod schema
    const validation = await validateRequestBody(request, turnResponseSchema);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          message: validation.error
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { messages, toolsState } = validation.data;
    const userId = user.id;

    // Check query limit
    const { allowed } = await checkQueryLimit(userId);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: "Daily query limit reached",
          message: `You have reached your daily query limit. You may try again tomorrow, or contact us at support@example.com or +1 555-0123 for further support.`,
          limitReached: true
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Record this query and get the result
    const recordResult = await recordQuery(userId, 'assistant_query');

    if (!recordResult.success) {
      console.error('Failed to record query:', recordResult.error);
      return new Response(
        JSON.stringify({
          error: 'Failed to record query',
          message: 'Your query was processed but could not be recorded.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tools = await getTools(toolsState as any);
    const openai = new OpenAI();

    console.log("Tools:", tools);
    console.log("Received messages:", messages);

    // Clean messages for API compatibility
    const cleanMessages = (messages: any[]) => {
      const cleaned = [];

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        // Skip reasoning messages for GPT-5.1
        if (MODEL.includes('gpt-5') && msg.type === 'reasoning') {
          continue;
        }

        // Ensure message has required fields
        if (msg.role && (msg.content || msg.content === '')) {
          cleaned.push({
            role: msg.role,
            content: Array.isArray(msg.content)
              ? msg.content.map((item: any) => ({
                type: item.type || 'text',
                text: item.text || JSON.stringify(item)
              }))
              : msg.content
          });
        }
      }

      return cleaned;
    };

    const cleanedMessages = cleanMessages(messages);
    console.log('Cleaned messages for API:', JSON.stringify(cleanedMessages, null, 2));

    let events;
    try {
      events = await openai.responses.create({
        model: MODEL,
        input: cleanedMessages,
        instructions: getDeveloperPrompt(),
        tools,
        stream: true,
        parallel_tool_calls: false,
      });
    } catch (error: any) {
      console.error('OpenAI API Error:', error);
      if (error.code === 'insufficient_quota' || error.status === 429) {
        return new Response(
          JSON.stringify({
            error: {
              message: "Our AI service is currently experiencing high demand. Please try again later or contact support if the issue persists.",
              type: "quota_exceeded",
              code: "insufficient_quota"
            }
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      throw error; // Re-throw other errors
    }

    // Create a ReadableStream that emits SSE data
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of events) {
            // Sending all events to the client
            const data = JSON.stringify({
              event: event.type,
              data: event,
            });
            controller.enqueue(`data: ${data}\n\n`);
          }
          // End of stream
          controller.close();
        } catch (error: any) {
          console.error("Error in streaming loop:", error);

          // Handle quota exceeded error during streaming
          if (error.code === 'insufficient_quota' || error.status === 429) {
            const errorData = JSON.stringify({
              event: 'error',
              data: {
                message: "Our AI service is currently experiencing high demand. Please try again later or contact support if the issue persists.",
                type: "quota_exceeded",
                code: "insufficient_quota"
              }
            });
            controller.enqueue(`data: ${errorData}\n\n`);
          } else {
            // For other errors, send a generic error message
            const errorData = JSON.stringify({
              event: 'error',
              data: {
                message: "An unexpected error occurred. Please try again later.",
                type: "server_error"
              }
            });
            controller.enqueue(`data: ${errorData}\n\n`);
          }
          controller.close();
        }
      },
    });

    // Return the ReadableStream as SSE
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}
