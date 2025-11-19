"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Globe, Plus, Edit, Trash2, Search, Filter, 
  ChevronLeft, ChevronRight, Save, X, Check,
  AlertCircle, RefreshCw
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Domain {
  id: string;
  domain: string;
  category: string;
  description?: string;
  content_types: string[];
  region: string;
  topics: string[];
  strengths: string[];
  avoid_for: string[];
  created_at: string;
  updated_at: string;
}

interface Filters {
  categories: string[];
  regions: string[];
}

interface PaginatedResponse {
  domains: Domain[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function DomainsManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [filters, setFilters] = useState<Filters>({ categories: [], regions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDomains, setTotalDomains] = useState(0);
  const limit = 50;

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");

  // Form state for create/edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [formData, setFormData] = useState({
    domain: "",
    category: "",
    description: "",
    content_types: [] as string[],
    region: "Global",
    topics: [] as string[],
    strengths: [] as string[],
    avoid_for: [] as string[]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load domains and filters
  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadDomains();
  }, [currentPage, searchTerm, selectedCategory, selectedRegion]);

  const loadFilters = async () => {
    try {
      const response = await fetch('/api/admin/domains/filters');
      if (response.ok) {
        const data = await response.json();
        setFilters(data);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  const loadDomains = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString()
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedRegion) params.append('region', selectedRegion);

      const response = await fetch(`/api/admin/domains?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load domains');
      }

      const data: PaginatedResponse = await response.json();
      console.log('API Response:', data); // Debug log
      console.log('Domains count:', data.domains?.length);
      console.log('Total pages:', data.pagination?.totalPages);
      console.log('Total domains:', data.pagination?.total);
      console.log('Current page:', currentPage);
      setDomains(data.domains);
      setTotalPages(data.pagination.totalPages);
      setTotalDomains(data.pagination.total);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load domains');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingDomain(null);
    setFormData({
      domain: "",
      category: "",
      description: "",
      content_types: [],
      region: "Global",
      topics: [],
      strengths: [],
      avoid_for: []
    });
    setIsFormOpen(true);
    setFormMessage(null);
  };

  const handleEdit = (domain: Domain) => {
    setEditingDomain(domain);
    setFormData({
      domain: domain.domain,
      category: domain.category,
      description: domain.description || "",
      content_types: domain.content_types,
      region: domain.region,
      topics: domain.topics,
      strengths: domain.strengths,
      avoid_for: domain.avoid_for
    });
    setIsFormOpen(true);
    setFormMessage(null);
  };

  const handleDelete = async (domain: Domain) => {
    if (!window.confirm(`Are you sure you want to delete "${domain.domain}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/domains/${domain.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete domain');
      }

      await loadDomains();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete domain');
    }
  };

  const handleSave = async () => {
    if (!formData.domain || !formData.category) {
      setFormMessage({ type: 'error', message: 'Domain and category are required' });
      return;
    }

    setIsSaving(true);
    setFormMessage(null);

    try {
      const url = editingDomain 
        ? `/api/admin/domains/${editingDomain.id}`
        : '/api/admin/domains';
      
      const method = editingDomain ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save domain');
      }

      setFormMessage({ type: 'success', message: `Domain ${editingDomain ? 'updated' : 'created'} successfully!` });
      
      setTimeout(() => {
        setIsFormOpen(false);
        loadDomains();
      }, 1500);

    } catch (error) {
      setFormMessage({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save domain' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleArrayInput = (field: 'content_types' | 'topics' | 'strengths' | 'avoid_for', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  const getArrayString = (items: string[]) => items.join(', ');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Domains Management</h3>
          <Badge variant="outline">{totalDomains} total</Badge>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Domain
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search domains..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <SelectItem value="">All categories</SelectItem>
                {filters.categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="region">Region</Label>
              <Select 
                value={selectedRegion} 
                onChange={(e) => setSelectedRegion(e.target.value)}
              >
                <SelectItem value="">All regions</SelectItem>
                {filters.regions.map(region => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("");
                  setSelectedRegion("");
                  setCurrentPage(1);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Domains List */}
      <Card>
        <CardHeader>
          <CardTitle>Domains ({domains.length})</CardTitle>
          <CardDescription>
            Showing page {currentPage} of {totalPages} ({totalDomains} total domains)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-2">Loading domains...</p>
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 mx-auto text-gray-300" />
              <p className="text-gray-500 mt-2">No domains found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {domains.map(domain => (
                <div key={domain.id} className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{domain.domain}</Badge>
                      <Badge variant="secondary">{domain.category}</Badge>
                      <Badge variant="outline">{domain.region}</Badge>
                    </div>
                    {domain.description && (
                      <p className="text-sm text-gray-600 line-clamp-1">{domain.description}</p>
                    )}
                    {domain.content_types.length > 0 && (
                      <span className="text-xs text-gray-500">
                        Types: {domain.content_types.join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(domain)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(domain)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages || 1} (Total: {totalDomains || 0})
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages || 1, prev + 1))}
              disabled={currentPage === (totalPages || 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {editingDomain ? 'Edit Domain' : 'Create Domain'}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formMessage && (
                <Alert variant={formMessage.type === 'error' ? 'destructive' : 'default'}>
                  {formMessage.type === 'success' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{formMessage.message}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="domain">Domain *</Label>
                  <Input
                    id="domain"
                    value={formData.domain}
                    onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                    placeholder="example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={formData.category} 
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <SelectItem value="">Select category</SelectItem>
                    {filters.categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the domain..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="region">Region</Label>
                  <Select 
                    value={formData.region} 
                    onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                  >
                    {filters.regions.map(region => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

              </div>

              <div>
                <Label htmlFor="content_types">Content Types (comma-separated)</Label>
                <Input
                  id="content_types"
                  value={getArrayString(formData.content_types)}
                  onChange={(e) => handleArrayInput('content_types', e.target.value)}
                  placeholder="articles, videos, research"
                />
              </div>

              <div>
                <Label htmlFor="topics">Topics (comma-separated)</Label>
                <Input
                  id="topics"
                  value={getArrayString(formData.topics)}
                  onChange={(e) => handleArrayInput('topics', e.target.value)}
                  placeholder="technology, science, health"
                />
              </div>

              <div>
                <Label htmlFor="strengths">Strengths (comma-separated)</Label>
                <Input
                  id="strengths"
                  value={getArrayString(formData.strengths)}
                  onChange={(e) => handleArrayInput('strengths', e.target.value)}
                  placeholder="research, expert-written, peer-reviewed"
                />
              </div>

              <div>
                <Label htmlFor="avoid_for">Avoid For (comma-separated)</Label>
                <Input
                  id="avoid_for"
                  value={getArrayString(formData.avoid_for)}
                  onChange={(e) => handleArrayInput('avoid_for', e.target.value)}
                  placeholder="medical-advice, legal-advice"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {editingDomain ? 'Update' : 'Create'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
