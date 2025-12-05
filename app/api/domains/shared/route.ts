import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: domains, error } = await supabase
      .from("domains")
      .select("domain")
      .order("domain", { ascending: true });

    if (error) {
      console.error("Error fetching domains:", error);
      return NextResponse.json(
        { error: "Failed to fetch domains" },
        { status: 500 }
      );
    }

    // Extract domain strings for backward compatibility
    const domainStrings = domains?.map(item => item.domain) || [];

    return NextResponse.json({ domains: domainStrings });
  } catch (error) {
    console.error("Unexpected error fetching domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { domains } = await request.json();

    if (!Array.isArray(domains)) {
      return NextResponse.json(
        { error: "domains must be an array" },
        { status: 400 }
      );
    }

    // Since we're now using the domains table with rich metadata,
    // this POST endpoint is deprecated and should not be used.
    // Users should manage domains through the domain management APIs.
    console.warn("POST to /api/domains/shared is deprecated. Use domain management APIs instead.");

    return NextResponse.json({ 
      success: false, 
      message: "This endpoint is deprecated. Use the domain management APIs instead." 
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
