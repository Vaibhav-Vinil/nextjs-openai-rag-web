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
    let countQuery = supabase
      .from('domains')
      .select('*', { count: 'exact', head: true });

    // Apply same filters as main query
    if (search) {
      countQuery = countQuery.or(`domain.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (category) {
      countQuery = countQuery.eq('category', category);
    }
    if (region) {
      countQuery = countQuery.eq('region', region);
    }

    const { count, error: countError } = await countQuery;
    
    console.log('Count query result:', { count, countError }); // Debug log

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json({ error: 'Failed to count domains' }, { status: 500 });
    }

    // Get paginated results
    const { data, error } = await query.range(offset, offset + limit - 1);
    
    console.log('Main query result:', { data: data?.length, error }); // Debug log

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
    }

    const response = {
      domains: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
    
    console.log('API Response:', response); // Debug log

    return NextResponse.json(response);
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
    const { domain, category, description, content_types, region, topics, strengths, avoid_for } = body;

    if (!domain || !category) {
      return NextResponse.json({ error: 'Domain and category are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('domains')
      .insert([{
        domain,
        category,
        description: description || '',
        content_types: content_types || [],
        region: region || 'Global',
        topics: topics || [],
        strengths: strengths || [],
        avoid_for: avoid_for || []
      }])
      .select();

    if (error) {
      console.error('Database error:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Domain already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create domain' }, { status: 500 });
    }

    return NextResponse.json({ domain: data[0] }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
