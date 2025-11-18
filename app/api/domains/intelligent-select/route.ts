import { NextResponse } from "next/server";
import { selectDomainsForQuery } from "@/lib/domains/selector";

export async function POST(request: Request) {
  try {
    const { query, maxDomains = 7 } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required and must be a string" },
        { status: 400 }
      );
    }

    const selection = await selectDomainsForQuery(query, {
      max_domains: maxDomains,
    });

    return NextResponse.json({
      query,
      selectedDomains: selection.domains,
      totalDomains: selection.stats.totalDomains,
      selectionMethod: "ai_intelligent",
    });
  } catch (error) {
    console.error("Error in intelligent domain selection:", error);
    return NextResponse.json(
      {
        error: "Failed to select domains intelligently",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
