-- Function to list all conversations for a specific user (admin view, bypassing RLS)
CREATE OR REPLACE FUNCTION public.get_user_conversations_for_admin(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
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
    c.created_at,
    c.updated_at
  FROM conversations c
  WHERE c.user_id = p_user_id
  ORDER BY c.updated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_conversations_for_admin(UUID) TO authenticated;
