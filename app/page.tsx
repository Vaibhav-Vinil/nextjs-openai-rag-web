"use client";
import Assistant from "@/components/assistant";
import ToolsPanel from "@/components/tools-panel";
import { Menu, X, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useConversationStore from "@/stores/useConversationStore";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function Main() {
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
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
      } else {
        setIsAuthenticated(false);
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
    <div className="flex justify-center h-screen">
      <div className="w-full md:w-[70%]">
        <div className="absolute top-4 left-4 flex items-center gap-4">
          <span className="text-sm text-gray-600">Welcome, {userEmail}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>
        <Assistant />
      </div>
      <div className=" hidden md:block w-[30%]">
        <ToolsPanel />
      </div>
      {/* Hamburger menu for small screens */}
      <div className="absolute top-4 right-4 md:hidden">
        <button onClick={() => setIsToolsPanelOpen(true)}>
          <Menu size={24} />
        </button>
      </div>
      {/* Overlay panel for ToolsPanel on small screens */}
      {isToolsPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-30">
          <div className="w-full bg-white h-full p-4">
            <button className="mb-4" onClick={() => setIsToolsPanelOpen(false)}>
              <X size={24} />
            </button>
            <ToolsPanel />
          </div>
        </div>
      )}
    </div>
  );
}
