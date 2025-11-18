"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import ToolsPanel from "@/components/tools-panel";
import AdminUtilities from "@/components/admin-utilities";
import { isAdmin } from "@/config/admin-emails";
import { Shield, ArrowLeft } from "lucide-react";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || "");
        
        // Check if user is admin
        if (isAdmin(session.user.email || "")) {
          setIsAdminUser(true);
        } else {
          // Redirect non-admin users
          router.push("/");
        }
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
        
        if (isAdmin(session.user.email || "")) {
          setIsAdminUser(true);
        } else {
          router.push("/");
        }
      } else {
        setIsAuthenticated(false);
        setUserEmail("");
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isAuthenticated === null || isAdminUser === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Admin Header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to Chat
        </Button>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm">
          <Shield className="h-4 w-4 text-red-600" />
          <span className="text-sm font-medium">Admin Panel</span>
        </div>
        <div className="text-sm text-gray-600">
          {userEmail}
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="text-sm"
        >
          Logout
        </Button>
      </div>

      {/* Tools Panel - Full Width */}
      <div className="flex-1 pt-20">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Admin Utilities - Reset Credits */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">Admin Utilities</h1>
              <p className="text-gray-600 mt-2">
                Quick actions for admin operations
              </p>
            </div>
            <div className="p-6">
              <AdminUtilities />
            </div>
          </div>

          {/* Tools Configuration */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">Admin Configuration</h1>
              <p className="text-gray-600 mt-2">
                Configure tools and settings that will apply to all users
              </p>
            </div>
            <div className="p-6">
              <ToolsPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
