import { toolsList } from "../../config/tools-list";
import { ToolsState, WebSearchConfig } from "@/stores/useToolsStore";
import { getFreshAccessToken } from "@/lib/connectors-auth";
import { getGoogleConnectorTools } from "./connectors";

interface WebSearchTool extends WebSearchConfig {
  type: "web_search";
}

type GetToolsOptions = {
  overrideAllowedDomains?: string[];
};

export const getTools = async (
  toolsState: ToolsState,
  options?: GetToolsOptions
) => {
  const {
    webSearchEnabled,
    fileSearchEnabled,
    functionsEnabled,
    codeInterpreterEnabled,
    vectorStore,
    webSearchConfig,
    mcpEnabled,
    mcpConfig,
    googleIntegrationEnabled,
  } = toolsState;

  const tools = [];

  if (webSearchEnabled) {
    const webSearchTool: WebSearchTool = {
      type: "web_search",
    };
    
    // Add user location if provided
    if (
      webSearchConfig.user_location &&
      (webSearchConfig.user_location.country !== "" ||
        webSearchConfig.user_location.region !== "" ||
        webSearchConfig.user_location.city !== "")
    ) {
      webSearchTool.user_location = webSearchConfig.user_location;
    }

    // Initialize filters if not exists
    webSearchTool.filters = webSearchTool.filters || {};
    
    const hasOverride =
      options?.overrideAllowedDomains &&
      options.overrideAllowedDomains.length > 0;

    // Use dynamically selected domains if provided, otherwise fall back to config
    const allowedDomains = hasOverride
      ? [...(options?.overrideAllowedDomains || [])]
      : [...(webSearchConfig.filters?.allowed_domains || [])];
    
    // Get mandatory domains that should always be included
    let mandatoryDomains: string[] = [];
    try {
      const { getMandatoryDomains } = await import('@/lib/domains/mandatory');
      mandatoryDomains = await getMandatoryDomains();
      console.log('Fetched mandatory domains from database:', mandatoryDomains);
    } catch (error) {
      console.error('Error fetching mandatory domains:', error);
    }

    // Process allowed domains (clean and filter)
    const cleanedAllowedDomains = allowedDomains
      .map(domain => 
        domain
          .trim()
          .replace(/^https?:\/\//, '')
          .split('/')[0]
          .toLowerCase()
      )
      .filter(domain => domain && !domain.startsWith('http'));

    // Combine and deduplicate domains (mandatory + allowed)
    const allDomains = [
      ...new Set([
        ...mandatoryDomains.map(d => d.toLowerCase().trim()),
        ...cleanedAllowedDomains
      ])
    ];

    // Set the domains to be used for search (limit to 20 as per API)
    const processedDomains = allDomains.slice(0, 20);
    webSearchTool.filters.allowed_domains = processedDomains;

    // Log the final domain selection
    console.log('=== DOMAIN SELECTION ===');
    console.log('Mandatory domains:', mandatoryDomains);
    console.log('Allowed domains:', cleanedAllowedDomains);
    console.log('Final search domains:', processedDomains);

    tools.push(webSearchTool);
  }

  // ... rest of the function remains the same ...
  if (fileSearchEnabled) {
    const fileSearchTool = {
      type: "file_search",
      vector_store_ids: [vectorStore?.id],
    };
    tools.push(fileSearchTool);
  }

  if (codeInterpreterEnabled) {
    tools.push({ type: "code_interpreter", container: { type: "auto" } });
  }

  if (functionsEnabled) {
    tools.push(
      ...toolsList.map((tool) => {
        return {
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties: { ...tool.parameters },
            required: Object.keys(tool.parameters),
            additionalProperties: false,
          },
          strict: true,
        };
      })
    );
  }

  if (mcpEnabled && mcpConfig.server_url && mcpConfig.server_label) {
    const mcpTool: any = {
      type: "mcp",
      server_label: mcpConfig.server_label,
      server_url: mcpConfig.server_url,
    };
    if (mcpConfig.skip_approval) {
      mcpTool.require_approval = "never";
    }
    if (mcpConfig.allowed_tools.trim()) {
      mcpTool.allowed_tools = mcpConfig.allowed_tools
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
    }
    tools.push(mcpTool);
  }

  if (googleIntegrationEnabled) {
    const { accessToken } = await getFreshAccessToken();
    tools.push(...getGoogleConnectorTools(accessToken!));
  }

  return tools;
};