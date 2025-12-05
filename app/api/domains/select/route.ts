import { NextRequest, NextResponse } from "next/server";
import {
  DomainSelectionConfig,
  selectDomainsForQuery,
} from "@/lib/domains/selector";

export async function POST(request: NextRequest) {
  try {
    const {
      query,
      config,
    }: { query: string; config?: Partial<DomainSelectionConfig> } =
      await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const selection = await selectDomainsForQuery(query, config);

    return NextResponse.json(selection.domains, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Domain selection error:", error);
    return NextResponse.json(
      {
        error: "Failed to select domains",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
