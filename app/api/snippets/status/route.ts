import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || null;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, reason: 'Missing env', env: { NEXT_PUBLIC_SUPABASE_URL: !!url, SUPABASE_SERVICE_ROLE_KEY: !!serviceKey } }, { status: 200 });
    }

    const supabase = createClient(url, serviceKey);

    // Test a simple select to see if table exists / is accessible
    try {
      const { data, error } = await supabase.from('snippets').select('id').limit(1);
      if (error) {
        return NextResponse.json({ ok: false, reason: 'Query error', detail: error }, { status: 200 });
      }

      return NextResponse.json({ ok: true, reason: 'Table reachable', sample: data?.[0] ?? null }, { status: 200 });
    } catch (err) {
      return NextResponse.json({ ok: false, reason: 'Unexpected query failure', detail: String(err) }, { status: 200 });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, reason: 'Internal error', detail: String(err) }, { status: 500 });
  }
}
