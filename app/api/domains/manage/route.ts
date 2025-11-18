import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const manageDomainsSchema = z.object({
  action: z.enum(["add", "remove", "list", "clear"]),
  domain: z.string().optional(),
  domains: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, domain, domains } = manageDomainsSchema.parse(body);

    const supabase = await createClient();

    switch (action) {
      case "list": {
        // Get all domains from the table
        const { data: domainsList, error } = await supabase
          .from("domains")
          .select("domain")
          .order("domain");

        if (error) {
          console.error("Error fetching domains:", error);
          return NextResponse.json({ error: "Failed to fetch domains" }, { status: 500 });
        }

        const domainStrings = domainsList?.map(d => d.domain) || [];
        return NextResponse.json({ domains: domainStrings });
      }

      case "add": {
        if (!domain) {
          return NextResponse.json({ error: "Domain is required for add action" }, { status: 400 });
        }

        // Check if domain already exists
        const { data: existing } = await supabase
          .from("domains")
          .select("domain")
          .eq("domain", domain)
          .single();

        if (existing) {
          return NextResponse.json({ error: "Domain already exists" }, { status: 409 });
        }

        // Add new domain with default values
        const { error } = await supabase
          .from("domains")
          .insert({
            domain,
            category: "user-added",
            description: `User-added domain: ${domain}`,
            content_types: ["general"],
            region: "Global",
            topics: [],
            strengths: [],
            avoid_for: []
          });

        if (error) {
          console.error("Error adding domain:", error);
          return NextResponse.json({ error: "Failed to add domain" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Domain added successfully" });
      }

      case "remove": {
        if (!domain) {
          return NextResponse.json({ error: "Domain is required for remove action" }, { status: 400 });
        }

        const { error } = await supabase
          .from("domains")
          .delete()
          .eq("domain", domain);

        if (error) {
          console.error("Error removing domain:", error);
          return NextResponse.json({ error: "Failed to remove domain" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Domain removed successfully" });
      }

      case "clear": {
        // Remove all user-added domains (category = 'user-added')
        const { error } = await supabase
          .from("domains")
          .delete()
          .eq("category", "user-added");

        if (error) {
          console.error("Error clearing domains:", error);
          return NextResponse.json({ error: "Failed to clear domains" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "User-added domains cleared successfully" });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in domains manage API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  // Handle GET request for listing domains
  try {
    const supabase = await createClient();
    const { data: domainsList, error } = await supabase
      .from("domains")
      .select("domain, category")
      .order("domain");

    if (error) {
      console.error("Error fetching domains:", error);
      return NextResponse.json({ error: "Failed to fetch domains" }, { status: 500 });
    }

    return NextResponse.json({ domains: domainsList || [] });
  } catch (error) {
    console.error("Error in domains GET API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
