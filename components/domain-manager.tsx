"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Edit2, Trash2, Save, X, Database } from "lucide-react";

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

export default function DomainManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load domains
  useEffect(() => {
    loadDomains();
  }, []);

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

  const saveDomain = async (domain: Domain) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/domains/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(domain)
      });
      
      if (response.ok) {
        await loadDomains();
        setEditingDomain(null);
        setIsAddingNew(false);
      }
    } catch (error) {
      console.error('Failed to save domain:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDomain = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return;
    
    try {
      const response = await fetch(`/api/domains/delete/${domainId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadDomains();
      }
    } catch (error) {
      console.error('Failed to delete domain:', error);
    }
  };

  const startEdit = (domain: Domain) => {
    setEditingDomain({ ...domain });
    setIsAddingNew(false);
  };

  const startAddNew = () => {
    setEditingDomain({
      id: '',
      domain: '',
      category: '',
      description: '',
      content_types: [],
      region: 'Global',
      topics: [],
      strengths: [],
      avoid_for: []
    });
    setIsAddingNew(true);
  };

  const cancelEdit = () => {
    setEditingDomain(null);
    setIsAddingNew(false);
  };

  const updateEditingDomain = (field: keyof Domain, value: any) => {
    if (!editingDomain) return;
    
    if (field === 'content_types' || field === 'topics' || field === 'strengths' || field === 'avoid_for') {
      // Handle array fields
      if (typeof value === 'string') {
        const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
        setEditingDomain({ ...editingDomain, [field]: arrayValue });
      }
    } else {
      setEditingDomain({ ...editingDomain, [field]: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Domain Database Management</h3>
        </div>
        <Button onClick={startAddNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Domain
        </Button>
      </div>

      {/* Edit Form */}
      {editingDomain && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isAddingNew ? 'Add New Domain' : `Edit Domain: ${editingDomain.domain}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={editingDomain.domain}
                  onChange={(e) => updateEditingDomain('domain', e.target.value)}
                  placeholder="example.com"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={editingDomain.category}
                  onChange={(e) => updateEditingDomain('category', e.target.value)}
                  placeholder="solar manufacturer"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingDomain.description}
                onChange={(e) => updateEditingDomain('description', e.target.value)}
                placeholder="Brief description of the domain"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={editingDomain.region}
                  onChange={(e) => updateEditingDomain('region', e.target.value)}
                  placeholder="Global"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="content_types">Content Types (comma-separated)</Label>
              <Input
                id="content_types"
                value={editingDomain.content_types.join(', ')}
                onChange={(e) => updateEditingDomain('content_types', e.target.value)}
                placeholder="datasheets, product specs, news"
              />
            </div>

            <div>
              <Label htmlFor="topics">Topics (comma-separated)</Label>
              <Input
                id="topics"
                value={editingDomain.topics.join(', ')}
                onChange={(e) => updateEditingDomain('topics', e.target.value)}
                placeholder="solar panels, monocrystalline, pv modules"
              />
            </div>

            <div>
              <Label htmlFor="strengths">Strengths (comma-separated)</Label>
              <Input
                id="strengths"
                value={editingDomain.strengths.join(', ')}
                onChange={(e) => updateEditingDomain('strengths', e.target.value)}
                placeholder="high efficiency panels, technical specs"
              />
            </div>

            <div>
              <Label htmlFor="avoid_for">Avoid For (comma-separated)</Label>
              <Input
                id="avoid_for"
                value={editingDomain.avoid_for.join(', ')}
                onChange={(e) => updateEditingDomain('avoid_for', e.target.value)}
                placeholder="consumer electronics, small scale"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => saveDomain(editingDomain)} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={cancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            All Domains ({domains.length})
          </CardTitle>
          <CardDescription>
            Manage the domain database used for intelligent web search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {domains.map((domain) => (
              <div key={domain.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{domain.domain}</span>
                    <Badge variant="secondary">{domain.category}</Badge>
                    <Badge variant="outline">{domain.region}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{domain.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {domain.content_types.slice(0, 3).map((type, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                    {domain.content_types.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{domain.content_types.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(domain)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteDomain(domain.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
