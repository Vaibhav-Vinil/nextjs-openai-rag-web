"use client";

import { Globe, Loader2 } from "lucide-react";

interface DomainFilteringStatusProps {
  status: 'in_progress' | 'completed' | 'failed';
  domains?: string[];
}

export default function DomainFilteringStatus({ status, domains = [] }: DomainFilteringStatusProps) {
  return (
    <div className="flex gap-2 items-center text-blue-500 mb-[-16px] ml-[-8px]">
      {status === 'in_progress' ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Globe className="h-4 w-4" />
      )}
      <div className="text-sm font-medium">
        {status === 'in_progress' 
          ? "Filtering domains..."
          : domains.length > 0
            ? `Filtered to ${domains.length} domain${domains.length !== 1 ? 's' : ''}`
            : "No domains filtered"
        }
      </div>
    </div>
  );
}
