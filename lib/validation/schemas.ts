/**
 * Centralized Zod validation schemas for API endpoints
 * Following OWASP best practices for input validation
 * 
 * @module lib/validation/schemas
 */

import { z } from "zod";

// =============================================================================
// COMMON VALIDATORS
// =============================================================================

/**
 * Email validation with reasonable length limits
 * Max 254 chars per RFC 5321
 */
export const emailSchema = z
    .string()
    .email("Invalid email format")
    .min(5, "Email too short")
    .max(254, "Email exceeds maximum length");

/**
 * Password validation
 * Min 8 chars for security, max 128 to prevent DoS
 */
export const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password exceeds maximum length");

/**
 * UUID validation for IDs
 */
export const uuidSchema = z.string().uuid("Invalid ID format");

/**
 * Safe string with length limits (prevents DoS via large payloads)
 */
export const safeString = (maxLength: number = 1000) =>
    z.string().max(maxLength, `Exceeds maximum length of ${maxLength} characters`);

/**
 * Safe text content (for messages, descriptions, etc.)
 */
export const textContentSchema = safeString(50000); // 50KB max for text content

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

export const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
}).strict(); // Reject unexpected fields

export const signupSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    fullName: safeString(100).optional(),
    phone: safeString(20).optional(),
}).strict();

// =============================================================================
// CONVERSATION SCHEMAS
// =============================================================================

/**
 * Content item in a message
 */
const contentItemSchema = z.object({
    type: z.enum(["input_text", "output_text", "refusal", "output_audio", "annotation"]).optional(),
    text: safeString(100000).optional(), // 100KB max per content item
    annotations: z.array(z.any()).optional(),
}).passthrough(); // Allow additional fields for flexibility

/**
 * Single message in conversation
 */
const messageSchema = z.object({
    role: z.enum(["user", "assistant", "system"]).optional(),
    type: z.string().optional(),
    content: z.union([
        safeString(100000),
        z.array(contentItemSchema),
    ]).optional(),
}).passthrough(); // Allow additional fields for tool calls, etc.

/**
 * Conversation creation/update schema
 */
export const conversationSchema = z.object({
    title: safeString(200).optional(),
    conversation_items: z.array(z.any()).max(1000, "Too many conversation items"), // Limit array size
    chat_messages: z.array(z.any()).max(1000, "Too many chat messages"),
}).strict();

/**
 * Conversation update schema (partial)
 */
export const conversationUpdateSchema = z.object({
    title: safeString(200).optional(),
    conversation_items: z.array(z.any()).max(1000).optional(),
    chat_messages: z.array(z.any()).max(1000).optional(),
    is_shared: z.boolean().optional(),
}).strict();

// =============================================================================
// TURN RESPONSE (AI CHAT) SCHEMAS
// =============================================================================

/**
 * Web search configuration
 */
const webSearchConfigSchema = z.object({
    user_location: z.object({
        type: z.literal("approximate").optional(),
        country: safeString(100).optional(),
        city: safeString(100).optional(),
        region: safeString(100).optional(),
    }).optional(),
    max_domains: z.number().int().min(1).max(50).optional(),
}).passthrough();

/**
 * MCP configuration
 */
const mcpConfigSchema = z.object({
    server_label: safeString(100).optional(),
    server_url: safeString(500).optional(),
    allowed_tools: safeString(1000).optional(),
    skip_approval: z.boolean().optional(),
}).passthrough();

/**
 * Tools state for AI requests
 */
export const toolsStateSchema = z.object({
    webSearchEnabled: z.boolean().optional(),
    fileSearchEnabled: z.boolean().optional(),
    functionsEnabled: z.boolean().optional(),
    codeInterpreterEnabled: z.boolean().optional(),
    mcpEnabled: z.boolean().optional(),
    googleIntegrationEnabled: z.boolean().optional(),
    vectorStore: z.object({
        id: safeString(100),
        name: safeString(200),
    }).nullable().optional(),
    webSearchConfig: webSearchConfigSchema.optional(),
    mcpConfig: mcpConfigSchema.optional(),
}).passthrough();

/**
 * Main turn response request schema
 */
export const turnResponseSchema = z.object({
    messages: z.array(messageSchema).max(500, "Too many messages in conversation"),
    toolsState: toolsStateSchema,
}).strict();

// =============================================================================
// DOMAIN SCHEMAS
// =============================================================================

export const domainSchema = z.object({
    domain: safeString(253), // Max domain length per RFC
    category: safeString(100).optional(),
    description: safeString(1000).optional(),
    content_types: z.array(safeString(50)).max(20).optional(),
    region: safeString(100).optional(),
    topics: z.array(safeString(100)).max(50).optional(),
    strengths: z.array(safeString(200)).max(20).optional(),
    avoid_for: z.array(safeString(200)).max(20).optional(),
}).passthrough();

export const manageDomainsSchema = z.object({
    action: z.enum(["add", "remove", "list", "clear"]),
    domain: safeString(253).optional(),
    _domains: z.array(safeString(253)).max(100).optional(),
}).strict();

export const domainSelectSchema = z.object({
    query: safeString(5000),
    maxDomains: z.number().int().min(1).max(50).optional(),
    webSearchConfig: webSearchConfigSchema.optional(),
    messages: z.array(messageSchema).max(500).optional(),
}).strict();

// =============================================================================
// ADMIN SCHEMAS
// =============================================================================

export const adminConfigSchema = z.object({
    key: safeString(100),
    value: z.any(), // Admin config can have various value types
    description: safeString(500).optional(),
}).strict();

export const adminConfigBatchSchema = z.object({
    configurations: z.record(safeString(100), z.any()),
}).strict();

// =============================================================================
// VECTOR STORE SCHEMAS
// =============================================================================

export const createVectorStoreSchema = z.object({
    name: safeString(200),
}).strict();

export const addFileToStoreSchema = z.object({
    vectorStoreId: safeString(100),
    fileId: safeString(100),
}).strict();

export const uploadFileSchema = z.object({
    fileObject: z.object({
        id: safeString(100),
        filename: safeString(255),
    }).passthrough(),
}).strict();

// =============================================================================
// SNIPPET SCHEMAS
// =============================================================================

export const snippetSchema = z.object({
    content: safeString(100000), // 100KB max
    title: safeString(200).optional(),
    metadata: z.record(z.any()).optional(),
}).strict();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Safely parse and validate request body with proper error handling
 * Returns validated data or null with error details
 */
export async function validateRequestBody<T>(
    request: Request,
    schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string; details?: z.ZodError }> {
    try {
        const body = await request.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            const errorMessages = result.error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(", ");
            return {
                success: false,
                error: `Validation failed: ${errorMessages}`,
                details: result.error,
            };
        }

        return { success: true, data: result.data };
    } catch {
        return {
            success: false,
            error: "Invalid JSON in request body",
        };
    }
}

/**
 * Sanitize string input by trimming and removing potential XSS vectors
 * Note: For display, output encoding should still be used
 */
export function sanitizeString(input: string): string {
    return input
        .trim()
        .replace(/[<>]/g, ""); // Basic XSS prevention
}
