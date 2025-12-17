import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/config/admin-emails';

// GET: List all conversations for a specific user (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !isAdmin(user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    const { data, error } = await supabase.rpc(
      'get_user_conversations_for_admin',
      { p_user_id: userId }
    );

    if (error) {
      console.error('Error fetching user conversations for admin:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user conversations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ conversations: data || [] });
  } catch (error) {
    console.error('Error in admin user conversations GET:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


