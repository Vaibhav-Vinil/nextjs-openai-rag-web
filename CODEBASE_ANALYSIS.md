# pvAI Codebase Analysis

## Overview

This is **pvAI** — a specialized AI chatbot for the **solar energy industry**, built as a fork of OpenAI's Responses Starter App. The application provides intelligent responses to solar panels, inverters, batteries, and renewable energy topics through a modern chat interface.

## Technology Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **AI Provider** | OpenAI API (GPT-5.1-chat-latest) |
| **Authentication** | Supabase Auth |
| **Database** | Supabase PostgreSQL |
| **State Management** | Zustand |
| **Styling** | Tailwind CSS |
| **UI Components** | Radix UI, Lucide Icons |
| **Animation** | Framer Motion |

---

## Project Structure

```
openai-responses-starter-app/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # Backend API endpoints
│   │   ├── admin/         # Admin management endpoints
│   │   ├── auth/          # Authentication endpoints
│   │   ├── conversations/ # Chat history CRUD
│   │   ├── domains/       # Domain filtering
│   │   ├── google/        # Google OAuth integration
│   │   ├── turn_response/ # Main OpenAI streaming endpoint
│   │   └── vector_stores/ # File/vector store management
│   ├── admin/             # Admin dashboard pages
│   ├── auth/              # Auth callback routes
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   └── page.tsx           # Main chat application
├── components/            # React UI components
│   ├── ui/               # shadcn/ui base components
│   ├── chat.tsx          # Main chat interface
│   ├── message.tsx       # Message rendering
│   ├── assistant.tsx     # Assistant wrapper
│   └── ...               # Tool panels, domain management, etc.
├── config/               # Application configuration
│   ├── constants.ts      # AI model, developer prompt, initial message
│   ├── functions.ts      # Custom function definitions
│   └── admin-emails.ts   # Admin user whitelist
├── lib/                  # Core business logic
│   ├── assistant.ts      # OpenAI API handling & streaming
│   ├── auth.ts           # Auth utilities
│   ├── conversations.ts  # Conversation management
│   ├── supabase/         # Supabase client configuration
│   └── tools/            # Tool handling logic
├── stores/               # Zustand state management
│   ├── useConversationStore.ts  # Chat state
│   └── useToolsStore.ts         # Tool configuration state
├── supabase/migrations/  # 16 SQL migration files
└── middleware.ts         # Security headers & CSP
```

---

## Core Features

### 1. AI Chat Engine

- **Model**: `gpt-5.1-chat-latest` (configurable in `config/constants.ts`)
- **Streaming**: Real-time response streaming via OpenAI Responses API
- **Multi-turn**: Maintains full conversation context
- **Developer Prompt**: Specialized for solar energy topics with strict off-topic filtering

### 2. Built-in Tools

| Tool | Description |
|------|-------------|
| **Web Search** | Real-time web search for up-to-date information |
| **File Search** | Vector store-based document search (pv.market products) |
| **Code Interpreter** | Python code execution for calculations/charts |
| **Custom Functions** | `get_weather`, `get_joke` (extensible) |
| **MCP Servers** | Model Context Protocol integration |
| **Google Integration** | Gmail & Calendar via OAuth |

### 3. Authentication & Users

- **Supabase Auth**: Email/password authentication
- **Session Management**: SSR-compatible cookies
- **Admin Roles**: Whitelist-based admin access via `config/admin-emails.ts`
- **Query Limits**: Per-user rate limiting

### 4. Conversation Persistence

- **Auto-save**: Debounced (2 seconds) automatic saving
- **Full History**: Both API items and UI messages stored
- **Sharing**: Public shareable conversation links
- **Admin View**: Admins can view all user conversations

---

## State Management

### `stores/useConversationStore.ts`

Manages chat state:
- `chatMessages` — UI display messages
- `conversationItems` — API request history
- `isAssistantLoading` — Streaming state
- `currentConversationId` — Active conversation

### `stores/useToolsStore.ts`

Manages tool configuration (persisted to localStorage):
- Web search (enabled by default)
- File search (vector stores)
- Code interpreter
- MCP servers
- Google integration

---

## Database Schema

16 Supabase migrations define:

| Table | Purpose |
|-------|---------|
| `conversations` | Chat history storage |
| `vector_store_config` | File search configuration |
| `shared_domains` | Domain filtering |
| `domains` | Extended domain management |
| `admin_config` | System configuration |
| `snippets` | Shareable snippets |
| `catalog` | Product catalog |

Key features:
- Row Level Security (RLS) — users only access their own data
- Admin functions for cross-user access
- Auto-reset query limits scheduled function

---

## Security

### `middleware.ts`

Security headers applied to all routes:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- **Content Security Policy** (production)

---

## Key Files Reference

| File | Location | Purpose |
|------|----------|---------|
| Main Page | `app/page.tsx` | Chat application entry point |
| AI Logic | `lib/assistant.ts` | OpenAI API handling (636 lines) |
| Chat UI | `components/chat.tsx` | Chat interface component |
| Constants | `config/constants.ts` | Model, prompts, defaults |
| Middleware | `middleware.ts` | Security headers |

---

## Running the Application

```bash
npm install
npm run dev        # Development server at http://localhost:3000
npm run build      # Production build
npm run start      # Production server
```

---

## Environment Variables

Required in `.env.local`:

```env
# OpenAI
OPENAI_API_KEY=your_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```
