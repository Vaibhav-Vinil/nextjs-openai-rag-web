"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, MessageSquare, LogOut, Search, X } from "lucide-react";
import QueryLimitDisplay from "./query-limit-display";
import { Conversation, listConversations, deleteConversation, loadConversation } from "@/lib/conversations";
import useConversationStore from "@/stores/useConversationStore";
import { format } from "date-fns";

interface ConversationHistoryProps {
  userEmail?: string;
  userId?: string;
  onLogout?: () => void;
}

export default function ConversationHistory({ userEmail, userId, onLogout }: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { currentConversationId, resetConversation, loadConversation: loadConv, setCurrentConversationId, setConversationLoading } = useConversationStore();

  const fetchConversations = async () => {
    setLoading(true);
    const convs = await listConversations();
    setConversations(convs);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conv => 
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) {
      setSearchQuery("");
    }
  };

  const handleNewConversation = () => {
    resetConversation();
    fetchConversations();
  };

  const handleLoadConversation = async (id: string) => {
    setConversationLoading(true);
    const data = await loadConversation(id);
    if (data) {
      loadConv(data.conversation_items, data.chat_messages, id);
      setCurrentConversationId(id);
    }
    setConversationLoading(false);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      const success = await deleteConversation(id);
      if (success) {
        if (currentConversationId === id) {
          resetConversation();
        }
        fetchConversations();
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r">
      {/* User info and logout */}
      <div className="p-4 border-b bg-white">
        {userEmail && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 mb-1 truncate" title={userEmail}>
              Welcome, {userEmail}
            </p>
            {userId && <QueryLimitDisplay userId={userId} />}
            {onLogout && (
              <Button
                onClick={onLogout}
                variant="outline"
                size="sm"
                className="w-full flex items-center gap-2"
              >
                <LogOut size={14} />
                Logout
              </Button>
            )}
          </div>
        )}
        <Button
          onClick={handleNewConversation}
          className="w-full flex items-center gap-2"
          variant="default"
        >
          <Plus size={16} />
          New Conversation
        </Button>
        <Button
          onClick={handleSearchToggle}
          variant="outline"
          size="sm"
          className="w-full flex items-center gap-2 mt-2"
        >
          <Search size={16} />
          {isSearchOpen ? "Hide Search" : "Search Chats"}
        </Button>
      </div>
      
      {/* Search Input */}
      {isSearchOpen && (
        <div className="p-4 border-b bg-white">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center text-gray-500 py-4">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No conversations yet
          </div>
        ) : (
          <>
            {isSearchOpen && searchQuery && (
              <div className="px-3 py-2 text-sm text-gray-500 border-b">
                Found {filteredConversations.length} of {conversations.length} conversations
              </div>
            )}
            <div className="space-y-1">
              {(isSearchOpen && searchQuery ? filteredConversations : conversations).map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleLoadConversation(conv.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                    currentConversationId === conv.id
                      ? "bg-blue-100 border border-blue-300"
                      : "hover:bg-gray-100 border border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare size={14} className="text-gray-400 flex-shrink-0" />
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {conv.title}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500">
                        {format(new Date(conv.updated_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                      title="Delete conversation"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
