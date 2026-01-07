"use client";
import React from "react";
import FileSearchSetup from "./file-search-setup";
import WebSearchConfig from "./websearch-config";
import FunctionsView from "./functions-view";
import McpConfig from "./mcp-config";
import PanelConfig from "./panel-config";
import useToolsStore from "@/stores/useToolsStore";

export default function ToolsPanel() {
  const {
    fileSearchEnabled,
    setFileSearchEnabled,
    webSearchEnabled,
    setWebSearchEnabled,
    functionsEnabled,
    setFunctionsEnabled,
    mcpEnabled,
    setMcpEnabled,
    webSearchConfig,
    setWebSearchConfig,
    mcpConfig,
    setMcpConfig,
    vectorStore,
    setVectorStore,
  } = useToolsStore();
  const [isLoading, setIsLoading] = React.useState(true);

  // Load configuration from admin API on mount
  React.useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/admin/config");
        if (response.ok) {
          const config = await response.json();

          // Apply configuration to store
          if (config.web_search_enabled !== undefined) {
            setWebSearchEnabled(config.web_search_enabled);
          }
          if (config.file_search_enabled !== undefined) {
            setFileSearchEnabled(config.file_search_enabled);
          }
          if (config.functions_enabled !== undefined) {
            setFunctionsEnabled(config.functions_enabled);
          }
          if (config.mcp_enabled !== undefined) {
            setMcpEnabled(config.mcp_enabled);
          }
          if (config.web_search_config) {
            setWebSearchConfig(config.web_search_config);
          }
          if (config.mcp_config) {
            setMcpConfig(config.mcp_config);
          }
          if (config.vector_store) {
            setVectorStore(config.vector_store);
          }
        }
      } catch (error) {
        console.error("Failed to load admin configuration:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [
    setWebSearchEnabled,
    setFileSearchEnabled,
    setFunctionsEnabled,
    setMcpEnabled,
    setWebSearchConfig,
    setMcpConfig,
    setVectorStore,
  ]);

  // Save configuration to admin API whenever any tool setting changes
  const saveConfig = React.useCallback(async () => {
    // First, get the current config from the server to preserve existing values
    let currentConfig: any = {};
    try {
      const response = await fetch("/api/admin/config");
      if (response.ok) {
        currentConfig = await response.json();
      }
    } catch (error) {
      console.error("Failed to fetch current config:", error);
    }

    const config = {
      web_search_enabled: webSearchEnabled,
      file_search_enabled: fileSearchEnabled,
      functions_enabled: functionsEnabled,
      mcp_enabled: mcpEnabled,
      // Preserve the existing web_search_config but merge with current state
      web_search_config: {
        ...(currentConfig.web_search_config || {}),  // Keep existing config from server
        ...webSearchConfig,  // Apply local changes
        filters: {
          ...(currentConfig.web_search_config?.filters || {}),  // Keep existing filters
          ...((webSearchConfig as any).filters || {}),  // Apply local filter changes
        },
      },
      mcp_config: {
        ...(currentConfig.mcp_config || {}),
        ...mcpConfig,
      },
      vector_store: vectorStore,
    };

    try {
      const response = await fetch("/api/admin/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ configurations: config }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Failed to save admin configuration:", error);
      }
    } catch (error) {
      console.error("Failed to save admin configuration:", error);
    }
  }, [
    webSearchEnabled,
    fileSearchEnabled,
    functionsEnabled,
    mcpEnabled,
    webSearchConfig,
    mcpConfig,
    vectorStore,
  ]);

  // Save config whenever relevant state changes
  React.useEffect(() => {
    if (!isLoading) {
      saveConfig();
    }
  }, [isLoading, saveConfig]);

  if (isLoading) {
    return (
      <div className="h-full p-8 w-full bg-[#f9f9f9] rounded-t-xl md:rounded-none border-l-1 border-stone-100 flex items-center justify-center">
        <div className="text-gray-600">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="h-full p-8 w-full bg-[#f9f9f9] rounded-t-xl md:rounded-none border-l-1 border-stone-100">
      <div className="flex flex-col overflow-y-scroll h-full">
        <PanelConfig
          title="File Search"
          tooltip="Allows to search a knowledge base (vector store)"
          enabled={fileSearchEnabled}
          setEnabled={setFileSearchEnabled}
        >
          <FileSearchSetup />
        </PanelConfig>
        <PanelConfig
          title="Web Search"
          tooltip="Allows to search the web"
          enabled={webSearchEnabled}
          setEnabled={setWebSearchEnabled}
        >
          <WebSearchConfig />
        </PanelConfig>
        <PanelConfig
          title="Functions"
          tooltip="Allows to use locally defined functions"
          enabled={functionsEnabled}
          setEnabled={setFunctionsEnabled}
        >
          <FunctionsView />
        </PanelConfig>
        <PanelConfig
          title="MCP"
          tooltip="Allows to call tools via remote MCP server"
          enabled={mcpEnabled}
          setEnabled={setMcpEnabled}
        >
          <McpConfig />
        </PanelConfig>
      </div>
    </div>
  );
}
