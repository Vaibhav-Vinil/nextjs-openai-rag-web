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
        const apiKey = process.env.ABSTRACT_API_KEY;
        if (!apiKey) {
            // If no API key, skip validation and return valid
            // This allows the app to work without phone validation configured
            console.warn("ABSTRACT_API_KEY not configured, skipping phone validation");
            return NextResponse.json({
                valid: true,
                skipped: true,
                message: "Phone validation not configured",
            });
        }

        // Call Abstract API from server-side (API key is never exposed to client)
        const response = await fetch(
            `https://phoneintelligence.abstractapi.com/v1/?api_key=${apiKey}&phone=${encodeURIComponent(phone)}`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                },
            }
        );

        if (!response.ok) {
            console.error("Abstract API error:", response.status, response.statusText);
            // Don't expose API errors to client, just allow the signup to proceed
            return NextResponse.json({
                valid: true,
                skipped: true,
                message: "Phone validation service unavailable",
            });
        }

        const data = await response.json();

        // Return sanitized response (don't expose raw API response)
        return NextResponse.json({
            valid: data.valid ?? true,
            country: data.country?.name || null,
            type: data.type || null,
        });

    } catch (error) {
        console.error("Phone validation error:", error);
        // On error, allow signup to proceed
        return NextResponse.json({
            valid: true,
            skipped: true,
            message: "Phone validation error",
        });
    }
}
