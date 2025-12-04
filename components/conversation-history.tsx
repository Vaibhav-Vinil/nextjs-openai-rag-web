"use client";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, LogOut, X, Check, Search, Trash2, Share2 } from "lucide-react";
import QueryLimitDisplay from "./query-limit-display";
import { Conversation, ConversationData, listConversations, deleteConversation, loadConversation } from "@/lib/conversations";
import useConversationStore from "@/stores/useConversationStore";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface ConversationHistoryProps {
  userEmail?: string;
  userId?: string;
  onLogout?: () => void;
  publicView?: boolean;
}

export default function ConversationHistory({ userEmail, userId, onLogout, publicView }: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { currentConversationId, resetConversation, loadConversation: loadConv, setCurrentConversationId, setConversationLoading } = useConversationStore();

  const fetchConversations = async () => {
    setLoading(true);
    const convs = await listConversations();
    setConversations(convs);
    setLoading(false);
  };

    const router = useRouter();

    useEffect(() => {
      // If this is a public view and there is no authenticated user,
      // skip fetching protected conversation lists to avoid 401s.
      if (publicView && !userEmail) {
        setLoading(false);
        return;
      }

      fetchConversations();
    }, [publicView, userEmail]);

  // Search state with caching
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const [searchCache] = useState<Map<string, ConversationData>>(new Map());
  const [foundInTitles, setFoundInTitles] = useState<Conversation[]>([]);
  const [foundInContent, setFoundInContent] = useState<Conversation[]>([]);

  // Debounced search with caching and incremental results
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setFoundInTitles([]);
      setFoundInContent([]);
      return;
    }

    const search = async () => {
      const query = searchQuery.toLowerCase();
      const searchStartTime = Date.now();
      setIsSearching(true);
      setFoundInTitles([]);
      setFoundInContent([]);
      
      // First pass: title search (instant)
      const titleMatches = conversations.filter(conv => 
        conv.title.toLowerCase().includes(query)
      );
      
      // Show title matches immediately
      setFoundInTitles(titleMatches);
      
      // Second pass: content search for conversations not already matched
      const remainingConversations = conversations.filter(conv => 
        !titleMatches.some(match => match.id === conv.id)
      );
      
      // Process in batches to avoid blocking UI
      const batchSize = 5;
      const contentMatches: Conversation[] = [];
      
      for (let i = 0; i < remainingConversations.length; i += batchSize) {
        const batch = remainingConversations.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (conv) => {
            try {
              // Check cache first
              if (searchCache.has(conv.id)) {
                const cachedData = searchCache.get(conv.id)!;
                return searchInContent(cachedData, query) ? conv : null;
              }
              
              // Load from API if not in cache
              const convData = await loadConversation(conv.id);
              if (convData) {
                searchCache.set(conv.id, convData);
                return searchInContent(convData, query) ? conv : null;
              }
              return null;
            } catch (error) {
              console.error('Error searching conversation:', error);
              return null;
            }
          })
        );
        
        // Add found conversations to content matches
        const newMatches = batchResults.filter(Boolean) as Conversation[];
        if (newMatches.length > 0) {
          contentMatches.push(...newMatches);
          setFoundInContent(prev => [...prev, ...newMatches]);
        }
        
        // Small delay to allow UI updates between batches
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      // Ensure we don't show stale results if the search was cancelled
      if (Date.now() - searchStartTime < 1000 || searchQuery === '') {
        return;
      }
      
      setIsSearching(false);
    };
    
    searchTimeoutRef.current = setTimeout(search, 200); // Shorter debounce for better responsiveness

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, conversations, searchCache]);
  
  // Combine title and content matches, removing duplicates
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Combine results, ensuring no duplicates
    const combined = [...new Map([...foundInTitles, ...foundInContent].map(item => [item.id, item])).values()];
    setSearchResults(combined);
  }, [foundInTitles, foundInContent, searchQuery]);

  // Helper function to search in conversation content
  const searchInContent = (convData: ConversationData, query: string): boolean => {
    if (!convData.chat_messages) return false;
    
    return convData.chat_messages.some((message: any) => {
      if (message.type === 'message' && message.content) {
        const messageText = message.content
          .map((item: any) => item.text || '')
          .join(' ')
          .toLowerCase();
        return messageText.includes(query);
      }
      return false;
    });
  };

  const handleNewConversation = () => {
    // If this is a public/shared view and the visitor is not signed in,
    // prompt them to sign up instead of attempting to fetch or create
    // protected resources which would result in 401 errors.
    if (publicView && !userEmail) {
      // Redirect to signup page
      router.push('/signup');
      return;
    }

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
        fetchConversations();
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* User info and logout */}
      <div className="p-4">
        {userEmail && (
          <div className="mb-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
            <div className="flex justify-center w-full">
              <img 
                src="/PvChatbot-logo.png" 
                alt="PV Chatbot Logo" 
                className="w-24 h-24 object-contain p-1"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
            <div className="px-3 pb-3">
              <p className="text-sm text-black truncate text-center" title={userEmail}>
                Welcome, <span className="font-medium text-black">{userEmail}</span>
              </p>
            </div>
            {userId && <QueryLimitDisplay />}
            {onLogout && (
              <div className="px-3 pb-3">
                <Button
                  onClick={onLogout}
                  variant="ghost"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2 text-black/80 hover:text-black bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 mt-2"
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
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent text-black placeholder-gray-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black/40 hover:text-black/80 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        
        <Button
          onClick={handleNewConversation}
          className="w-full flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 text-black/80 hover:text-black transition-all"
          variant="outline"
        >
          <Plus size={16} />
          New Conversation
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
        {loading ? (
          <div className="text-center text-gray-700 py-4">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-gray-700 py-4">
            No conversations yet
          </div>
        ) : (
          <>
            {searchQuery && (
              <div className="px-3 py-2 text-sm text-white/80">
                {isSearching ? (
                  <span>Searching...</span>
                ) : (
                  <span>Found {searchResults.length} of {conversations.length} conversations</span>
                )}
              </div>
            )}
            <div className="space-y-1">
              {(searchQuery ? searchResults : conversations).map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleLoadConversation(conv.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all group ${
                    currentConversationId === conv.id
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
                        {/* TODO: Add shareable indicator if conv.is_publicly_shareable */}
                      </div>
                      <p className="text-xs text-gray-700">
                        {format(new Date(conv.updated_at), "MMM d, h:mm a")}
                      </p>
                    </div>
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
