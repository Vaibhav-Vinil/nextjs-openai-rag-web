import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const domain = await request.json();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('domains')
      .upsert(domain, {
        onConflict: 'domain',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to save domain' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
