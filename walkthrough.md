# pvAI Implementation Walkthrough

This document provides a comprehensive overview of the `pvAI` codebase, detailing its structure, components, and key implementation details.

## 1. Project Structure

The project is built with **Next.js 15 (App Router)** and follows a modular architecture.

```
/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # Backend API endpoints
│   ├── admin/              # Admin dashboard
│   └── page.tsx            # Main chat interface
├── components/             # Reusable UI components
│   ├── ui/                 # Generic UI components (shadcn/ui)
│   └── ...                 # Feature-specific components (chat, tools)
├── lib/                    # Core business logic and utilities
│   ├── assistant.ts        # AI assistant turn handling
│   ├── security/           # Rate limiting and query management
│   ├── validation/         # Input validation schemas (Zod)
│   ├── supabase/           # Supabase client/server setup
│   └── tools/              # AI tools (web search, file search, MCP)
├── config/                 # Application configuration
│   ├── constants.ts        # AI model, developer prompt, branding
│   └── admin-emails.ts     # Admin access whitelist
├── stores/                 # State management (Zustand)
└── public/                 # Static assets (logos, icons)
```

## 2. Core Features

### 2.1 AI Chat Interface
- **State Management**: Uses `zustand` (`useConversationStore`) for chat history and `useToolsStore` for tool preferences.
- **Streaming Responses**: The assistant streams responses token-by-token using OpenAI's response API via `/api/turn_response`.
- **Branding**: Heavily customized for **pv.market** with specialized developer prompts.

### 2.2 Security & Authentication
- **Supabase Auth**: Email/password authentication for users.
- **Rate Limiting**: `lib/security/rate-limiter.ts` implements strictly managed limits for AI and Auth endpoints based on IP or User ID.
- **Daily Query Limits**: Users are limited (e.g., 5 queries per day) to manage costs and prevent abuse, handled by `lib/security/queryLimiter.ts`.
- **Input Validation**: All API routes use **Zod** for strict input validation, preventing malformed requests or injection.

### 2.3 Knowledge Integration
- **Web Search**: Dynamic real-time search for current solar industry developments.
- **File Search (Vector Store)**: Semantic search over the pv.market product catalog and technical documentation.
- **MCP Servers**: Support for Model Context Protocol to integrate with external data services.

## 3. Key Backend Logic

### `app/api/turn_response/route.ts`
- The core orchestrator for AI turns.
- Check user authentication and rate limits.
- Validates the daily query budget.
- Clean messages to satisfy OpenAI API requirements.
- Returns a `ReadableStream` for real-time tokens.

### `lib/assistant.ts`
- Handles the front-end side of the AI interaction.
- Manages the switch-case for streaming events (delta, tool call, done).
- Automatically triggers tool executions (like MCP or Functions) and starts new turns if needed.

## 4. Maintenance & Best Practices

- **Strict Types**: The project uses TypeScript throughout to minimize runtime errors.
- **Environment Variables**: Sensitive keys (OpenAI, Supabase, Abstract API) are stored in `.env` and never committed.
- **Visuals**: Tailwind CSS is used for all styling, ensuring a fast and consistent UI.
- **Clean Code**: Redundant features like legacy Google integration and Code Interpreter were removed to keep the bundle size small and focus on the solar product use case.
