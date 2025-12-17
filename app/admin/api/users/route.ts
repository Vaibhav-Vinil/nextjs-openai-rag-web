import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/config/admin-emails';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdmin(user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get metadata for all conversations via a SECURITY DEFINER function
    // This bypasses RLS so admins can see all users' conversations.
    const { data: conversations, error: convError } = await supabase.rpc(
      'get_all_conversations_metadata'
    );

    if (convError) {
      console.error('Error fetching conversations:', convError);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    // For each user, get their latest conversation
    const userConversationMap = new Map<string, { conversationId: string; lastChatAt: string }>();
    conversations?.forEach(conv => {
      const existing = userConversationMap.get(conv.user_id);
      if (!existing || new Date(conv.updated_at) > new Date(existing.lastChatAt)) {
        userConversationMap.set(conv.user_id, {
          conversationId: conv.id,
          lastChatAt: conv.updated_at
        });
      }
    });

    // Fetch ALL users with basic metadata using the database function
    const { data: userData, error: userError } = await supabase.rpc('get_all_users_with_metadata');

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json({ 
        error: 'Failed to fetch user details',
        details: userError.message 
      }, { status: 500 });
    }

    // Combine user data with conversation info. This will return all users,
    // and only those who have chatted will have a latest_conversation_id.
    const usersWithChats = (userData || []).map((user: any) => {
      const convInfo = userConversationMap.get(user.id);
      return {
        id: user.id,
        display_name: user.display_name || user.email?.split('@')[0] || 'Unknown',
        email: user.email,
        phone: user.phone || '',
        last_sign_in_at: user.last_sign_in_at || null,
        latest_conversation_id: convInfo?.conversationId || null,
        last_chat_at: convInfo?.lastChatAt || null
      };
    });

    return NextResponse.json({ users: usersWithChats });
  } catch (error) {
    console.error('Error in GET users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

