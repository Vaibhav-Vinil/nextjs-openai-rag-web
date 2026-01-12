# AI Intelligent Assistant

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![NextJS](https://img.shields.io/badge/Built_with-NextJS-blue)](https://nextjs.org/)
[![OpenAI API](https://img.shields.io/badge/Powered_by-OpenAI_API-orange)](https://openai.com/)

> **Note:** This project was forked from [openai/openai-responses-starter-app](https://github.com/openai/openai-responses-starter-app.git)

## 📋 Table of Contents
- [Tech Stack](#-tech-stack)
- [System Overview](#-system-overview)
- [Features](#-features)
- [Admin Panel](#-admin-panel)
- [Setup & Configuration](#-setup--configuration)
- [Environment Variables](#-environment-variables)

## 🛠 Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI API

## 🌐 System Overview

The AI Intelligent Assistant is a centralized workspace designed to help users find information by analyzing files and performing web searches.

### Core Capabilities
- Browse the live web for up-to-date information
- Read and analyze uploaded documents
- Transform raw data sources (PDFs, websites, internal files) into conversational chat format

## 🔄 End-to-End Workflow

1. **Access**
   - User logs in using Google account or email
   
2. **Identity Verification**
   - System verifies user's phone number
   
3. **Inquiry**
   - User submits questions via chat interface
   
4. **Information Gathering**
   - System automatically determines source:
     - Web search
     - Uploaded files
     - Both sources
     
5. **Response**
   - System provides detailed answer
   - References included only if information comes from pv.market
   
6. **Storage**
   - Complete conversation history saved for future reference

## ✨ Features

### 🔒 Automatic Phone Validation
**Location**: `app/api/auth/validate-phone/route.ts`  
**Trigger**: During first login/account setup  
**Purpose**: Adds security layer to confirm active phone numbers and prevent bot usage.

**Flow**:
1. User enters phone number with country code
2. AbstractAPI validates the number
3. Invalid numbers block further access

### 🌍 Web Search
**Type**: Native OpenAI Tool  
**Availability**: Accessible during any chat session

**Purpose**: Enables real-time internet browsing for current information not in training data.

**Flow**:
1. System detects need for current information
2. Performs background web search
3. Summarizes top results into response

### 📂 File Search
**Type**: Native OpenAI Tool  
**Availability**: Accessible during any chat session

**Purpose**: Searches documents in OpenAI's vector store (product details/internal data).

**Vector Store Management**:
- Data can be added via Admin Panel
- Recommended: Use "Update Product Catalog" button

**Catalog Update Process**:
1. Fetches data from: `https://place-holder-company-name/api/catalog`
2. Cleans data by:
   - Removing irrelevant information
   - Filtering out "Dummy" warehouses
3. Sends cleaned data to OpenAI vector store for indexing

## 👨‍💼 Admin Control Panel
**Access**: Admin icon (top-right corner, authorized users only)

**Capabilities**:
- Toggle Web Search on/off
- Toggle File Search on/off
- Reset query limits (credits) for users
- View user conversation history
- Open user sessions in read-only mode

## 🏗️ Setup & Configuration


**Handles**:
- User authentication
- Security
- Permanent data storage

### Database Tables

#### `admin_config`
- Centralized settings
- Controls feature availability in real-time

#### `conversations`
- Stores user messages
- Records tool outputs
- Maintains chatbot responses

#### `snippets`
- Powers the Sharing feature
- Stores shared content with unique IDs
- Allows public access to shared content

#### `user_queries`
- Tracks daily usage for quota enforcement
- Records timestamp for each user message
- Implements 5 messages/user/day limit

#### `vector_store_config`
- Stores OpenAI Vector Store ID
- Manages product catalog versions

## 🔐 Security


### Environment Variables
Create a `.env` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
NODE_ENV=development
NEXT_PUBLIC_SHARED_VECTOR_STORE_ID=vs_shared_default
NEXT_PUBLIC_SHARED_VECTOR_STORE_NAME=Shared_Documents
NEXT_PUBLIC_ABSTRACT_API_KEY=your_abstract_api_key
ENABLE_STRICT_SECURITY=true
```

## 🔗 External Integrations

### AbstractAPI
- Validates phone numbers
- Prevents automated bot usage

### Google OAuth
- Enables passwordless login
- Bypasses email verification
- [Setup Guide](https://youtube.com/watch?v=example)

### Resend (Email Service)
**Purpose**:
- Password reset emails
- Email confirmations

**Configuration**:
- Integrated via SMTP in Supabase
- Sender: team@example.com
- [Setup Reference](https://youtube.com/watch?v=example)

## 📝 Notes
- All chats are automatically saved to Supabase
- Context is maintained within individual chat sessions
- Information is not shared across different chat windows

   ```bash
   OPENAI_API_KEY=<your_api_key>
   ```

3. **Clone the Repository:**

   ```bash
   git clone https://github.com/Vaibhav-Vinil/nextjs-openai-rag-web.git
   ```

4. **Install dependencies:**

   Run in the project root:

   ```bash
   npm install
   ```

5. **Run the app:**

   ```bash
   npm run dev
   ```

   The app will be available at [`http://localhost:3000`](http://localhost:3000).

## Tools

This starter app shows how to use built-in tools, MCP servers, and first-party connectors with the Responses API.

You can configure these tools directly from the UI, but some tools require additional setup (e.g. Google OAuth).

### Built-in tools

We have several out-of-the-box tools available to use with the Responses API. This demo app implements and allows to configure directly from the UI the following tools:

- File search, to allow the model to access your files in a vector store
- Web search, to allow the model to search the web
- Code interpreter, to allow the model to run Python code to solve problems

Other built-in tools, such as computer use or image generation, are not implemented in this demo app.

### MCP servers

The UI allows you to configure a public MCP server to use with the Responses API. If you want to use an MCP server that requires authentication, feel free to update `lib/tools/tools.ts` to add your own logic. You can use the Google connector integration as an example of how to use access tokens.

### Custom functions

This demo app comes with example functions, `get_weather` and `get_joke`. You can add your own functions to the `config/functions.ts` file.

### Google integration

This app shows how you can use OpenAI's 1P connectors to integrate with Google and let the assistant read your calendar and email inbox. The app performs a secure OAuth flow in your browser, stores tokens per session, and attaches the Google connector to the Responses API tools list with your access token.

To test this instructions, read the instructions below to set up the Google OAuth 2.0 client and enable the Google Calendar and Gmail APIs.

Learn more about the available 1P connectors in [our documentation](https://platform.openai.com/docs/guides/tools-connectors-mcp#connectors).

#### Setup (Google OAuth)

1. Create an OAuth 2.0 client for a Web application in your Google Cloud project (see [documentation](https://developers.google.com/identity/protocols/oauth2) for accessing Google APIs with Oauth 2.0 docs).

   - In Google Cloud, go to APIs & Services > Google Auth platform > Clients > Create client > **Web**.
   - Add your redirect URI: `http://localhost:3000/api/google/callback`.
   - Copy the client ID. Create and copy a client secret.

2. Enable APIs in the same project:

   - Google Calendar API
   - Gmail API

3. Configure data access scopes in Google Auth Platform to match what you need. This demo uses:

   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/gmail.modify`

4. Create `.env.local` (you can copy `.env.example`) at the project root and add:

   ```bash
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/callback"
   ```

## Demo flows

### Try web search + code interpreter

After enabling web search and code interpreter in the UI, ask the model:

> "Can you fetch the temperatures in SF for August and then generate a chart plotting them?"

The model should use the web search tool to fetch the temperatures and then use the code interpreter tool to generate a chart which will be displayed in the UI.

### Try file search

- Save PDF files, for examples blog posts (you can use [this one](https://openai.com/index/new-tools-and-features-in-the-responses-api/), then print the page and use the "Save as PDF" option)
- Create a new vector store and upload the PDF file(s)
- Enable file search and ask the model a question which can be answered by the PDF file(s), for example:
  > "What's new with the Responses API?"
- The model should use the file search tool to find the relevant information in the PDF file(s) and then display the response

### Try the Google integration

- Click "Connect Google Integration" in the UI and complete the OAuth flow; you will be redirected back with `connected=1`.
- Ask the assistant to perform tasks—for example, "Show my next five calendar events," or, "Summarize the most recent wirecutter emails".
- The app will attach Google Calendar and Gmail connectors (via MCP) to the tools list using your access token and stream results back to the UI.
- To invalidate the OAuth session, clear the app cookies (Chrome DevTools > Application > Storage > Cookies). If you only clear `gc_access_token`, the app will use the `gc_refresh_token` to refresh without re-authenticating.

## Contributing

You are welcome to open issues or submit PRs to improve this app, however, please note that we may not review all suggestions.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
