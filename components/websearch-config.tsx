"use client";

import React, { useState, useEffect } from "react";
import useToolsStore from "@/stores/useToolsStore";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { X, Plus } from "lucide-react";
import CountrySelector from "./country-selector";

export default function WebSearchSettings() {
  const { webSearchConfig, setWebSearchConfig } = useToolsStore();

  const [newDomain, setNewDomain] = useState("");

  // Sync domains with the server
  const syncDomains = async () => {
    try {
      const response = await fetch('/api/domains/shared');
      if (response.ok) {
        const { domains } = await response.json();
        setWebSearchConfig({
          ...webSearchConfig,
          filters: {
            ...webSearchConfig.filters,
            allowed_domains: domains || []
          }
        });
      }
    } catch (error) {
      console.error("Error syncing domains:", error);
    }
  };

  useEffect(() => {
    syncDomains();
    const interval = setInterval(syncDomains, 10000); // Sync every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleClear = async () => {
    try {
      await fetch('/api/domains/shared', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: [] })
      });
      
      setWebSearchConfig({
        user_location: {
          type: "approximate",
          country: "",
          region: "",
          city: "",
        },
        filters: {
          allowed_domains: []
        }
      });
    } catch (error) {
      console.error("Error clearing domains:", error);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    
    const domain = newDomain.trim().replace(/^https?:\/\//, '').split('/')[0];
    const currentDomains = webSearchConfig.filters?.allowed_domains || [];
    
    if (!currentDomains.includes(domain)) {
      const updatedDomains = [...currentDomains, domain].slice(0, 20);
      
      try {
        const response = await fetch('/api/domains/shared', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domains: updatedDomains })
        });
        
        if (response.ok) {
          setWebSearchConfig({
            ...webSearchConfig,
            filters: {
              ...webSearchConfig.filters,
              allowed_domains: updatedDomains
            }
          });
          setNewDomain("");
        }
      } catch (error) {
        console.error("Error adding domain:", error);
      }
    }
  };

  const handleRemoveDomain = async (domainToRemove: string) => {
    const currentDomains = webSearchConfig.filters?.allowed_domains || [];
    const updatedDomains = currentDomains.filter(domain => domain !== domainToRemove);
    
    try {
      const response = await fetch('/api/domains/shared', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: updatedDomains })
      });
      
      if (response.ok) {
        setWebSearchConfig({
          ...webSearchConfig,
          filters: {
            ...webSearchConfig.filters,
            allowed_domains: updatedDomains
          }
        });
      }
    } catch (error) {
      console.error("Error removing domain:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDomain();
    }
  };

  const handleLocationChange = (
    field: "country" | "region" | "city",
    value: string
  ) => {
    setWebSearchConfig({
      ...webSearchConfig,
      user_location: {
        type: "approximate",
        ...webSearchConfig.user_location,
        [field]: value,
      },
    });
  };

  const handleMaxDomainsChange = (value: number) => {
    const v = Math.min(20, Math.max(1, Math.floor(value || 0)));
    setWebSearchConfig({
      ...webSearchConfig,
      max_domains: v,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-zinc-600 text-sm">User&apos;s location</div>
        <div
          className="text-zinc-400 text-sm px-1 transition-colors hover:text-zinc-600 cursor-pointer"
          onClick={handleClear}
        >
          Clear
        </div>
      </div>
      <div className="mt-3 space-y-3 text-zinc-400">
        <div className="flex items-center gap-2">
          <label htmlFor="country" className="text-sm w-20">
            Country
          </label>
          <CountrySelector
            value={webSearchConfig.user_location?.country ?? ""}
            onChange={(value) => handleLocationChange("country", value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="region" className="text-sm w-20">
            Region
          </label>
          <Input
            id="region"
            type="text"
            placeholder="Region"
            className="bg-white border text-sm flex-1 text-zinc-900 placeholder:text-zinc-400"
            value={webSearchConfig.user_location?.region ?? ""}
            onChange={(e) => handleLocationChange("region", e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="city" className="text-sm w-20">
            City
          </label>
          <Input
            id="city"
            type="text"
            placeholder="City"
            className="bg-white border text-sm flex-1 text-zinc-900 placeholder:text-zinc-400"
            value={webSearchConfig.user_location?.city ?? ""}
            onChange={(e) => handleLocationChange("city", e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-zinc-600 text-sm">Domain selection</div>
          <div className="text-xs text-zinc-400">Max domains: {webSearchConfig.max_domains ?? 5}</div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm w-20">Max</label>
          <input
            type="number"
            min={1}
            max={20}
            value={webSearchConfig.max_domains ?? 5}
            onChange={(e) => handleMaxDomainsChange(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm w-24"
          />
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-zinc-600 text-sm">Allowed Domains</div>
          <div className="text-xs text-zinc-400">
            {webSearchConfig.filters?.allowed_domains?.length || 0}/20 domains
          </div>
        </div>
        
        <div className="flex gap-2 mb-2">
          <Input
            type="text"
            placeholder="example.com"
            className="flex-1 text-sm"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={handleAddDomain}
            disabled={!newDomain.trim() || (webSearchConfig.filters?.allowed_domains?.length || 0) >= 20}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {webSearchConfig.filters?.allowed_domains?.map((domain) => (
            <div 
              key={domain} 
              className="flex items-center justify-between bg-zinc-50 px-3 py-2 rounded text-sm"
            >
              <span className="text-zinc-800">{domain}</span>
              <button 
                onClick={() => handleRemoveDomain(domain)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
                aria-label={`Remove ${domain}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          
          {(!webSearchConfig.filters?.allowed_domains?.length) && (
            <div className="text-center text-sm text-zinc-400 py-2">
              No domains added. Web search will use all domains.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
