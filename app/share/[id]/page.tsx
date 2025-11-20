"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConfigLoader from "@/components/config-loader";
import ConversationHistory from "@/components/conversation-history";
import Assistant from "@/components/assistant";
import useConversationStore from "@/stores/useConversationStore";

interface SnippetData {
  id: string;
  content: string;
}

export default function ShareSnippetPage({ params }: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  // In newer Next.js versions `params` may be a Promise and should be
  // unwrapped with `React.use()` in client components. Use a safe
  // fallback for older runtimes that don't provide `React.use` yet.
  const resolvedParams = (React as any).use ? (React as any).use(params) : params as any;
  const { id } = resolvedParams as { id: string };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { loadConversation, setCurrentConversationId } = useConversationStore();

  useEffect(() => {
    const fetchSnippet = async () => {
      try {
        const res = await fetch(`/api/snippets/${id}`);
        if (!res.ok) throw new Error("Snippet not found");
        const data = await res.json();
        const content = data?.snippet?.content || "";
        const assistantItem = {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: content }],
        } as any;
        loadConversation([], [assistantItem], null as any);
        setCurrentConversationId(null);
        setLoading(false);
      } catch (err: any) {
        console.error("Error loading shared snippet:", err);
        setError(err?.message || "Failed to load snippet");
        setLoading(false);
      }
    };

    fetchSnippet();
    // keep dependency list empty to run once
  }, [id, loadConversation, setCurrentConversationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading shared snippet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className="hidden md:flex relative">
        <div className="w-64 h-full overflow-y-auto bg-white border-r border-gray-200">
          <ConversationHistory publicView={true} />
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0 p-4 sm:p-6 md:p-8">
            <ConfigLoader publicView={true}>
              <Assistant />
            </ConfigLoader>
          </div>
        </div>
      </div>
    </div>
  );
}
