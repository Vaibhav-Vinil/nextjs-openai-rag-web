# Chat History Storage Documentation

## Overview

The application stores complete chat history in Supabase, allowing users to continue previous conversations. This document explains what data is stored and how it works.

## Data Structure Sent to API

The raw content sent to the OpenAI Responses API consists of:

### Request Payload Structure

```typescript
{
  messages: any[],           // Full conversation history
  toolsState: ToolsState,     // Tool configuration state
  googleIntegrationEnabled: boolean
}
```

### Messages Array (`conversationItems`)

The `messages` array (stored as `conversation_items` in the database) contains the complete conversation history in the format expected by the OpenAI Responses API. Each item can be:

1. **User Messages**:
   ```typescript
   {
     role: "user",
     content: string  // The user's message text
   }
   ```

2. **Assistant Messages**:
   ```typescript
   {
     role: "assistant",
     content: string  // The assistant's response
   }
   ```

3. **Tool Calls**:
   ```typescript
   {
     type: "tool_call",
     tool_type: "function_call" | "mcp_call",
     name: string,
     arguments: string,
     // ... other tool call properties
   }
   ```

4. **Tool Outputs**:
   ```typescript
   {
     type: "function_call_output",
     call_id: string,
     status: "completed",
     output: string
   }
   ```

5. **MCP Approval Requests**:
   ```typescript
   {
     type: "mcp_approval_response",
     approve: boolean,
     approval_request_id: string
   }
   ```

### Chat Messages Array (`chatMessages`)

The `chat_messages` array contains the formatted messages for display in the UI. Each item follows this structure:

```typescript
{
  type: "message" | "tool_call" | "mcp_approval_request",
  role?: "user" | "assistant",
  id?: string,
  content: Array<{
    type: "input_text" | "output_text" | "annotation",
    text?: string,
    annotations?: Array<Annotation>
  }>
}
```

## Database Schema

### Conversations Table

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  conversation_items JSONB,    -- The raw messages sent to API
  chat_messages JSONB,         -- The formatted messages for UI
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### What Gets Stored

1. **`conversation_items` (JSONB)**: 
   - The exact array of messages sent to the OpenAI API
   - Includes all user messages, assistant responses, tool calls, and tool outputs
   - This is what gets restored when loading a conversation

2. **`chat_messages` (JSONB)**:
   - The formatted messages for UI display
   - Includes annotations, tool call visualizations, etc.
   - Used to restore the visual state of the chat

3. **`title` (TEXT)**:
   - Auto-generated from the first user message (first 50 characters)
   - Can be manually updated

## Auto-Save Behavior

Conversations are automatically saved:
- **2 seconds** after the last change (debounced)
- Only if `conversation_items.length > 0` (not just the initial welcome message)
- Creates a new conversation on first save
- Updates existing conversation on subsequent saves

## API Endpoints

### List Conversations
```
GET /api/conversations
```
Returns all conversations for the authenticated user, sorted by `updated_at` (newest first).

### Get Conversation
```
GET /api/conversations/[id]
```
Returns the full conversation data including `conversation_items` and `chat_messages`.

### Create/Update Conversation
```
POST /api/conversations        # Create new
PUT /api/conversations/[id]    # Update existing
```
Saves the conversation with `conversation_items` and `chat_messages`.

### Delete Conversation
```
DELETE /api/conversations/[id]
```
Permanently deletes a conversation.

## Security

- Row Level Security (RLS) is enabled
- Users can only access their own conversations
- All API routes require authentication
- User ID is automatically set from the session

## Usage Example

### Loading a Conversation

When a user clicks on a conversation in the history sidebar:

1. The conversation ID is fetched
2. `conversation_items` and `chat_messages` are loaded from Supabase
3. The conversation store is updated with:
   - `conversationItems` = loaded `conversation_items`
   - `chatMessages` = loaded `chat_messages`
   - `currentConversationId` = conversation ID
4. The chat UI displays the restored messages
5. User can continue the conversation from where they left off

### Continuing a Conversation

When a user sends a new message in a loaded conversation:

1. New message is added to `conversationItems` and `chatMessages`
2. After 2 seconds of inactivity, the conversation is auto-saved
3. The existing conversation record is updated (not a new one)
4. The conversation history sidebar shows the updated timestamp

## Data Flow

```
User sends message
  ↓
Added to conversationItems & chatMessages
  ↓
Sent to OpenAI API (conversationItems array)
  ↓
Response streamed back
  ↓
Added to conversationItems & chatMessages
  ↓
Auto-saved to Supabase (after 2s debounce)
  ↓
Stored as JSONB in conversations table
```

## Notes

- The `conversation_items` array is the **source of truth** for what gets sent to the API
- The `chat_messages` array is for UI display only
- Both are stored to ensure perfect restoration of both API state and UI state
- Conversations are never automatically deleted (users must manually delete)
- There's no limit on conversation length (Supabase JSONB can handle large arrays)

