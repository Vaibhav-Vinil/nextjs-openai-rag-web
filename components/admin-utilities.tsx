"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, CheckCircle } from "lucide-react";

export default function AdminUtilities() {
  const [isUpdatingCatalog, setIsUpdatingCatalog] = useState(false);
  const [isResettingLimits, setIsResettingLimits] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const updateCatalog = async () => {
    if (!window.confirm("Are you sure you want to update the product catalog? This will fetch the latest data and update the vector store.")) {
      console.log('Catalog update cancelled by user');
      return;
    }

    console.log('Starting catalog update...');
    setIsUpdatingCatalog(true);
    setResult(null);

    try {
      console.log('Sending request to update catalog...');
      const response = await fetch("/admin/api/update-catalog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin"
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update catalog');
      }

      console.log('Catalog update successful:', data);
      setResult({
        success: true,
        message: data.message || 'Catalog updated successfully!'
      });
    } catch (error) {
      console.error('Error updating catalog:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update catalog'
      });
    } finally {
      setIsUpdatingCatalog(false);
    }
  };

  const resetQueryLimits = async () => {
    if (!window.confirm("Are you sure you want to reset query limits for all users? This action cannot be undone.")) {
      console.log('Reset operation cancelled by user');
      return;
    }

    console.log('Starting reset query limits...');
    setIsResettingLimits(true);
    setResult(null);

    try {
      console.log('Sending request to reset query limits...');
      const response = await fetch("/api/admin/reset-query-limits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin"
      });

      console.log('Response status:', response.status);
      const data = await response.json();

      if (!response.ok) {
        console.error('Error response:', data);
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      console.log('Reset successful:', data);
      
      // Show success message
      setResult({
        success: true,
        message: data.message || "Query limits reset successfully!"
      });

      // Trigger a refresh of the query limit display
      window.dispatchEvent(new CustomEvent('queryLimitReset', {
        detail: { timestamp: new Date().toISOString() }
      }));
    } catch (error) {
      console.error("Error in resetQueryLimits:", error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      console.log('Reset operation completed');
      setIsResettingLimits(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Admin Utilities</h3>
      
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Product Catalog</h4>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Button
            variant="outline"
            onClick={updateCatalog}
            disabled={isUpdatingCatalog || isResettingLimits}
            className="w-full sm:w-auto"
          >
            {isUpdatingCatalog ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Update Product Catalog
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            Fetch the latest product data and update the vector store. This may take a few minutes.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">User Management</h4>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Button
            variant="outline"
            onClick={resetQueryLimits}
            disabled={isResettingLimits || isUpdatingCatalog}
            className="w-full sm:w-auto"
          >
            {isResettingLimits ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Reset Query Limits for All Users"
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            Reset the query limits for all users. Use this if you've updated the rate limiting configuration.
          </p>
        </div>
      </div>

      {result && (
        <Alert 
          variant={result.success ? "default" : "destructive"}
          className="mt-4"
        >
          <div className="flex items-start">
            {result.success ? (
              <CheckCircle className="h-4 w-4 mt-1 mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-1 mr-2" />
            )}
            <div>
              <AlertTitle className="flex items-center">
                {result.success ? "Success" : "Error"}
              </AlertTitle>
              <AlertDescription className="mt-1">
                {result.message}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}
