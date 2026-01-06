import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/config/admin-emails";
import { NextRequest, NextResponse } from "next/server";
import { adminConfigSchema, validateRequestBody } from "@/lib/validation/schemas";
import { applyRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin
        if (!isAdmin(user.email || "")) {
            return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
        }

        // Apply rate limiting for admin endpoints
        const rateLimitResponse = applyRateLimit(request, RATE_LIMIT_CONFIGS.admin, user.id);
        if (rateLimitResponse) {
            return rateLimitResponse;
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
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin
        if (!isAdmin(user.email || "")) {
            return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
        }

        // Apply rate limiting
        const rateLimitResponse = applyRateLimit(request, RATE_LIMIT_CONFIGS.admin, user.id);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        // Validate request body with Zod schema
        const validation = await validateRequestBody(request, adminConfigSchema);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { key, value, description } = validation.data;

        // Upsert configuration
        const { data, error } = await supabase
            .from("admin_config")
            .upsert({
                key,
                value,
                description: description || null,
                updated_by: user.id
            })
            .select()
            .single();

        if (error) {
            console.error("Error updating admin config:", error);
            return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
        }

        return NextResponse.json({ success: true, config: data });
    } catch (error) {
        console.error("Error in admin config POST:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin
        if (!isAdmin(user.email || "")) {
            return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
        }

        // Apply rate limiting
        const rateLimitResponse = applyRateLimit(request, RATE_LIMIT_CONFIGS.admin, user.id);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
        }

        const { configurations } = body; // Expecting { key: value } object

        // Validate configurations object
        if (!configurations || typeof configurations !== "object" || Array.isArray(configurations)) {
            return NextResponse.json({ error: "Configurations must be a valid object" }, { status: 400 });
        }

        // Validate each key doesn't exceed length limits
        const entries = Object.entries(configurations);
        if (entries.length > 100) {
            return NextResponse.json({ error: "Too many configurations (max 100)" }, { status: 400 });
        }

        for (const [key] of entries) {
            if (typeof key !== "string" || key.length > 100) {
                return NextResponse.json({ error: "Configuration keys must be strings with max 100 characters" }, { status: 400 });
            }
        }

        // Batch update configurations
        const updates = Object.entries(configurations).map(([key, value]) => ({
            key,
            value,
            updated_by: user.id
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
