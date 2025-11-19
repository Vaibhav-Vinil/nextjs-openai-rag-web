import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/config/admin-emails';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !isAdmin(session.user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const region = searchParams.get('region') || '';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('domains')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`domain.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (region) {
      query = query.eq('region', region);
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('domains')
      .select('*', { count: 'exact', head: true })
      .or(search ? `domain.ilike.%${search}%,description.ilike.%${search}%` : '')
      .eq(category ? 'category' : '', category)
      .eq(region ? 'region' : '', region);

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json({ error: 'Failed to count domains' }, { status: 500 });
    }

    // Get paginated results
    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
    }

    return NextResponse.json({
      domains: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !isAdmin(session.user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      domain,
      category,
      description,
      content_types = [],
      region = 'Global',
      topics = [],
      strengths = [],
      avoid_for = [],
      reliability_score = 0.50
    } = body;

    // Validate required fields
    if (!domain || !category) {
      return NextResponse.json({ error: 'Domain and category are required' }, { status: 400 });
    }

    // Check if domain already exists
    const { data: existing } = await supabase
      .from('domains')
      .select('id')
      .eq('domain', domain)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('domains')
      .insert([{
        domain,
        category,
        description,
        content_types,
        region,
        topics,
        strengths,
        avoid_for,
        reliability_score
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to create domain' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
