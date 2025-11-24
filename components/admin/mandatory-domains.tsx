"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { Select, SelectItem } from "@/components/ui/select";

interface Domain {
  id: string;
  domain: string;
  category: string;
}

export function MandatoryDomains() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [availableDomains, setAvailableDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      setIsLoading(true);
      
      // Get all domains without pagination
      const { data: allDomains, error: domainsError } = await supabase
        .from('domains')
        .select('id, domain, category')
        .order('domain', { ascending: true });

      if (domainsError) throw domainsError;

      // Get mandatory domains
      const { data: mandatoryDomains, error: mandatoryError } = await supabase
        .from('mandatory_search_domains')
        .select('domain_id');

      if (mandatoryError) throw mandatoryError;

      const mandatoryDomainIds = new Set(mandatoryDomains.map(d => d.domain_id));
      
      // Filter out domains that are already marked as mandatory
      const available = allDomains.filter(d => !mandatoryDomainIds.has(d.id));
      
      setAvailableDomains(available);
      
      // Get full domain info for mandatory domains
      if (mandatoryDomainIds.size > 0) {
        const { data: mandatoryDomainsData, error } = await supabase
          .from('domains')
          .select('id, domain, category')
          .in('id', Array.from(mandatoryDomainIds));
          
        if (error) throw error;
        setDomains(mandatoryDomainsData || []);
      } else {
        setDomains([]);
      }
    } catch (error) {
      console.error("Error loading domains:", error);
      toast.error("Failed to load domains. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const addMandatoryDomain = async () => {
    if (!selectedDomain) {
      toast.error("Please select a domain to add");
      return;
    }
    
    try {
      console.log("Attempting to add domain with ID:", selectedDomain);
      
      // First, verify the domain exists
      const { data: domain, error: domainError } = await supabase
        .from('domains')
        .select('id')
        .eq('id', selectedDomain)
        .single();

      if (domainError || !domain) {
        console.error("Domain not found or error:", domainError);
        throw new Error("Selected domain not found");
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("Authentication error:", userError);
        throw new Error("You must be logged in to perform this action");
      }

      // Check if domain is already in the list
      const { data: existing, error: checkError } = await supabase
        .from('mandatory_search_domains')
        .select('id')
        .eq('domain_id', selectedDomain)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking for existing domain:", checkError);
        throw checkError;
      }

      if (existing) {
        throw new Error("This domain is already in the mandatory list");
      }

      // Add the domain
      const { error } = await supabase
        .from('mandatory_search_domains')
        .insert([{ 
          domain_id: selectedDomain,
          created_by: user.id
        }]);

      if (error) {
        console.error("Database insert error:", error);
        throw error;
      }
      
      await loadDomains();
      setSelectedDomain("");
      toast.success("Domain added to mandatory search list");
      
    } catch (error) {
      console.error("Detailed error adding mandatory domain:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add domain. Please try again.");
    }
  };

  const removeMandatoryDomain = async (domainId: string) => {
    try {
      const { error } = await supabase
        .from('mandatory_search_domains')
        .delete()
        .eq('domain_id', domainId);

      if (error) throw error;
      
      await loadDomains();
      
      toast.success("Domain removed from mandatory search list");
    } catch (error) {
      console.error("Error removing mandatory domain:", error);
      toast.error("Failed to remove domain. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading domains...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          disabled={availableDomains.length === 0}
          className="w-full"
        >
          <option value="">
            {availableDomains.length > 0 
              ? "Select a domain to add" 
              : "No domains available to add"}
          </option>
          {availableDomains.map((domain) => (
            <SelectItem key={domain.id} value={domain.id}>
              {domain.domain} ({domain.category})
            </SelectItem>
          ))}
        </Select>
        <Button 
          onClick={addMandatoryDomain}
          disabled={!selectedDomain || availableDomains.length === 0}
        >
          Add
        </Button>
      </div>
      
      <div className="space-y-2">
        <Label>Current Mandatory Domains</Label>
        {domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No domains have been marked as mandatory for search.
          </p>
        ) : (
          <div className="border rounded-md divide-y">
            {domains.map((domain) => (
              <div key={domain.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{domain.domain}</p>
                  <p className="text-sm text-muted-foreground">{domain.category}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMandatoryDomain(domain.id)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remove</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
