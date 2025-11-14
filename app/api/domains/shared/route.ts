import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TABLE_NAME = "shared_domains";
const SHARED_KEY = "shared";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("domains")
      .eq("key", SHARED_KEY)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching shared domains:", error);
      return NextResponse.json(
        { error: "Failed to fetch shared domains" },
        { status: 500 }
      );
    }

    return NextResponse.json({ domains: data?.domains || [] });
  } catch (error) {
    console.error("Unexpected error fetching shared domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared domains" },
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

    const supabase = await createClient();
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(
        [
          {
            key: SHARED_KEY,
            domains: domains,
          },
        ],
        { onConflict: "key" }
      );

    if (error) {
      console.error("Error saving shared domains:", error);
      return NextResponse.json(
        { error: "Failed to save shared domains" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error saving shared domains:", error);
    return NextResponse.json(
      { error: "Failed to save shared domains" },
      { status: 500 }
    );
  }
}
