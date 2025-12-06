"use client";
import Assistant from "@/components/assistant";
import ConversationHistory from "@/components/conversation-history";
import ConfigLoader from "@/components/config-loader";
import { PanelsTopLeft, Settings, Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useConversationStore from "@/stores/useConversationStore";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/config/admin-emails";

function CollapsibleConversationSidebar({
  userEmail,
  userId,
  displayName,
  onLogout,
  publicView,
  onOpenChange,
  isOpen: externalIsOpen,
  onSetIsOpen
}: {
  userEmail: string;
  userId: string;
  displayName?: string;
  onLogout: () => void;
  publicView?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  isOpen: boolean;
  onSetIsOpen: (isOpen: boolean) => void;
}) {

  useEffect(() => {
    // Initialize sidebar state based on screen size
    const handleResize = () => {
      const shouldBeOpen = window.innerWidth >= 1024;
      onSetIsOpen(shouldBeOpen);
      if (onOpenChange) onOpenChange(shouldBeOpen);
    };

    // Set initial state
    handleResize();
    
    // Update on window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onOpenChange, onSetIsOpen]);

  return (
    <div className="flex relative">
      {/* Sidebar */}
      <div 
        className={`fixed md:relative z-30 h-full w-64 bg-[#f8fafc] shadow-lg md:shadow-none transform-gpu will-change-transform ${
          externalIsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          transform: externalIsOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
        }}
      >
        <div className="h-full overflow-y-auto">
          <ConversationHistory 
            userEmail={userEmail} 
            userId={userId} 
            displayName={displayName}
            onLogout={onLogout} 
            publicView={publicView} 
          />
        </div>
      </div>
      
      {/* Toggle button has been moved to the main layout */}
      
      {/* Overlay for mobile - only show when sidebar is open on mobile */}
      {externalIsOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => onSetIsOpen(false)}
          style={{
            transition: 'opacity 0.3s ease',
            willChange: 'opacity',
            backdropFilter: 'blur(2px)'
          }}
        />
      )}
    </div>
  );
}


export default function Main() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [shareCopied, setShareCopied] = useState(false);
  
  // Handle sidebar open/close state
  const handleSidebarOpenChange = useCallback((open: boolean) => {
    setIsSidebarOpen(open);
  }, []);
  // Removed unused hasUserSentMessage state as it's not being used
  
  // Detect if we're viewing a public/shared conversation via URL params
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  // Consider both full conversation shares and single-response snippet shares public
  const initialPublicView = (urlParams.get("public") === "true" && Boolean(urlParams.get("conv"))) || (urlParams.get("public_snippet") === "true" && Boolean(urlParams.get("snippet")));
  const [isPublicView] = useState<boolean>(initialPublicView);
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
        setDisplayName(session.user.user_metadata?.display_name || "");
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
        setDisplayName(session.user.user_metadata?.display_name || "");
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
    <div className="flex h-screen overflow-hidden bg-transparent relative">
      {/* Sidebar Toggle Button - Always visible */}
      {isAuthenticated && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed z-50 top-4 p-2 transition-all flex items-center gap-2 bg-[#eef0f5] border border-gray-200 hover:bg-gray-200 hover:border-gray-300 text-black rounded-lg"
          style={{
            transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            // On mobile, always stay at 1rem from left
            left: window.innerWidth >= 768 ? (isSidebarOpen ? 'calc(16rem + 1rem)' : '1rem') : '1rem',
            zIndex: 50
          }}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <PanelsTopLeft size={20} />
        </button>
      )}

      {/* Mobile Overlay */}
      {isAuthenticated && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {isAuthenticated && (
        <div 
          className={`fixed z-40 h-full transition-all duration-300 ease-out bg-white shadow-lg ${
            isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
          }`}
          style={{
            transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 40
          }}
        >
          <CollapsibleConversationSidebar
            userEmail={userEmail}
            userId={userId}
            displayName={displayName}
            onLogout={handleLogout}
            publicView={isPublicView}
            onOpenChange={handleSidebarOpenChange}
            isOpen={isSidebarOpen}
            onSetIsOpen={setIsSidebarOpen}
          />
        </div>
      )}

      {/* Main Content */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'md:ml-64' : 'md:ml-0'
        }`}
        style={{
          width: '100%',
          maxWidth: '100%',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          position: 'relative'
        }}
      >
        {/* Top-right controls */}
        <div className="fixed top-4 right-4 flex flex-col items-end gap-2 z-40">
          {isAuthenticated && (
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={async () => {
                  try {
                    const state = useConversationStore.getState();
                    const convId = state.currentConversationId;
                    if (!convId) return;
                    const res = await fetch(`/api/conversations/${convId}/share`, { method: 'POST' });
                    if (!res.ok) throw new Error('Failed to mark conversation public');
                    const shareUrl = `${window.location.origin}?conv=${convId}&public=true`;
                    await navigator.clipboard.writeText(shareUrl);
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

        {/* Chat Area */}
        <div className="flex-1 flex min-h-0 pt-16">
          <div className="w-full px-4 sm:px-6 md:px-8 py-6" style={{
            width: '100%',
            maxWidth: '64rem',
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <ConfigLoader publicView={isPublicView}>
              <Assistant />
            </ConfigLoader>
          </div>
        </div>
      </div>
    </div>
  );
}
