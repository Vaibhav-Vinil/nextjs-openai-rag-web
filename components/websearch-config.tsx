"use client";

import React from "react";
import useToolsStore from "@/stores/useToolsStore";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function WebSearchSettings() {
  const { webSearchConfig, setWebSearchConfig } = useToolsStore();

  const handleClear = () => {
    setWebSearchConfig({
      user_location: {
        type: "approximate",
        country: "",
        region: "",
        city: ""
      }
    });
  };

  const handleLocationChange = (
    field: "country" | "region" | "city",
    value: string
  ) => {
    setWebSearchConfig({
      ...webSearchConfig,
      user_location: {
        type: "approximate",
        ...(webSearchConfig.user_location || {}),
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Location Settings</h3>
        <p className="text-sm text-muted-foreground">
          Optionally specify a location for more relevant search results.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Country</label>
          <Input
            type="text"
            value={webSearchConfig.user_location?.country || ""}
            onChange={(e) => handleLocationChange("country", e.target.value)}
            placeholder="e.g., United States"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Region/State</label>
          <Input
            type="text"
            value={webSearchConfig.user_location?.region || ""}
            onChange={(e) => handleLocationChange("region", e.target.value)}
            placeholder="e.g., California"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">City</label>
          <Input
            type="text"
            value={webSearchConfig.user_location?.city || ""}
            onChange={(e) => handleLocationChange("city", e.target.value)}
            placeholder="e.g., San Francisco"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={handleClear}>
          Clear Location
        </Button>
      </div>
    </div>
  );
}
