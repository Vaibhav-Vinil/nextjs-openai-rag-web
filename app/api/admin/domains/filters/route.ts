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

    // Get distinct categories
    const { data: categories, error: categoriesError } = await supabase
      .from('domains')
      .select('category');

    // Get distinct regions
    const { data: regions, error: regionsError } = await supabase
      .from('domains')
      .select('region');

    if (categoriesError || regionsError) {
      console.error('Database error:', { categoriesError, regionsError });
      return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 });
    }

    const uniqueCategories = [...new Set(categories?.map(c => c.category).filter(Boolean))];
    const uniqueRegions = [...new Set(regions?.map(r => r.region).filter(Boolean))];

    return NextResponse.json({
      categories: uniqueCategories,
      regions: uniqueRegions
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
