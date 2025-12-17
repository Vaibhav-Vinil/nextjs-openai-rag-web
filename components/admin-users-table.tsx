"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, ExternalLink, Users } from "lucide-react";

interface UserWithChat {
  id: string;
  display_name: string;
  email: string;
  phone: string;
  last_sign_in_at: string | null;
  latest_conversation_id: string | null;
  last_chat_at: string | null;
}

export default function AdminUsersTable() {
  const [users, setUsers] = useState<UserWithChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/admin/api/users");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleViewChat = async (userId: string) => {
    try {
      const response = await fetch(`/admin/api/conversations/${userId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch conversation");
      }
      const data = await response.json();
      if (data.conversationId) {
        // Open the conversation in a new tab with admin_view flag and target user id
        window.open(`/?conv=${data.conversationId}&admin_view=true&view_user_id=${userId}`, "_blank");
      } else {
        alert("No conversation found for this user");
      }
    } catch (err) {
      console.error("Error fetching conversation:", err);
      alert(err instanceof Error ? err.message : "Failed to open chat");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button
            onClick={fetchUsers}
            variant="outline"
            className="mt-2"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p>No users with chat history found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Users with Chat History</h3>
          <p className="text-sm text-gray-600 mt-1">
            {users.length} user{users.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <Button
          onClick={fetchUsers}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Display Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Sign In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => user.latest_conversation_id && handleViewChat(user.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.display_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.phone || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(user.last_sign_in_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {user.latest_conversation_id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewChat(user.id);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Chat
                      </Button>
                    ) : (
                      <span className="text-gray-400">No chat</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

