import { getDeveloperPrompt, MODEL } from "@/config/constants";
import { getTools } from "@/lib/tools/tools";
import { checkQueryLimit, recordQuery } from "@/lib/utils/queryLimiter";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { selectDomainsForQuery } from "@/lib/domains/selector";

const extractLatestUserQuery = (messages: any[]): string | null => {
  if (!Array.isArray(messages)) {
    return null;
  }

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!message || message.role !== "user" || !message.content) {
      continue;
    }

    if (typeof message.content === "string" && message.content.trim()) {
      return message.content.trim();
    }

    if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (typeof part === "string" && part.trim()) {
          return part.trim();
        }
        if (
          typeof part === "object" &&
          part?.type === "input_text" &&
          typeof part.text === "string" &&
          part.text.trim()
        ) {
          return part.text.trim();
        }
      }
    }
  }

  return null;
};

export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const { messages, toolsState } = await request.json();
    const userId = session.user.id;

    // Check query limit
    const { allowed } = await checkQueryLimit(userId);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: "Daily query limit reached",
          message: `You've reached your daily limit of 5 queries. Please try again tomorrow.`,
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

    let overrideAllowedDomains: string[] | undefined;
    if (toolsState.webSearchEnabled) {
      const latestUserQuery = extractLatestUserQuery(messages);
      if (latestUserQuery) {
        try {
          const selection = await selectDomainsForQuery(
            latestUserQuery,
            { max_domains: 20 },
            supabase
          );
          if (selection.domains.length > 0) {
            overrideAllowedDomains = selection.domains.map(
              (domain) => domain.domain
            );
            console.log(
              "Dynamic domain selection for query:",
              latestUserQuery,
              overrideAllowedDomains
            );
          }
        } catch (error) {
          console.error("Dynamic domain selection failed:", error);
        }
      }
    }

    const tools = await getTools(toolsState, {
      overrideAllowedDomains,
    });
    const openai = new OpenAI();

    console.log("Tools:", tools);
    console.log("Received messages:", messages);

    const events = await openai.responses.create({
      model: MODEL,
      input: messages,
      instructions: getDeveloperPrompt(),
      tools,
      stream: true,
      parallel_tool_calls: false,
    });

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
        } catch (error) {
          console.error("Error in streaming loop:", error);
          controller.error(error);
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
