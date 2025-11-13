# Supabase Setup Guide

This application uses Supabase for user authentication and user data storage. Follow these steps to set up Supabase:

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in your project details:
   - Name your project
   - Set a database password (save this securely)
   - Choose a region close to your users
5. Wait for the project to be created (this may take a few minutes)

## 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll find:
   - **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon/public key** (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## 3. Configure Environment Variables

Create a `.env.local` file in the root of your project (or add to your existing `.env` file):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI API Key (if not already set)
OPENAI_API_KEY=your_openai_api_key_here
```

Replace `your_supabase_project_url` and `your_supabase_anon_key` with the values from step 2.

## 4. Configure Email Authentication (Optional but Recommended)

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Configure email templates if needed
4. Set up email redirect URLs:
   - Go to **Authentication** → **URL Configuration**
   - Add your site URL (e.g., `http://localhost:3000` for development)
   - Add redirect URL: `http://localhost:3000/auth/callback`

## 5. Database Schema Setup

### Authentication Tables (Automatic)

Supabase automatically creates the necessary tables for authentication. The `auth.users` table is managed by Supabase and stores:
- User email
- Encrypted passwords
- Email verification status
- User metadata

### Conversations Table (Manual Setup)

You need to create the conversations table for chat history storage:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/001_create_conversations.sql`
5. Click **Run** to execute the migration

This will create:
- `conversations` table with proper indexes
- Row Level Security (RLS) policies
- Automatic timestamp updates

Alternatively, you can use the Supabase CLI:
```bash
supabase db push
```

## 6. Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/signup`
3. Create a test account
4. Check your email for verification (if email verification is enabled)
5. Log in at `http://localhost:3000/login`

## Troubleshooting

### Email Verification Not Working

- Check your Supabase project's email settings
- Verify the redirect URL is correctly configured
- Check spam folder for verification emails

### Authentication Errors

- Verify your environment variables are set correctly
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are prefixed with `NEXT_PUBLIC_` (required for client-side access)
- Restart your development server after changing environment variables

### Session Not Persisting

- Ensure cookies are enabled in your browser
- Check that your Supabase project is not paused (free tier projects pause after inactivity)

## Production Deployment

When deploying to production:

1. Update the redirect URLs in Supabase to match your production domain
2. Set environment variables in your hosting platform (Vercel, Netlify, etc.)
3. Ensure your production URL is added to Supabase's allowed URLs
4. Consider enabling additional security features like:
   - Rate limiting
   - CAPTCHA
   - Email confirmation requirements

