/**
 * Rate Limiting Utility for API Endpoints
 * Implements IP-based and user-based rate limiting with graceful 429 responses
 * 
 * Uses in-memory storage with automatic cleanup
 * For production at scale, consider Redis-based implementation
 * 
 * @module lib/security/rate-limiter
 */

import { NextResponse } from "next/server";

// =============================================================================
// TYPES
// =============================================================================

interface RateLimitEntry {
    count: number;
    resetTime: number;
    firstRequest: number;
}

interface RateLimitConfig {
    /** Maximum requests allowed in the window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
    /** Optional message for 429 response */
    message?: string;
    /** Whether to include retry-after header */
    includeRetryAfter?: boolean;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfterSeconds?: number;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

/**
 * Default rate limit configurations for different endpoint types
 * These are sensible defaults that can be overridden per-route
 */
export const RATE_LIMIT_CONFIGS = {
    /** Standard API endpoints - 100 requests per minute */
    standard: {
        maxRequests: 100,
        windowMs: 60 * 1000, // 1 minute
        message: "Too many requests. Please try again later.",
        includeRetryAfter: true,
    },

    /** Authentication endpoints - stricter limits to prevent brute force */
    auth: {
        maxRequests: 10,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: "Too many authentication attempts. Please try again in 15 minutes.",
        includeRetryAfter: true,
    },

    /** AI/Chat endpoints - moderate limits due to resource intensity */
    ai: {
        maxRequests: 30,
        windowMs: 60 * 1000, // 1 minute
        message: "Too many AI requests. Please slow down.",
        includeRetryAfter: true,
    },

    /** Admin endpoints - higher limits for admin users */
    admin: {
        maxRequests: 200,
        windowMs: 60 * 1000, // 1 minute
        message: "Rate limit exceeded.",
        includeRetryAfter: true,
    },

    /** Public/anonymous endpoints - strictest limits */
    public: {
        maxRequests: 30,
        windowMs: 60 * 1000, // 1 minute
        message: "Too many requests from this IP. Please try again later.",
        includeRetryAfter: true,
    },

    /** File upload endpoints - very strict */
    upload: {
        maxRequests: 10,
        windowMs: 60 * 1000, // 1 minute
        message: "Too many upload requests. Please wait before uploading more files.",
        includeRetryAfter: true,
    },
} as const satisfies Record<string, RateLimitConfig>;

// =============================================================================
// IN-MEMORY STORE
// =============================================================================

/**
 * In-memory rate limit store
 * Key format: `${type}:${identifier}` where type is 'ip' or 'user'
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Cleanup interval handle
 */
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic cleanup of expired entries
 * Called automatically on first rate limit check
 */
function startCleanupInterval(): void {
    if (cleanupInterval) return;

    // Clean up expired entries every 5 minutes
    cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore.entries()) {
            if (entry.resetTime < now) {
                rateLimitStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);

    // Don't prevent Node.js from exiting
    if (cleanupInterval.unref) {
        cleanupInterval.unref();
    }
}

// =============================================================================
// CORE RATE LIMITING FUNCTIONS
// =============================================================================

/**
 * Check rate limit for a given identifier
 * 
 * @param identifier - The identifier to rate limit (IP address or user ID)
 * @param config - Rate limit configuration
 * @param type - Type of identifier ('ip' or 'user')
 * @returns Rate limit result with remaining requests and reset time
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig,
    type: "ip" | "user" = "ip"
): RateLimitResult {
    // Start cleanup interval on first use
    startCleanupInterval();

    const key = `${type}:${identifier}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // If no entry or window has expired, create new entry
    if (!entry || entry.resetTime < now) {
        entry = {
            count: 1,
            resetTime: now + config.windowMs,
            firstRequest: now,
        };
        rateLimitStore.set(key, entry);

        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetTime: entry.resetTime,
        };
    }

    // Increment count
    entry.count += 1;
    rateLimitStore.set(key, entry);

    // Check if over limit
    if (entry.count > config.maxRequests) {
        const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
        return {
            allowed: false,
            remaining: 0,
            resetTime: entry.resetTime,
            retryAfterSeconds,
        };
    }

    return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime,
    };
}

/**
 * Combined IP + User rate limiting
 * Checks both limits and returns the most restrictive result
 * 
 * @param ip - Client IP address
 * @param userId - Optional user ID (null for anonymous)
 * @param config - Rate limit configuration
 * @returns Combined rate limit result
 */
export function checkCombinedRateLimit(
    ip: string,
    userId: string | null,
    config: RateLimitConfig
): RateLimitResult {
    // Always check IP-based limit
    const ipResult = checkRateLimit(ip, config, "ip");

    // If no user, return IP result
    if (!userId) {
        return ipResult;
    }

    // Check user-based limit (with slightly higher allowance for authenticated users)
    const userConfig = {
        ...config,
        maxRequests: Math.floor(config.maxRequests * 1.5), // 50% more for auth users
    };
    const userResult = checkRateLimit(userId, userConfig, "user");

    // Return the most restrictive result
    if (!ipResult.allowed) return ipResult;
    if (!userResult.allowed) return userResult;

    // Both allowed, return the one with fewer remaining
    return ipResult.remaining < userResult.remaining ? ipResult : userResult;
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/**
 * Extract client IP from request headers
 * Handles common proxy headers (X-Forwarded-For, CF-Connecting-IP, etc.)
 * 
 * @param request - Incoming request
 * @returns Client IP address or fallback
 */
export function getClientIP(request: Request): string {
    const headers = request.headers;

    // Check common proxy headers in order of preference
    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor) {
        // X-Forwarded-For can contain multiple IPs, take the first (client)
        return forwardedFor.split(",")[0].trim();
    }

    // Cloudflare
    const cfConnectingIP = headers.get("cf-connecting-ip");
    if (cfConnectingIP) return cfConnectingIP;

    // Azure/AWS
    const realIP = headers.get("x-real-ip");
    if (realIP) return realIP;

    // Vercel
    const vercelForwardedFor = headers.get("x-vercel-forwarded-for");
    if (vercelForwardedFor) return vercelForwardedFor.split(",")[0].trim();

    // Fallback for local development
    return "127.0.0.1";
}

/**
 * Create a standardized 429 Too Many Requests response
 * 
 * @param config - Rate limit configuration
 * @param result - Rate limit check result
 * @returns NextResponse with proper headers
 */
export function createRateLimitResponse(
    config: RateLimitConfig,
    result: RateLimitResult
): NextResponse {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(config.maxRequests),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
    };

    if (config.includeRetryAfter && result.retryAfterSeconds) {
        headers["Retry-After"] = String(result.retryAfterSeconds);
    }

    return new NextResponse(
        JSON.stringify({
            error: "Too Many Requests",
            message: config.message || "Rate limit exceeded. Please try again later.",
            retryAfter: result.retryAfterSeconds,
        }),
        {
            status: 429,
            headers,
        }
    );
}

/**
 * Add rate limit headers to a successful response
 * 
 * @param response - Existing response
 * @param config - Rate limit configuration
 * @param result - Rate limit check result
 * @returns Response with rate limit headers added
 */
export function addRateLimitHeaders(
    response: NextResponse,
    config: RateLimitConfig,
    result: RateLimitResult
): NextResponse {
    response.headers.set("X-RateLimit-Limit", String(config.maxRequests));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetTime / 1000)));
    return response;
}

// =============================================================================
// HIGH-LEVEL MIDDLEWARE HELPER
// =============================================================================

/**
 * Rate limit check that can be used at the start of API routes
 * Returns null if allowed, or a 429 Response if rate limited
 * 
 * @example
 * ```ts
 * export async function POST(request: Request) {
 *   const rateLimitResponse = await applyRateLimit(request, RATE_LIMIT_CONFIGS.standard);
 *   if (rateLimitResponse) return rateLimitResponse;
 *   
 *   // Continue with normal handler...
 * }
 * ```
 */
export function applyRateLimit(
    request: Request,
    config: RateLimitConfig,
    userId?: string | null
): NextResponse | null {
    const ip = getClientIP(request);
    const result = checkCombinedRateLimit(ip, userId ?? null, config);

    if (!result.allowed) {
        return createRateLimitResponse(config, result);
    }

    return null;
}

/**
 * Get rate limit status without consuming a request
 * Useful for displaying remaining requests to users
 */
export function getRateLimitStatus(
    identifier: string,
    config: RateLimitConfig,
    type: "ip" | "user" = "ip"
): { remaining: number; resetTime: number } {
    const key = `${type}:${identifier}`;
    const entry = rateLimitStore.get(key);
    const now = Date.now();

    if (!entry || entry.resetTime < now) {
        return {
            remaining: config.maxRequests,
            resetTime: now + config.windowMs,
        };
    }

    return {
        remaining: Math.max(0, config.maxRequests - entry.count),
        resetTime: entry.resetTime,
    };
}

// =============================================================================
// TESTING & DEBUG UTILITIES (only available in non-production)
// =============================================================================

/**
 * Clear all rate limit entries (for testing only)
 */
export function clearRateLimitStore(): void {
    if (process.env.NODE_ENV === "production") {
        console.warn("clearRateLimitStore called in production - ignoring");
        return;
    }
    rateLimitStore.clear();
}

/**
 * Get current store size (for monitoring)
 */
export function getRateLimitStoreSize(): number {
    return rateLimitStore.size;
}
