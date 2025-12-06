"use client";
import React, { useEffect, useState, use } from "react";
import useConversationStore from "@/stores/useConversationStore";
import ConversationHistory from "@/components/conversation-history";
import ConfigLoader from "@/components/config-loader";
import Assistant from "@/components/assistant";
import { createClient } from "@/lib/supabase/client";

export default function ShareSnippetPage({ params }: { params: Promise<{ id: string }> }) {
  // In Next.js 15, `params` is a Promise and should be unwrapped with `use()` in client components
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const { loadConversation, setCurrentConversationId } = useConversationStore();
  const supabase = createClient();

  // Get current user if logged in
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || "");
        setUserId(session.user.id);
      }
    };
    getSession();
  }, [supabase]);

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
  }, [id, loadConversation, setCurrentConversationId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

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
          <ConversationHistory 
            userEmail={userEmail} 
            userId={userId} 
            onLogout={handleLogout} 
            publicView={!userEmail} 
          />
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
