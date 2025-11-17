"use client";
import Assistant from "@/components/assistant";
import ConversationHistory from "@/components/conversation-history";
import ConfigLoader from "@/components/config-loader";
import { PanelsTopLeft, X, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useConversationStore from "@/stores/useConversationStore";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/config/admin-emails";

function CollapsibleConversationSidebar({
  userEmail,
  userId,
  onLogout,
}: {
  userEmail: string;
  userId: string;
  onLogout: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsOpen(true);
    }
  }, []);

  return (
    <div className="hidden md:flex relative">
      {isOpen && (
        <div className="w-64 h-full overflow-y-auto bg-white border-r border-gray-200">
          <ConversationHistory userEmail={userEmail} userId={userId} onLogout={onLogout} />
        </div>
      )}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed top-4 left-4 rounded-lg border bg-white p-2 shadow-sm hover:bg-gray-100 transition-colors ${
          isOpen ? 'left-[276px]' : 'left-4'
        }`}
        aria-label={isOpen ? "Hide conversations" : "Show conversations"}
      >
        <PanelsTopLeft size={20} />
      </button>
    </div>
  );
}


export default function Main() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
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
        setIsAuthenticated(false);
        router.push("/login");
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
        setIsAuthenticated(false);
        setUserId("");
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
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
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Mobile top controls */}
      <div className="fixed top-4 left-4 flex gap-2 md:hidden z-40">
        <button
          onClick={() => setIsHistoryOpen(true)}
          className="rounded-lg border bg-white p-2 shadow-sm hover:bg-gray-100 transition-colors"
          aria-label="Open conversations"
        >
          <PanelsTopLeft size={20} />
        </button>
        {isAdmin(userEmail) && (
          <button
            onClick={() => router.push("/admin")}
            className="rounded-lg border bg-white p-2 shadow-sm hover:bg-gray-100 transition-colors"
            aria-label="Admin panel"
          >
            <Settings size={20} />
          </button>
        )}
      </div>

      {/* Mobile conversation history */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-full max-w-xs h-full bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-sm font-semibold text-gray-700">Conversations</h2>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="rounded-full p-2 hover:bg-gray-100"
                aria-label="Close conversations"
              >
                <X size={18} />
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

      {/* Conversation History Sidebar */}
      <CollapsibleConversationSidebar userEmail={userEmail} userId={userId} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0 p-4 sm:p-6 md:p-8">
            <ConfigLoader>
              <Assistant />
            </ConfigLoader>
          </div>
        </div>
      </div>
    </div>
  );
}
