"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, CheckCircle } from "lucide-react";

export default function AdminUtilities() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const resetQueryLimits = async () => {
    if (!window.confirm("Are you sure you want to reset query limits for all users? This action cannot be undone.")) {
      console.log('Reset operation cancelled by user');
      return;
    }

    console.log('Starting reset query limits...');
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Admin Utilities</h3>
      
      <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Reset Query Limits</h4>
            <p className="text-sm text-gray-600">
              Reset the daily query limits for all users. This will allow all users to make new queries.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={resetQueryLimits}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset Limits
              </>
            )}
          </Button>
        </div>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
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
    </div>
  );
}
