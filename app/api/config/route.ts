import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all admin configurations (read-only for authenticated users)
    const { data: configs, error } = await supabase
      .from("admin_config")
      .select("key, value")
      .order("key");

    if (error) {
      console.error("Error fetching public config:", error);
      return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 });
    }

    // Convert array to key-value object
    const configObject = configs.reduce((acc: any, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});

    return NextResponse.json(configObject);
  } catch (error) {
    console.error("Error in public config GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
