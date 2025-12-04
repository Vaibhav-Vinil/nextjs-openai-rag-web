"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Brain, Globe, Settings, Play } from "lucide-react";

interface Domain {
  id: string;
  domain: string;
  category: string;
  description: string;
  content_types: string[];
  region: string;
  topics: string[];
  strengths: string[];
  avoid_for: string[];
}

interface DomainSelectionConfig {
  max_domains: number;
  preferred_regions: string[];
  exclude_categories: string[];
  enable_semantic_search: boolean;
  weighting_config: {
    brand_mention_weight: number;
    content_type_match_weight: number;
    semantic_similarity_weight: number;
  };
}

const defaultConfig: DomainSelectionConfig = {
  max_domains: 5,
  preferred_regions: ['Global'],
  exclude_categories: [],
  enable_semantic_search: true,
  weighting_config: {
    brand_mention_weight: 0.4,
    content_type_match_weight: 0.5,
    semantic_similarity_weight: 0.1
  }
};

export default function DomainSelectorTool() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [testQuery, setTestQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectionResults, setSelectionResults] = useState<Domain[]>([]);
  const [config, setConfig] = useState<DomainSelectionConfig>(defaultConfig);

  // Load domains from API
  useEffect(() => {
    const loadDomains = async () => {
      try {
        const response = await fetch('/api/domains/list');
        if (response.ok) {
          const data = await response.json();
          setDomains(data);
        }
      } catch (error) {
        console.error('Failed to load domains:', error);
      }
    };
    loadDomains();
  }, []);

  // Test domain selection
  const testDomainSelection = async () => {
    if (!testQuery.trim()) return;
    
    setIsLoading(true);
    setSelectionResults([]);
    setSelectedDomains([]);
    
    try {
      console.log('Sending request to /api/domains/select with query:', testQuery);
      const response = await fetch('/api/domains/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery,
          domains: domains,
          config: config
        })
      });
      
      const responseData = await response.json();
      console.log('Received response:', responseData);
      
      if (response.ok) {
        // The API returns an array of domain objects
        if (Array.isArray(responseData)) {
          console.log('Setting selection results (array format):', responseData);
          setSelectionResults(responseData);
          setSelectedDomains(responseData.map((d: Domain) => d.domain));
        } else if (responseData.selected_domains) {
          // Handle the case where the response has a selected_domains property
          console.log('Setting selection results (selected_domains format):', responseData.selected_domains);
          setSelectionResults(responseData.selected_domains);
          setSelectedDomains(responseData.selected_domains.map((d: Domain) => d.domain));
        } else {
          console.error('Unexpected response format:', responseData);
        }
      } else {
        console.error('Domain selection failed:', response.status, responseData);
      }
    } catch (error) {
      console.error('Domain selection failed:', error);
    } finally {
      console.log('Finished domain selection, loading set to false');
      setIsLoading(false);
    }
  };

  // Save configuration
  const saveConfig = async () => {
    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain_selector_config: config
        })
      });
      
      if (response.ok) {
        // Show success message
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const categories = [...new Set(domains.map(d => d.category))];
  const regions = [...new Set(domains.map(d => d.region))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Domain Selector Tool</h3>
      </div>

      {/* Test Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Test Domain Selection
          </CardTitle>
          <CardDescription>
            Test how the AI selects relevant domains for different queries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a test query (e.g., 'high-efficiency solar panels for residential use')"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={testDomainSelection} 
              disabled={!testQuery.trim() || isLoading}
            >
              {isLoading ? 'Analyzing...' : 'Test Selection'}
            </Button>
          </div>

          {selectionResults.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Domains ({selectionResults.length})</Label>
              <div className="space-y-2">
                {selectionResults.map((domain, index) => (
                  <div key={domain.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <Badge variant="secondary">{domain.domain}</Badge>
                    <Badge variant="outline">{domain.category}</Badge>
                    <span className="text-sm text-gray-600">{domain.description}</span>
                    <Badge variant="outline" className="ml-auto">
                      {domain.region}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Selection Configuration
          </CardTitle>
          <CardDescription>
            Configure how domains are selected and ranked
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max_domains">Maximum Domains</Label>
              <Input
                id="max_domains"
                type="number"
                min="1"
                max="20"
                value={config.max_domains}
                onChange={(e) => setConfig(prev => ({ ...prev, max_domains: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <Label>Preferred Regions</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {regions.map(region => (
                <Badge
                  key={region}
                  variant={config.preferred_regions.includes(region) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setConfig(prev => ({
                      ...prev,
                      preferred_regions: prev.preferred_regions.includes(region)
                        ? prev.preferred_regions.filter(r => r !== region)
                        : [...prev.preferred_regions, region]
                    }));
                  }}
                >
                  {region}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Exclude Categories</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {categories.map(category => (
                <Badge
                  key={category}
                  variant={config.exclude_categories.includes(category) ? "destructive" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setConfig(prev => ({
                      ...prev,
                      exclude_categories: prev.exclude_categories.includes(category)
                        ? prev.exclude_categories.filter(c => c !== category)
                        : [...prev.exclude_categories, category]
                    }));
                  }}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="semantic_search"
              checked={config.enable_semantic_search}
              onCheckedChange={(checked: boolean) => setConfig(prev => ({ ...prev, enable_semantic_search: checked }))}
            />
            <Label htmlFor="semantic_search">Enable Semantic Search</Label>
          </div>

          <div className="space-y-2">
            <Label>Weighting Configuration</Label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Brand Mention</span>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.weighting_config.brand_mention_weight}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    weighting_config: {
                      ...prev.weighting_config,
                      brand_mention_weight: parseFloat(e.target.value)
                    }
                  }))}
                  className="w-20"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Content Type Match</span>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.weighting_config.content_type_match_weight}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    weighting_config: {
                      ...prev.weighting_config,
                      content_type_match_weight: parseFloat(e.target.value)
                    }
                  }))}
                  className="w-20"
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Semantic Similarity</span>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.weighting_config.semantic_similarity_weight}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    weighting_config: {
                      ...prev.weighting_config,
                      semantic_similarity_weight: parseFloat(e.target.value)
                    }
                  }))}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          <Button onClick={saveConfig} className="w-full">
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Domain List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Domain Database ({domains.length})
          </CardTitle>
          <CardDescription>
            All available domains with their metadata
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {domains.map(domain => (
              <div key={domain.id} className="flex items-center gap-2 p-2 border rounded">
                <Badge variant={selectedDomains.includes(domain.domain) ? "default" : "outline"}>
                  {domain.domain}
                </Badge>
                <Badge variant="secondary">{domain.category}</Badge>
                <Badge variant="outline">{domain.region}</Badge>
                <span className="text-sm text-gray-600 truncate flex-1">
                  {domain.description}
                </span>
                <Badge variant="outline">
                  {domain.region}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
