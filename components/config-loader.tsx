"use client";
import { useEffect } from "react";
import useToolsStore from "@/stores/useToolsStore";

interface ConfigLoaderProps {
  children: React.ReactNode;
  publicView?: boolean;
}

export default function ConfigLoader({ children, publicView }: ConfigLoaderProps) {
  const {
    setWebSearchEnabled,
    setFileSearchEnabled,
    setFunctionsEnabled,
    setCodeInterpreterEnabled,
    setMcpEnabled,
    setGoogleIntegrationEnabled,
    setWebSearchConfig,
    setMcpConfig,
    setVectorStore,
  } = useToolsStore();

  useEffect(() => {
    const loadConfig = async () => {
      // Skip loading protected config when rendering a public/shared view
      if (publicView) return;
      try {
        const response = await fetch("/api/config");
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
          if (config.code_interpreter_enabled !== undefined) {
            setCodeInterpreterEnabled(config.code_interpreter_enabled);
          }
          if (config.mcp_enabled !== undefined) {
            setMcpEnabled(config.mcp_enabled);
          }
          if (config.google_integration_enabled !== undefined) {
            setGoogleIntegrationEnabled(config.google_integration_enabled);
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
        console.error("Failed to load public configuration:", error);
      }
    };

    loadConfig();
  }, [
    setWebSearchEnabled,
    setFileSearchEnabled,
    setFunctionsEnabled,
    setCodeInterpreterEnabled,
    setMcpEnabled,
    setGoogleIntegrationEnabled,
    setWebSearchConfig,
    setMcpConfig,
    setVectorStore,
    publicView
  ]);

  return <>{children}</>;
}
