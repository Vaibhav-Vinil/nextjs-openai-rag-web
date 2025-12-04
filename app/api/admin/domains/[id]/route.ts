import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/config/admin-emails';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !isAdmin(session.user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      domain,
      category,
      description = '',
      content_types = [],
      region = 'Global',
      topics = [],
      strengths = [],
      avoid_for = []
    } = body;

    // Validate required fields
    if (!domain || !category) {
      return NextResponse.json({ error: 'Domain and category are required' }, { status: 400 });
    }

    // Check if domain already exists (excluding current record)
    const { data: existing } = await supabase
      .from('domains')
      .select('id')
      .eq('domain', domain)
      .neq('id', id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('domains')
      .update({
        domain,
        category,
        description,
        content_types,
        region,
        topics,
        strengths,
        avoid_for,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !isAdmin(session.user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('domains')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to delete domain' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
