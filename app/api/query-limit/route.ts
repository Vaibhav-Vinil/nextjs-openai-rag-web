import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkQueryLimit } from '@/lib/security/queryLimiter';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { remaining } = await checkQueryLimit(user.id);

    return NextResponse.json({
      remaining,
      total: 5 // Daily limit
    });

  } catch (error) {
    console.error('Error checking query limit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
