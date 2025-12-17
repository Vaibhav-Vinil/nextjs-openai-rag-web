import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/config/admin-emails';

// GET: Get the latest conversation for a specific user (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdmin(user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Use SECURITY DEFINER function to fetch all conversations metadata
    const { data: conversations, error } = await supabase.rpc(
      'get_all_conversations_metadata'
    );

    if (error) {
      console.error('Error fetching conversations metadata:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversation' },
        { status: 500 }
      );
    }

    // Find the latest conversation for this specific user
    const userConversations = (conversations || []).filter(
      (c: any) => c.user_id === userId
    );

    if (!userConversations.length) {
      return NextResponse.json(
        { error: 'No conversation found for this user' },
        { status: 404 }
      );
    }

    const latestConversation = userConversations[0];

    return NextResponse.json({ conversationId: latestConversation.id });
  } catch (error) {
    console.error('Error in GET handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

