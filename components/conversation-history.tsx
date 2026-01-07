"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, LogOut, X, Check, Search, Trash2, Share2 } from "lucide-react";
import Image from "next/image";
import QueryLimitDisplay from "./query-limit-display";
import { Conversation, ConversationData, listConversations, deleteConversation, loadConversation, listUserConversationsForAdmin } from "@/lib/conversations";
import useConversationStore from "@/stores/useConversationStore";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface ConversationHistoryProps {
  userEmail?: string;
  userId?: string;
  displayName?: string;
  onLogout?: () => void;
  publicView?: boolean;
  // When set (admin view), only show this user's conversations
  adminViewUserId?: string | null;
}

export default function ConversationHistory({ userEmail, userId, displayName, onLogout, publicView, adminViewUserId }: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const limit = 20;

  const { currentConversationId, resetConversation, loadConversation: loadConv, setCurrentConversationId, setConversationLoading } = useConversationStore();
  const router = useRouter();
  const observerTarget = useRef(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchConversations = useCallback(async (currentOffset: number, query: string, isInitial: boolean = false) => {
    if (isInitial) {
      setLoading(true);
      setOffset(0); // Reset offset for initial/new search
      setHasMore(true); // Assume more until proven otherwise
    } else {
      setLoadingMore(true);
    }

    try {
      let convs: Conversation[] = [];
      if (adminViewUserId) {
        convs = await listUserConversationsForAdmin(adminViewUserId, limit, currentOffset, query);
      } else {
        convs = await listConversations(limit, currentOffset, query);
      }

      if (isInitial) {
        setConversations(convs);
      } else {
        setConversations(prev => [...prev, ...convs]);
      }

      setHasMore(convs.length === limit);
      setOffset(currentOffset + convs.length);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [adminViewUserId, limit]);

  // Initial load and Search reset
  useEffect(() => {
    if (publicView && !userEmail) {
      setLoading(false);
      return;
    }
    fetchConversations(0, debouncedQuery, true);
  }, [debouncedQuery, publicView, userEmail, fetchConversations]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchConversations(offset, debouncedQuery);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, offset, debouncedQuery, fetchConversations]);

  const handleNewConversation = useCallback(() => {
    if (adminViewUserId) return;
    if (publicView && !userEmail) {
      router.push('/signup');
      return;
    }
    resetConversation();
    fetchConversations(0, debouncedQuery, true);
  }, [adminViewUserId, publicView, userEmail, resetConversation, fetchConversations, debouncedQuery, router]);

  const handleLoadConversation = async (id: string) => {
    setConversationLoading(true);
    try {
      const isAdminView = !!adminViewUserId;
      const data = await loadConversation(id, isAdminView);
      if (data) {
        loadConv(data.conversation_items, data.chat_messages, id);
        setCurrentConversationId(id);
      } else {
        console.error('Failed to load conversation data');
      }
    } catch (error) {
      console.error('Error in handleLoadConversation:', error);
    } finally {
      setConversationLoading(false);
    }
  };

  const [sharedConversationId, setSharedConversationId] = useState<string | null>(null);

  const handleShareConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Mark conversation as publicly shareable
      await fetch(`/api/conversations/${conversationId}/share`, {
        method: 'POST'
      });

      const shareUrl = `${window.location.origin}?conv=${conversationId}&public=true`;
      await navigator.clipboard.writeText(shareUrl);
      setSharedConversationId(conversationId);
      setTimeout(() => setSharedConversationId(null), 2000);
    } catch (error) {
      console.error('Error sharing conversation:', error);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      const success = await deleteConversation(id);
      if (success) {
        if (currentConversationId === id) {
          resetConversation();
        }
        fetchConversations(0, debouncedQuery, true);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* User info and logout */}
      <div className="p-4 flex-shrink-0">
        {userEmail && (
          <div className="mb-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
            <div className="flex flex-col items-center px-3 pt-1 pb-3">
              <div className="w-full px-2">
                <div className="relative w-full" style={{ paddingBottom: '50%' }}>
                  <Image
                    src="/PvChatbot-logo.png"
                    alt="pvAI Logo"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    style={{ objectFit: 'contain' }}
                    priority
                  />
                </div>
              </div>
              <div className="w-full text-center">
                <p className="text-sm text-black break-words">
                  Welcome,<br />
                  <span className="font-medium text-black" title={displayName || userEmail}>
                    {displayName || userEmail?.split('@')[0]}
                  </span>
                </p>
              </div>
            </div>
            {userId && <QueryLimitDisplay />}
            {onLogout && (
              <div className="px-3 pb-3">
                <Button
                  onClick={onLogout}
                  variant="ghost"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2 text-black/80 hover:text-black bg-black/5 backdrop-blur-sm border border-black/10 hover:bg-black/10 hover:border-black/20 mt-2 transition-colors"
                >
                  <LogOut size={14} />
                  Logout
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Search Input - Always Visible */}
        <div className="mb-3">
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full z-10">
              <Search size={14} className="text-white" />
            </div>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-black/5 backdrop-blur-sm border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-transparent text-black placeholder-gray-500"
            />
            {(searchQuery || loading) && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                {loading && <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-black/40 hover:text-black/80 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {!adminViewUserId && (
          <Button
            onClick={handleNewConversation}
            className="w-full flex items-center gap-2 bg-black/5 backdrop-blur-sm border border-black/10 hover:bg-black/10 hover:border-black/20 text-black/80 hover:text-black transition-all"
            variant="outline"
          >
            <Plus size={16} />
            New Conversation
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
        {loading && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-6 h-6 border-2 border-black/10 border-t-black rounded-full animate-spin" />
            <div className="text-sm text-gray-500">Loading history...</div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-gray-500 py-10 px-4">
            {searchQuery ? "No matches found." : "No conversations yet."}
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleLoadConversation(conv.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all group ${currentConversationId === conv.id
                    ? "bg-blue-500/30 backdrop-blur-md text-black border border-blue-400/30 shadow-md"
                    : "bg-white/5 backdrop-blur-sm text-black/80 border border-white/5 hover:bg-white/10 hover:border-white/10 hover:backdrop-blur-md hover:shadow-md"
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare size={14} className="text-gray-600 flex-shrink-0" />
                      <h3 className="text-sm font-medium truncate">
                        {conv.title}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-700">
                      {format(new Date(conv.updated_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  {!adminViewUserId && (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => handleShareConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-md hover:bg-blue-500/20 backdrop-blur-sm hover:backdrop-blur-md text-black"
                        title={sharedConversationId === conv.id ? "Link copied!" : "Share conversation"}
                      >
                        {sharedConversationId === conv.id ? (
                          <Check size={14} className="text-green-400" />
                        ) : (
                          <Share2 size={14} className="text-blue-400" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id, e);
                        }}
                        className="text-gray-600 hover:text-black hover:bg-red-500/20 p-1.5 -mr-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm hover:backdrop-blur-md"
                        title="Delete conversation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="h-10 flex items-center justify-center">
              {loadingMore && (
                <div className="w-4 h-4 border-2 border-black/10 border-t-black rounded-full animate-spin" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
