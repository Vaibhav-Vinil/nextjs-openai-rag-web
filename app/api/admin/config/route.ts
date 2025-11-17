import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/config/admin-emails";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdmin(session.user.email || "")) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Get all admin configurations
    const { data: configs, error } = await supabase
      .from("admin_config")
      .select("*")
      .order("key");

    if (error) {
      console.error("Error fetching admin config:", error);
      return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 });
    }

    // Convert array to key-value object
    const configObject = configs.reduce((acc: any, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});

    return NextResponse.json(configObject);
  } catch (error) {
    console.error("Error in admin config GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdmin(session.user.email || "")) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { key, value, description } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }

    // Upsert configuration
    const { data: config, error } = await supabase
      .from("admin_config")
      .upsert({
        key,
        value,
        description: description || null,
        updated_by: session.user.id
      })
      .select()
      .single();

    if (error) {
      console.error("Error updating admin config:", error);
      return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Error in admin config POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdmin(session.user.email || "")) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { configurations } = body; // Expecting { key: value } object

    if (!configurations || typeof configurations !== "object") {
      return NextResponse.json({ error: "Configurations object is required" }, { status: 400 });
    }

    // Batch update configurations
    const updates = Object.entries(configurations).map(([key, value]) => ({
      key,
      value,
      updated_by: session.user.id
    }));

    const { data: configs, error } = await supabase
      .from("admin_config")
      .upsert(updates)
      .select();

    if (error) {
      console.error("Error batch updating admin config:", error);
      return NextResponse.json({ error: "Failed to update configurations" }, { status: 500 });
    }

    return NextResponse.json({ success: true, configs });
  } catch (error) {
    console.error("Error in admin config PUT:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
