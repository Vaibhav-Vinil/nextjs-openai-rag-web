"use client";
import React, { useState, useEffect, useCallback } from "react";
import useToolsStore from "@/stores/useToolsStore";
import FileUpload from "@/components/file-upload";
import { Input } from "./ui/input";
import { CircleX } from "lucide-react";
import { TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Tooltip } from "./ui/tooltip";
import { TooltipProvider } from "./ui/tooltip";

export default function FileSearchSetup() {
  const { vectorStore, setVectorStore, setFileSearchEnabled } = useToolsStore();
  const [newStoreId, setNewStoreId] = useState<string>("");

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
          setVectorStore({
            id: sharedStore.store_id,
            name: sharedStore.store_name || "",
          });
        }
        setNewStoreId(sharedStore.store_id);
      } else {
        if (vectorStore?.id) {
          setVectorStore({
            id: "",
            name: "",
          });
        }
        setNewStoreId("");
      }
    } catch (error) {
      console.error("Error syncing shared vector store:", error);
    }
  }, [setVectorStore, setFileSearchEnabled, vectorStore?.id]);

  useEffect(() => {
    syncSharedStore();
  }, [syncSharedStore]);

  const unlinkStore = async () => {
    try {
      await fetch("/api/vector_stores/shared", {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error unlinking shared vector store:", error);
    } finally {
      setVectorStore({
        id: "",
        name: "",
      });
      setFileSearchEnabled(false);
      setNewStoreId("");
    }
    await syncSharedStore();
  };

  const handleAddStore = async (storeId: string) => {
    if (storeId.trim()) {
      const newStore = await fetch(
        `/api/vector_stores/retrieve_store?vector_store_id=${storeId}`
      ).then((res) => res.json());
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
        } catch (error) {
          console.error("Error updating shared vector store:", error);
        }
      } else {
        alert("Vector store not found");
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
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-zinc-400  text-xs font-mono flex-1 text-ellipsis truncate">
                  {vectorStore.id}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CircleX
                        onClick={() => unlinkStore()}
                        size={16}
                        className="cursor-pointer text-zinc-400 mb-0.5 shrink-0 mt-0.5 hover:text-zinc-700 transition-all"
                      />
                    </TooltipTrigger>
                    <TooltipContent className="mr-2">
                      <p>Unlink vector store</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
        />
      </div>
    </div>
  );
}
