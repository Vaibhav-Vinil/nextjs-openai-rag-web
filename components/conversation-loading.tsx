"use client";

import { Loader2 } from "lucide-react";

export default function ConversationLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-transparent backdrop-blur-sm z-10">
      <div className="flex flex-col items-center justify-center space-y-3 bg-white/80 dark:bg-gray-800/80 rounded-lg p-6 shadow-lg">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-gray-500 dark:text-gray-300 text-sm animate-pulse">Loading conversation...</p>
      </div>
    </div>
  );
}
