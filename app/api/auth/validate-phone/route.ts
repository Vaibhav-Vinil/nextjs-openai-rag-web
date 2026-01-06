/**
 * Server-side phone validation endpoint
 * Moves the Abstract API call from client-side to server-side
 * to prevent API key exposure in the browser
 */

import { NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMIT_CONFIGS } from "@/lib/security/rate-limiter";
import { z } from "zod";

// Validation schema for phone number
const phoneValidationSchema = z.object({
    phone: z.string()
        .min(7, "Phone number too short")
        .max(20, "Phone number too long")
        .regex(/^[\d+\-\s()]+$/, "Invalid phone number format"),
});

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        // Apply rate limiting (auth-level strictness to prevent abuse)
        const rateLimitResponse = applyRateLimit(request, RATE_LIMIT_CONFIGS.auth);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        // Parse and validate request body
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON in request body" },
                { status: 400 }
            );
        }

        const validation = phoneValidationSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.errors[0]?.message || "Invalid phone number" },
                { status: 400 }
            );
        }

        const { phone } = validation.data;

        // Check if Abstract API key is configured
        const apiKey = process.env.ABSTRACT_API_KEY || process.env.NEXT_PUBLIC_ABSTRACT_API_KEY;

        console.log(`[Phone Validation] API Key present: ${!!apiKey}`);

        if (!apiKey) {
            // STRICT MODE: As per user request, treat missing config as fatal error
            console.error("[Phone Validation] CRITICAL: Abstract API key is missing. Validation cannot proceed.");
            return NextResponse.json({
                valid: false,
                skipped: false,
                message: "Server configuration error: Phone validation service is not configured.",
            }, { status: 500 });
        }

        // Call Abstract API from server-side (API key is never exposed to client)
        console.log(`[Phone Validation] Validating phone: ${phone}`);
        const response = await fetch(
            `https://phoneintelligence.abstractapi.com/v1/?api_key=${apiKey}&phone=${encodeURIComponent(phone)}`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                },
                cache: 'no-store' // Disable caching to prevent stale results
            }
        );

        if (!response.ok) {
            console.error(`[Phone Validation] Abstract API error: ${response.status} ${response.statusText}`);
            // If the API errors out, we should probably fail validation to be safe, 
            // strictly following the user's report that invalid numbers caused 500s.
            return NextResponse.json({
                valid: false,
                skipped: false,
                message: "Could not validate phone number. Please check the format.",
            });
        }

        const data = await response.json();
        console.log(`[Phone Validation] Abstract API Response:`, JSON.stringify(data, null, 2));

        // Return sanitized response (don't expose raw API response)
        // Correctly map the nested is_valid property
        const isValid = data.phone_validation?.is_valid ?? false;

        const result = {
            valid: isValid,
            country: data.phone_location?.country_name || null,
            type: data.phone_carrier?.line_type || null,
        };
        console.log(`[Phone Validation] Result:`, result);

        return NextResponse.json(result);

    } catch (error) {
        console.error("Phone validation error:", error);
        // On strict error, fail validation
        return NextResponse.json({
            valid: false,
            skipped: false,
            message: "Phone validation error occurred.",
        });
    }
}
