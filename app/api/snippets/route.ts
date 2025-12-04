import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, expires_in_seconds } = body;
    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    // Generate a short id (7 chars) - replace with a stronger ID generator if desired
    const id = nanoid(10);

    // Create a server-side Supabase client using the service_role key
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from('snippets')
      .insert([
        {
          id,
          content,
          expires_at: expires_in_seconds ? new Date(Date.now() + expires_in_seconds * 1000).toISOString() : null,
        },
      ]);

    if (error) {
      console.error('Supabase error inserting snippet:', error);
      // In development, return the Supabase error details to help debugging.
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ error: 'Failed to save snippet', detail: error }, { status: 500 });
      }
      return NextResponse.json({ error: 'Failed to save snippet' }, { status: 500 });
    }

    return NextResponse.json({ id });
  } catch (err) {
    console.error('Error in snippets POST:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
