# pvAI Implementation Walkthrough

This document provides a comprehensive overview of the `pvAI` codebase, detailing its structure, components, and key implementation details.

## 1. Project Structure

The project is built with **Next.js 15 (App Router)** and follows a modular architecture.

```
/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # Backend API endpoints
│   ├── (auth)/             # Authentication pages
│   ├── admin/              # Admin dashboard
│   └── page.tsx            # Main chat interface
├── components/             # Reusable UI components
│   ├── chat/               # Chat-specific components
│   ├── ui/                 # Generic UI components (buttons, inputs)
│   └── ...
├── lib/                    # Utility functions and shared logic
│   ├── assistant.ts        # AI assistant logic
│   ├── security/           # Security utilities (Rate limiting)
│   ├── validation/         # Input validation schemas (Zod)
│   ├── supabase/           # Supabase client/server setup
│   └── tools/              # AI tools (weather, search, etc.)
├── stores/                 # State management (Zustand)
└── public/                 # Static assets
```

## 2. Core Features

### 2.1 AI Chat Interface
- **State Management**: Uses `zustand` (`useConversationStore`) to manage chat history and UI state.
- **Streaming Responses**: The assistant streams responses token-by-token using `ReadableStream`.
- **Tool Integration**: Supports dynamic tools like web search, file search, and custom functions.

### 2.2 Authentication
- **Supabase Auth**: Handles user signup, login, and session management.
- **Google Sign-In**: Integrated via `signInWithOAuth` in `components/google-signin-button.tsx`.
- **Middleware**: `middleware.ts` protects routes and ensures authenticated access to specific pages.
- **Secure Phone Validation**: Server-side endpoint `/api/auth/validate-phone` prevents API key exposure.

### 2.3 Security (New)
- **Input Validation**: All API routes validate input using **Zod** schemas defined in `lib/validation/schemas.ts`.
  - Strict type checking
  - Length limits for strings (Max 100-50000 chars)
  - Array size limits (Max 500-1000 items)
- **Rate Limiting**: `lib/security/rate-limiter.ts` implements robust rate limiting:
  - **Auth**: 10 req / 15 min (Strict)
  - **AI Chat**: 30 req / 1 min
  - **Standard API**: 100 req / 1 min
  - **Admin**: 200 req / 1 min
- **CSP**: strict Content Security Policy headers in `middleware.ts`.

### 2.4 Data Management
- **Supabase Database**: Stores users, conversations, messages, and vector embeddings.
- **Vector Search**: Uses `pgvector` for semantic search over documents.

## 3. Key Components

### `lib/assistant.ts`
Handles the core logic for the AI assistant:
- Sends user messages to `/api/turn_response`.
- Processes streaming responses.
- Handles tool calls (web search, file search) and recursively calls the assistant with tool outputs.

### `lib/tools/tools.ts`
Defines the tools available to the AI:
- **web_search**: Search the internet using permissive domain logic.
- **file_search**: Search uploaded documents.
- **get_weather**: Example functional tool.

### `app/api/turn_response/route.ts`
The main backend endpoint for the AI:
- Validates input (messages, tools state).
- Checks user query limits.
- Calls OpenAI API with tool definitions.
- Returns a streaming response.

## 4. Setup & Configuration

- **Environment Variables**: Managed in `.env` (not committed).
  - `OPENAI_API_KEY`: For AI models.
  - `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`: For database access.
  - `ABSTRACT_API_KEY`: For phone validation (server-side only).

## 5. Deployment

- **Vercel**: Optimized for Vercel deployment.
- **Build Command**: `npm run build` checks types and linting.
- **Start Command**: `npm start` runs the production server.
- **Console Logs**: configured in `next.config.mjs` to automatically strip `console.log` in production builds (preserving errors/warns).

## 6. Recent Updates

- **Security Hardening**:
  - Moved phone validation to server-side to secure API keys.
  - Implemented comprehensive rate limiting across all public endpoints.
  - Added strict input validation for all API routes.
  - Fixed CSP configuration for browser compatibility.
