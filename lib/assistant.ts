import { parse } from "partial-json";
import { handleTool } from "@/lib/tools/tools-handling";
import useConversationStore from "@/stores/useConversationStore";
import { ToolsState } from "@/stores/useToolsStore";
import { functionsMap } from "@/config/functions";

type Annotation = {
  type: "file_citation" | "url_citation" | "container_file_citation";
  fileId?: string;
  containerId?: string;
  url?: string;
  title?: string;
  filename?: string;
  index?: number;
};

export interface ContentItem {
  type: "input_text" | "output_text" | "refusal" | "output_audio";
  annotations?: Annotation[];
  text?: string;
}

// Message items for storing conversation history matching API shape
export interface MessageItem {
  type: "message";
  role: "user" | "assistant" | "system";
  id?: string;
  content: ContentItem[];
}

// Custom items to display in chat
export interface ToolCallItem {
  type: "tool_call";
  tool_type:
  | "file_search_call"
  | "web_search_call"
  | "function_call"
  | "mcp_call";
  status: "in_progress" | "completed" | "failed" | "searching";
  id: string;
  name?: string | null;
  call_id?: string;
  arguments?: string;
  parsedArguments?: any;
  output?: string | null;
}

export interface McpListToolsItem {
  type: "mcp_list_tools";
  id: string;
  server_label: string;
  tools: { name: string; description?: string }[];
}

export interface McpApprovalRequestItem {
  type: "mcp_approval_request";
  id: string;
  server_label: string;
  name: string;
  arguments?: string;
}

export type Item =
  | MessageItem
  | ToolCallItem
  | McpListToolsItem
  | McpApprovalRequestItem;

export const handleTurn = async (
  messages: any[],
  toolsState: ToolsState,
  onMessage: (data: any) => void
) => {
  try {
    // Get response from the API (defined in app/api/turn_response/route.ts)
    const response = await fetch("/api/turn_response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        toolsState: toolsState,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Handle query limit exceeded
        const errorData = await response.json().catch(() => ({}));
        onMessage({
          event: "error",
          data: {
            type: "query_limit_exceeded",
            message: errorData.message || "You have reached your daily query limit. You may try again tomorrow, or contact us at <a href='mailto:support@example.com' class='text-blue-600 hover:underline'>support@example.com</a> or <a href='tel:+15550123456' class='text-blue-600 hover:underline'>+1 555-0123</a> for further support."
          }
        });
      } else {
        console.error(`Error: ${response.status} - ${response.statusText}`);
      }
      return;
    }

    // Trigger query limit update when we get a successful response
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('queryResponseReceived'));
    }

    // Reader for streaming data
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = "";

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      buffer += chunkValue;

      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6);
          if (dataStr === "[DONE]") {
            done = true;
            break;
          }
          const data = JSON.parse(dataStr);
          onMessage(data);
        }
      }
    }

    // Handle any remaining data in buffer
    if (buffer && buffer.startsWith("data: ")) {
      const dataStr = buffer.slice(6);
      if (dataStr !== "[DONE]") {
        const data = JSON.parse(dataStr);
        onMessage(data);
      }
    }
  } catch (error) {
    console.error("Error handling turn:", error);
  }
};

export const processMessages = async () => {
  const store = useConversationStore.getState();
  const {
    chatMessages,
    conversationItems,
    setChatMessages,
    setConversationItems,
    setAssistantLoading,
    setWebSearchIndicatorId,
  } = store;

  const toolsState = (await import("@/stores/useToolsStore")).default.getState() as any;

  let assistantMessageContent = "";
  let functionArguments = "";
  // For streaming MCP tool call arguments
  let mcpArguments = "";

  await handleTurn(
    conversationItems,
    toolsState,
    async ({ event, data }) => {
      switch (event) {
        case "error": {
          // Handle different types of errors
          let errorMessage = "An unexpected error occurred. Please try again later.";

          if (data.type === "query_limit_exceeded") {
            errorMessage = data.message || "You have reached your daily query limit. You may try again tomorrow, or contact us at [support@example.com](mailto:support@example.com) or [+1 555-0123](tel:+15550123456) for further support.";
          } else if (data.code === "insufficient_quota" || data.type === "quota_exceeded") {
            errorMessage = "Our AI service is currently experiencing high demand. Please try again later or contact us at [support@example.com](mailto:support@example.com) or [+1 555-0123](tel:+15550123456) for further support.";
          } else if (data.message) {
            errorMessage = data.message;
          }

          // Add error message to chat
          chatMessages.push({
            type: "message",
            role: "assistant",
            content: [{
              type: "output_text",
              text: errorMessage
            }]
          });
          setChatMessages([...chatMessages]);
          setAssistantLoading(false);
          const { webSearchIndicatorId } = useConversationStore.getState();
          if (webSearchIndicatorId) {
            const filtered = chatMessages.filter(
              (m) => m.id !== webSearchIndicatorId
            );
            if (filtered.length !== chatMessages.length) {
              chatMessages.length = 0;
              chatMessages.push(...filtered);
              setChatMessages([...chatMessages]);
            }
            setWebSearchIndicatorId(null);
          }
          break;
        }
        case "response.output_text.delta":
        case "response.output_text.annotation.added": {
          const { delta, item_id } = data;

          let partial = "";
          if (typeof delta === "string") {
            partial = delta;
          }
          assistantMessageContent += partial;

          // If the last message isn't an assistant message, create a new one
          const lastItem = chatMessages[chatMessages.length - 1];
          if (
            !lastItem ||
            lastItem.type !== "message" ||
            lastItem.role !== "assistant" ||
            (lastItem.id && lastItem.id !== item_id)
          ) {
            chatMessages.push({
              type: "message",
              role: "assistant",
              id: item_id,
              content: [
                {
                  type: "output_text",
                  text: assistantMessageContent,
                },
              ],
            } as MessageItem);
          } else {
            const contentItem = lastItem.content[0];
            if (contentItem && contentItem.type === "output_text") {
              contentItem.text = assistantMessageContent;
              // Keep annotations empty to hide sources
              if (contentItem.annotations) {
                contentItem.annotations = [];
              }
            }
          }

          setChatMessages([...chatMessages]);
          setAssistantLoading(false);
          break;
        }

        case "response.output_item.added": {
          const { item } = data || {};
          // New item coming in
          if (!item || !item.type) {
            break;
          }
          setAssistantLoading(false);
          // Handle differently depending on the item type
          switch (item.type) {
            case "message": {
              const text = item.content?.text || "";
              const annotations: Annotation[] = []; // Empty array to hide sources
              chatMessages.push({
                type: "message",
                role: "assistant",
                content: [
                  {
                    type: "output_text",
                    text,
                    ...(annotations.length > 0 ? { annotations } : {}),
                  },
                ],
              });
              conversationItems.push({
                role: "assistant",
                content: [
                  {
                    type: "output_text",
                    text,
                    ...(annotations.length > 0 ? { annotations } : {}),
                  },
                ],
              });
              setChatMessages([...chatMessages]);
              setConversationItems([...conversationItems]);
              break;
            }
            case "function_call": {
              functionArguments += item.arguments || "";
              chatMessages.push({
                type: "tool_call",
                tool_type: "function_call",
                status: "in_progress",
                id: item.id,
                name: item.name, // function name,e.g. "get_weather"
                arguments: item.arguments || "",
                parsedArguments: {},
                output: null,
              });
              setChatMessages([...chatMessages]);
              break;
            }
            case "web_search_call": {
              const { webSearchIndicatorId } = useConversationStore.getState();
              if (!webSearchIndicatorId) {
                const indicatorId = item.id || `web-search-${Date.now()}`;
                chatMessages.push({
                  type: "tool_call",
                  tool_type: "web_search_call",
                  status: "in_progress",
                  id: indicatorId,
                });
                setChatMessages([...chatMessages]);
                setWebSearchIndicatorId(indicatorId);
              }
              break;
            }
            case "file_search_call": {
              chatMessages.push({
                type: "tool_call",
                tool_type: "file_search_call",
                status: item.status || "in_progress",
                id: item.id,
              });
              setChatMessages([...chatMessages]);
              break;
            }
            case "mcp_call": {
              mcpArguments = item.arguments || "";
              chatMessages.push({
                type: "tool_call",
                tool_type: "mcp_call",
                status: "in_progress",
                id: item.id,
                name: item.name,
                arguments: item.arguments || "",
                parsedArguments: item.arguments ? parse(item.arguments) : {},
                output: null,
              });
              setChatMessages([...chatMessages]);
              break;
            }
          }
          break;
        }

        case "response.output_item.done": {
          // After output item is done, adding tool call ID
          const { item } = data || {};
          const toolCallMessage = chatMessages.find((m) => m.id === item.id);
          if (toolCallMessage && toolCallMessage.type === "tool_call") {
            toolCallMessage.call_id = item.call_id;
            setChatMessages([...chatMessages]);
          }
          conversationItems.push(item);
          setConversationItems([...conversationItems]);
          if (
            toolCallMessage &&
            toolCallMessage.type === "tool_call" &&
            toolCallMessage.tool_type === "function_call"
          ) {
            // Handle tool call (execute function)
            const toolResult = await handleTool(
              toolCallMessage.name as keyof typeof functionsMap,
              toolCallMessage.parsedArguments
            );

            // Record tool output
            toolCallMessage.output = JSON.stringify(toolResult);
            setChatMessages([...chatMessages]);
            conversationItems.push({
              type: "function_call_output",
              call_id: toolCallMessage.call_id,
              status: "completed",
              output: JSON.stringify(toolResult),
            });
            setConversationItems([...conversationItems]);

            // Create another turn after tool output has been added
            await processMessages();
          }
          if (
            toolCallMessage &&
            toolCallMessage.type === "tool_call" &&
            toolCallMessage.tool_type === "mcp_call"
          ) {
            toolCallMessage.output = item.output;
            toolCallMessage.status = "completed";
            setChatMessages([...chatMessages]);
          }
          break;
        }

        case "response.function_call_arguments.delta": {
          // Streaming arguments delta to show in the chat
          functionArguments += data.delta || "";
          let parsedFunctionArguments = {};

          const toolCallMessage = chatMessages.find(
            (m) => m.id === data.item_id
          );
          if (toolCallMessage && toolCallMessage.type === "tool_call") {
            toolCallMessage.arguments = functionArguments;
            try {
              if (functionArguments.length > 0) {
                parsedFunctionArguments = parse(functionArguments);
              }
              toolCallMessage.parsedArguments = parsedFunctionArguments;
            } catch {
              // partial JSON can fail parse; ignore
            }
            setChatMessages([...chatMessages]);
          }
          break;
        }

        case "response.function_call_arguments.done": {
          // This has the full final arguments string
          const { item_id, arguments: finalArgs } = data;

          functionArguments = finalArgs;

          // Mark the tool_call as "completed" and parse the final JSON
          const toolCallMessage = chatMessages.find((m) => m.id === item_id);
          if (toolCallMessage && toolCallMessage.type === "tool_call") {
            toolCallMessage.arguments = finalArgs;
            toolCallMessage.parsedArguments = parse(finalArgs);
            toolCallMessage.status = "completed";
            setChatMessages([...chatMessages]);
          }
          break;
        }
        // Streaming MCP tool call arguments
        case "response.mcp_call_arguments.delta": {
          // Append delta to MCP arguments
          mcpArguments += data.delta || "";
          let parsedMcpArguments: any = {};
          const toolCallMessage = chatMessages.find(
            (m) => m.id === data.item_id
          );
          if (toolCallMessage && toolCallMessage.type === "tool_call") {
            toolCallMessage.arguments = mcpArguments;
            try {
              if (mcpArguments.length > 0) {
                parsedMcpArguments = parse(mcpArguments);
              }
              toolCallMessage.parsedArguments = parsedMcpArguments;
            } catch {
              // partial JSON can fail parse; ignore
            }
            setChatMessages([...chatMessages]);
          }
          break;
        }
        case "response.mcp_call_arguments.done": {
          // Final MCP arguments string received
          const { item_id, arguments: finalArgs } = data;
          mcpArguments = finalArgs;
          const toolCallMessage = chatMessages.find((m) => m.id === item_id);
          if (toolCallMessage && toolCallMessage.type === "tool_call") {
            toolCallMessage.arguments = finalArgs;
            toolCallMessage.parsedArguments = parse(finalArgs);
            toolCallMessage.status = "completed";
            setChatMessages([...chatMessages]);
          }
          break;
        }

        case "response.web_search_call.completed": {
          // Keep the loading indicator alive until the overall assistant response finishes.
          break;
        }

        case "response.file_search_call.completed": {
          const { item_id, output } = data;
          const toolCallMessage = chatMessages.find((m) => m.id === item_id);
          if (toolCallMessage && toolCallMessage.type === "tool_call") {
            toolCallMessage.output = output;
            toolCallMessage.status = "completed";
            setChatMessages([...chatMessages]);
          }
          break;
        }

        case "response.completed": {
          console.log("response completed", data);
          const { response } = data;

          // Handle MCP tools list (append all lists, not just the first)
          const mcpListToolsMessages = response.output.filter(
            (m: Item) => m.type === "mcp_list_tools"
          ) as McpListToolsItem[];

          if (mcpListToolsMessages && mcpListToolsMessages.length > 0) {
            for (const msg of mcpListToolsMessages) {
              chatMessages.push({
                type: "mcp_list_tools",
                id: msg.id,
                server_label: msg.server_label,
                tools: msg.tools || [],
              });
            }
            setChatMessages([...chatMessages]);
          }

          // Handle MCP approval request
          const mcpApprovalRequestMessage = response.output.find(
            (m: Item) => m.type === "mcp_approval_request"
          );

          if (mcpApprovalRequestMessage) {
            chatMessages.push({
              type: "mcp_approval_request",
              id: mcpApprovalRequestMessage.id,
              server_label: mcpApprovalRequestMessage.server_label,
              name: mcpApprovalRequestMessage.name,
              arguments: mcpApprovalRequestMessage.arguments,
            });
            setChatMessages([...chatMessages]);
          }

          const { webSearchIndicatorId } = useConversationStore.getState();
          if (webSearchIndicatorId) {
            const filtered = chatMessages.filter(
              (m) => m.id !== webSearchIndicatorId
            );
            if (filtered.length !== chatMessages.length) {
              chatMessages.length = 0;
              chatMessages.push(...filtered);
              setChatMessages([...chatMessages]);
            }
            setWebSearchIndicatorId(null);
          }

          break;
        }

        // Handle other events as needed
      }
    }
  );
};
