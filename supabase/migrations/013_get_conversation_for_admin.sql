-- Function to get a full conversation for admin view (bypassing RLS)
CREATE OR REPLACE FUNCTION public.get_conversation_for_admin(p_conversation_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  conversation_items JSONB,
  chat_messages JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.user_id,
    c.title,
    c.conversation_items,
    c.chat_messages,
    c.created_at,
    c.updated_at
  FROM conversations c
  WHERE c.id = p_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_conversation_for_admin(UUID) TO authenticated;
