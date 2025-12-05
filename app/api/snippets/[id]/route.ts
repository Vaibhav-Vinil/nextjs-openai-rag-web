import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data, error } = await supabase
      .from('snippets')
      .select('id, content, created_at, expires_at, view_count')
      .eq('id', id)
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ snippet: data });
  } catch (err) {
    console.error('Error in snippets GET:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
