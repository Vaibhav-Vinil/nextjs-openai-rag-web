-- Function to return metadata for all conversations (admin use)
-- This bypasses RLS via SECURITY DEFINER so that admin APIs can see all conversations.

CREATE OR REPLACE FUNCTION public.get_all_conversations_metadata()
RETURNS TABLE (
  id UUID,
  user_id UUID,
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
    c.updated_at
  FROM conversations c
  ORDER BY c.updated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_conversations_metadata() TO authenticated;


