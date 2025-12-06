"use client";
import Assistant from "@/components/assistant";
import ConversationHistory from "@/components/conversation-history";
import ConfigLoader from "@/components/config-loader";
import { PanelsTopLeft, X, Settings, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useConversationStore from "@/stores/useConversationStore";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/config/admin-emails";

function CollapsibleConversationSidebar({
  userEmail,
  userId,
  onLogout,
  publicView,
  onOpenChange,
}: {
  userEmail: string;
  userId: string;
  onLogout: () => void;
  publicView?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Notify parent component when sidebar state changes
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsOpen(true);
    }
  }, []);

  return (
    <div className="flex relative">
      {/* Sidebar */}
      <div 
        className={`fixed md:relative z-30 h-full transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0'
        } w-64 bg-[#f8fafc]`}
      >
        <div className="h-full overflow-y-auto">
          <ConversationHistory userEmail={userEmail} userId={userId} onLogout={onLogout} publicView={publicView} />
        </div>
      </div>
      
      {/* Toggle Button - Visible on all screens */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed z-40 top-4 left-4 rounded-lg p-2 transition-all bg-[#eef0f5] border border-gray-200 hover:bg-gray-200 hover:border-gray-300 ${
          isOpen ? 'md:left-[276px]' : 'left-4'
        }`}
        aria-label={isOpen ? "Hide conversations" : "Show conversations"}
      >
        <PanelsTopLeft size={20} className="text-black hover:text-black/80" />
      </button>
      
      {/* Overlay for mobile - only show when sidebar is open on mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 md:hidden z-20"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}


export default function Main() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  // Removed unused hasUserSentMessage state as it's not being used
  
  // Detect if we're viewing a public/shared conversation via URL params
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  // Consider both full conversation shares and single-response snippet shares public
  const initialPublicView = (urlParams.get("public") === "true" && Boolean(urlParams.get("conv"))) || (urlParams.get("public_snippet") === "true" && Boolean(urlParams.get("snippet")));
  const [isPublicView] = useState<boolean>(initialPublicView);
  const [shareCopied, setShareCopied] = useState(false);
  const router = useRouter();
  const { resetConversation } = useConversationStore();
  const supabase = createClient();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || "");
      } else {
        // If this is a public/shared conversation view, don't force a login redirect.
        setIsAuthenticated(false);
        if (!isPublicView) {
          // Use window.location for immediate redirect to avoid blank page
          window.location.href = "/login";
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || "");
        setUserId(session.user.id);
      } else {
        // Avoid redirecting to login when someone is viewing a public/shared conversation
        setIsAuthenticated(false);
        setUserId("");
        if (!isPublicView) {
          // Use window.location for immediate redirect to avoid blank page
          window.location.href = "/login";
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [isPublicView, router, supabase]);

  // After OAuth redirect, reinitialize the conversation so the next turn
  // uses the connector-enabled server configuration immediately
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isConnected = new URLSearchParams(window.location.search).get("connected");
    if (isConnected === "1") {
      resetConversation();
      router.replace("/", { scroll: false });
    }
  }, [router, resetConversation]);

  // Handle shared conversation and message URLs
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get("conv");
    const messageIndex = urlParams.get("msg");
    const isPublic = urlParams.get("public") === "true";
    const snippet = urlParams.get("snippet");
    const snippetId = urlParams.get("snippetId");

    // If a `snippetId` param is present, load that persisted snippet from the server
    if (snippetId) {
      const loadSnippetById = async () => {
        try {
          const response = await fetch(`/api/snippets/${snippetId}`);
          if (!response.ok) throw new Error("Snippet not found");
          const result = await response.json();
          const decoded = result?.snippet?.content || "";
          const { loadConversation, setCurrentConversationId } = useConversationStore.getState();
          const assistantItem = {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: decoded }],
          } as any;
          loadConversation([], [assistantItem], null as any);
          setCurrentConversationId(null);
        } catch (err) {
          console.error("Error loading snippetId:", err);
        }

        if (typeof window !== "undefined" && window.history && window.history.replaceState) {
          try {
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, "", newUrl);
          } catch {
            router.replace("/", { scroll: false });
          }
        } else {
          router.replace("/", { scroll: false });
        }
      };

      loadSnippetById();
      return;
    }

    // If a `snippet` param is present, load only that response into the UI
    if (snippet) {
      try {
        const safeDecode = (value: string) => {
          try {
            return decodeURIComponent(value);
          } catch {
            // Sometimes URLs are malformed (lone '%' or '+' for spaces). Try sanitizing.
            try {
              const replacedPlus = value.replace(/\+/g, "%20");
              const sanitized = replacedPlus.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");
              return decodeURIComponent(sanitized);
            } catch {
              // As a last resort, return the raw value so the UI shows something instead of crashing.
              return value;
            }
          }
        };

        const decoded = safeDecode(snippet);
        const { loadConversation, setCurrentConversationId } = useConversationStore.getState();
        const assistantItem = {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: decoded }],
        } as any;
        loadConversation([], [assistantItem], null as any);
        setCurrentConversationId(null);
      } catch (err) {
        console.error("Error loading snippet:", err);
      }
      // Clean up URL without causing a Next.js navigation so the conversation
      // store is preserved (router.replace can trigger a re-render that resets state).
      if (typeof window !== "undefined" && window.history && window.history.replaceState) {
        try {
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, "", newUrl);
        } catch {
          // Fallback to router.replace if history API is unavailable
          router.replace("/", { scroll: false });
        }
      } else {
        router.replace("/", { scroll: false });
      }
      return;
    }

    if (conversationId) {
      // Load the shared conversation
      const loadSharedConversation = async () => {
        try {
          let data;
          
          if (isPublic) {
            // Use public API endpoint (no authentication required)
            const response = await fetch(`/api/share/${conversationId}`);
            if (!response.ok) {
              throw new Error('Conversation not found');
            }
            const result = await response.json();
            data = {
              conversation_items: result.conversation.conversation_items,
              chat_messages: result.conversation.chat_messages
            };
          } else {
            // Use authenticated API endpoint
            const { loadConversation: loadConvData } = await import("@/lib/conversations");
            data = await loadConvData(conversationId);
          }
          
          if (data) {
            const { loadConversation, setCurrentConversationId } = useConversationStore.getState();
            // If this is a public/shared conversation, load it into the UI
            // as a new (unsaved) conversation for the current user by
            // not setting the currentConversationId. This prevents the
            // client from attempting to update (PUT) another user's
            // conversation when auto-saving. The user can then save
            // (POST) to create their own copy.
            if (isPublic) {
              loadConversation(data.conversation_items, data.chat_messages, null as any);
              setCurrentConversationId(null);
            } else {
              loadConversation(data.conversation_items, data.chat_messages, conversationId);
            }
            
            // If message index is specified, we could scroll to that message
            if (messageIndex) {
              // TODO: Implement scroll to message functionality
              console.log(`Shared conversation loaded, highlighting message ${messageIndex}`);
            }
          }
        } catch (error) {
          console.error("Error loading shared conversation:", error);
        }
      };
      
      loadSharedConversation();
      // Keep the `conv` URL params intact so the shared link persists
      // in the address bar instead of navigating back to the base URL.
    }
  }, [router, isPublicView]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Use window.location for immediate redirect to avoid blank page
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if signOut fails, redirect to login page
      window.location.href = "/login";
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated && !isPublicView) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      {/* Top-right controls */}
      <div className="fixed top-4 right-4 flex flex-col items-end gap-2 z-40">
        {/* Show full-chat share button only when authenticated and a conversation is loaded */}
        {isAuthenticated && (
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={async () => {
                try {
                  const state = useConversationStore.getState();
                  const convId = state.currentConversationId;
                  if (!convId) return;
                  // Mark conversation as publicly shareable
                  const res = await fetch(`/api/conversations/${convId}/share`, { method: 'POST' });
                  if (!res.ok) throw new Error('Failed to mark conversation public');
                  const shareUrl = `${window.location.origin}?conv=${convId}&public=true`;
                  await navigator.clipboard.writeText(shareUrl);
                  // Visual feedback: show copied state for 2s
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                } catch (err) {
                  console.error('Error sharing full conversation:', err);
                }
              }}
              className="rounded-lg p-2 transition-all flex items-center gap-2 bg-[#eef0f5] border border-gray-200 hover:bg-gray-200 hover:border-gray-300 text-black"
              title="Share entire conversation"
            >
              {shareCopied ? (
                <>
                  <Check size={16} className="text-green-600" />
                  <span className="text-sm">Copied</span>
                </>
              ) : (
                <span className="text-sm">Share</span>
              )}
            </button>
            
            {/* Admin button - only shown to admin users */}
            {isAdmin(userEmail) && (
              <button
                onClick={() => router.push("/admin")}
                className="w-full rounded-lg p-2 transition-all bg-[#eef0f5] border border-gray-200 hover:bg-gray-200 hover:border-gray-300 flex items-center justify-center gap-2"
                aria-label="Admin panel"
                title="Admin Panel"
              >
                <Settings size={16} />
                <span className="text-sm">Admin</span>
              </button>
            )}
          </div>
        )}
      </div>
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-40">
        <button
          onClick={() => setIsHistoryOpen(true)}
          className="md:hidden rounded-lg p-2 transition-all bg-[#eef0f5] border border-gray-200 hover:bg-gray-200 hover:border-gray-300"
          aria-label="Open conversations"
        >
          <PanelsTopLeft size={20} className="text-black hover:text-black/80" />
        </button>
      </div>

      {/* Mobile conversation history */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-full max-w-xs h-full bg-[#eef0f5] shadow-2xl flex flex-col text-black">
            <div className="flex items-center justify-between p-4 border-b border-black/10">
              <h2 className="text-sm font-semibold">Conversations</h2>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="rounded-full p-2 hover:bg-black/5"
                aria-label="Close conversations"
              >
                <X size={18} className="text-black" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ConversationHistory
                userEmail={userEmail}
                onLogout={() => {
                  handleLogout();
                  setIsHistoryOpen(false);
                }}
              />
            </div>
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setIsHistoryOpen(false)}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Conversation History Sidebar (hidden for public/shared views) */}
<CollapsibleConversationSidebar 
        userEmail={userEmail} 
        userId={userId} 
        onLogout={handleLogout} 
        publicView={isPublicView} 
        onOpenChange={() => {
          // Sidebar open/close handler can be implemented here if needed
        }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0 p-4 sm:p-6 md:p-8">
            <ConfigLoader publicView={isPublicView}>
              <Assistant />
            </ConfigLoader>
          </div>
        </div>
      </div>
    </div>
  );
}
