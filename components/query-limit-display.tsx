"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import { useQuery, useQueryClient } from '@tanstack/react-query';

const fetchQueryLimit = async (userId: string) => {
  const response = await fetch('/api/query-limit', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch query limit');
  }
  
  return await response.json();
};

export default function QueryLimitDisplay({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['queryLimit', userId],
    queryFn: () => fetchQueryLimit(userId),
    enabled: !!userId,
    initialData: { remaining: 5 }, // Initial optimistic value
    refetchInterval: 30000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  
  const remainingQueries = data?.remaining ?? 5;

  // Listen for query response received event and update optimistically
  useEffect(() => {
    const handleQueryResponse = () => {
      // Optimistically update the remaining queries
      queryClient.setQueryData(['queryLimit', userId], (oldData: any) => {
        const current = oldData?.remaining ?? 5;
        const newRemaining = Math.max(0, current - 1);
        console.log('Updating query limit:', { current, newRemaining });
        return { remaining: newRemaining };
      });
      
      // Then refetch to ensure we have the latest data
      queryClient.invalidateQueries({ 
        queryKey: ['queryLimit', userId],
        refetchType: 'active' // Force refetch even if data is fresh
      });
    };
    
    // Listen for both events to ensure we catch all cases
    window.addEventListener('queryResponseReceived', handleQueryResponse);
    window.addEventListener('queryRecorded', handleQueryResponse);
    
    return () => {
      window.removeEventListener('queryResponseReceived', handleQueryResponse);
      window.removeEventListener('queryRecorded', handleQueryResponse);
    };
  }, [userId, queryClient]);

  if (isLoading || !data) {
    return (
      <div className="text-xs text-gray-500 mb-3 text-center">
        Loading query limit...
      </div>
    );
  }

  return (
    <div className="text-xs text-gray-600 mb-3 text-center">
      Remaining queries today: <span className="font-semibold">{remainingQueries}/5</span>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
        <div 
          className={`h-1.5 rounded-full ${
            remainingQueries > 2 ? 'bg-green-500' : remainingQueries > 0 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${(remainingQueries / 5) * 100}%` }}
        />
      </div>
    </div>
  );
}
