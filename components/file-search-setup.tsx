"use client";
import React, { useState, useEffect, useCallback } from "react";
import useToolsStore from "@/stores/useToolsStore";
import FileUpload from "@/components/file-upload";
import { Input } from "./ui/input";
import { CircleX, FileText } from "lucide-react";
import { TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Tooltip } from "./ui/tooltip";
import { TooltipProvider } from "./ui/tooltip";

type FileInfo = {
  id: string;
  object: string;
  bytes: number;
  created_at: number;
  filename: string;
  purpose: string;
  status: string;
  status_details: string | null;
};

export default function FileSearchSetup() {
  const { vectorStore, setVectorStore, setFileSearchEnabled } = useToolsStore();
  const [newStoreId, setNewStoreId] = useState<string>("");
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVectorStoreFiles = useCallback(async (storeId: string) => {
    if (!storeId) {
      setFiles([]);
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/vector_stores/list_files?vector_store_id=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.data || []);
      } else {
        setFiles([]);
      }
    } catch (error) {
      console.error("Error fetching vector store files:", error);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncSharedStore = useCallback(async () => {
    try {
      const response = await fetch("/api/vector_stores/shared", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch shared vector store");
      }
      const data = await response.json();
      const sharedStore = data.store;

      if (sharedStore && sharedStore.store_id) {
        if (!vectorStore?.id || vectorStore.id !== sharedStore.store_id) {
          const store = {
            id: sharedStore.store_id,
            name: sharedStore.store_name || "",
          };
          setVectorStore(store);
          fetchVectorStoreFiles(store.id);
        }
        setNewStoreId(sharedStore.store_id);
      } else {
        if (vectorStore?.id) {
          setVectorStore({
            id: "",
            name: "",
          });
        }
        setFiles([]);
        setFileSearchEnabled(false);
        setNewStoreId("");
      }
    } catch (error) {
      console.error("Error syncing shared vector store:", error);
    }
  }, [setVectorStore, setFileSearchEnabled, vectorStore?.id, fetchVectorStoreFiles]);

  // Fetch files whenever the vector store changes
  useEffect(() => {
    if (vectorStore?.id) {
      fetchVectorStoreFiles(vectorStore.id);
    } else {
      setFiles([]);
    }
  }, [vectorStore?.id, fetchVectorStoreFiles]);

  // Initial sync
  useEffect(() => {
    syncSharedStore();
  }, [syncSharedStore]);

  const unlinkStore = async () => {
    if (!vectorStore?.id) return;
    
    // Update UI immediately for better UX
    setFileSearchEnabled(false);
    setNewStoreId("");
    setFiles([]);
    
    try {
      // First, clean up all files and the vector store
      const cleanupResponse = await fetch(`/api/vector_stores/cleanup?vector_store_id=${vectorStore.id}`, {
        method: "DELETE",
      });
      
      const result = await cleanupResponse.json();
      
      if (!cleanupResponse.ok) {
        // If we get a 404, it means the store was already deleted, which is fine
        if (cleanupResponse.status === 404) {
          console.log('Vector store was already deleted, cleaning up local references');
        } else {
          throw new Error(result.error || "Failed to clean up vector store");
        }
      }
      
      // Then remove the shared reference
      try {
        await fetch("/api/vector_stores/shared", {
          method: "DELETE",
        });
      } catch (error) {
        console.warn("Error removing shared reference (non-critical):", error);
        // Continue even if this fails
      }
      
    } catch (error) {
      console.error("Error during vector store cleanup:", error);
      // Even if there was an error, we'll still update the UI to reflect the unlinked state
    } finally {
      // Always update local state to reflect unlinked state
      setVectorStore({
        id: "",
        name: "",
      });
      
      // Sync with the server to ensure consistency
      try {
        await syncSharedStore();
      } catch (syncError) {
        console.error("Error syncing shared store state:", syncError);
      }
    }
  };

  const handleAddStore = async (storeId: string) => {
    if (storeId.trim()) {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/vector_stores/retrieve_store?vector_store_id=${storeId}`
        );
        const newStore = await response.json();
        
        if (newStore.id) {
          console.log("Retrieved store:", newStore);
          setVectorStore(newStore);
          setNewStoreId("");
          
          try {
            await fetch("/api/vector_stores/shared", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                store_id: newStore.id,
                store_name: newStore.name ?? "",
              }),
            });
            // Fetch files for the new store
            await fetchVectorStoreFiles(newStore.id);
          } catch (error) {
            console.error("Error updating shared vector store:", error);
          }
        } else {
          alert("Vector store not found");
        }
      } catch (error) {
        console.error("Error fetching vector store:", error);
        alert("Error fetching vector store. Please check the ID and try again.");
      } finally {
        setIsLoading(false);
      }
    }
    await syncSharedStore();
  };

  return (
    <div>
      <div className="text-sm text-zinc-500">
        Upload a file to create a new vector store, or use an existing one.
      </div>
      <div className="flex items-center gap-2 mt-2 h-10">
        <div className="flex items-center gap-2 w-full">
          <div className="text-sm font-medium w-24 text-nowrap">
            Vector store
          </div>
          {vectorStore?.id ? (
            <div className="flex items-center justify-between flex-1 min-w-0">
              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center gap-2 w-full">
                  <div className="text-zinc-400 text-xs font-mono flex-1 text-ellipsis truncate">
                    {vectorStore.id}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <CircleX
                          onClick={() => unlinkStore()}
                          size={16}
                          className="cursor-pointer text-zinc-400 hover:text-zinc-700 transition-all flex-shrink-0"
                        />
                      </TooltipTrigger>
                      <TooltipContent className="mr-2">
                        <p>Unlink vector store</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {isLoading ? (
                  <div className="text-xs text-zinc-400 flex items-center gap-1">
                    <div className="w-3 h-3 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin"></div>
                    Loading files...
                  </div>
                ) : files.length > 0 ? (
                  <div className="text-xs text-zinc-500 flex items-center gap-1 flex-wrap">
                    <FileText size={12} className="flex-shrink-0" />
                    <span className="truncate max-w-[200px]" title={files[0].id}>
                      {files[0].id}
                    </span>
                    {files.length > 1 && (
                      <span className="text-zinc-400">+{files.length - 1} more</span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-400">No files in this store</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="ID (vs_XXXX...)"
                value={newStoreId}
                onChange={(e) => setNewStoreId(e.target.value)}
                className="border border-zinc-300 rounded text-sm bg-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddStore(newStoreId);
                  }
                }}
              />
              <div
                className="text-zinc-400 text-sm px-1 transition-colors hover:text-zinc-600 cursor-pointer"
                onClick={() => handleAddStore(newStoreId)}
              >
                Add
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex mt-4">
        <FileUpload
          vectorStoreId={vectorStore?.id ?? ""}
          vectorStoreName={vectorStore?.name ?? ""}
          onAddStore={(id) => handleAddStore(id)}
          onUnlinkStore={() => unlinkStore()}
          onFileUploaded={() => vectorStore?.id && fetchVectorStoreFiles(vectorStore.id)}
        />
      </div>
    </div>
  );
}
