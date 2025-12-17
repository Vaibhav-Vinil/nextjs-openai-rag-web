-- Create a function to get users who have conversations
-- This function allows admins to query user data from auth.users
CREATE OR REPLACE FUNCTION public.get_users_with_conversations(user_ids UUID[])
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  phone TEXT,
  last_sign_in_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'display_name',
      au.email::TEXT
    )::TEXT as display_name,
    COALESCE(
      au.phone::TEXT,
      au.raw_user_meta_data->>'phone',
      ''
    )::TEXT as phone,
    au.last_sign_in_at
  FROM auth.users au
  WHERE au.id = ANY(user_ids)
  ORDER BY au.last_sign_in_at DESC NULLS LAST;
END;
$$;

-- Grant execute permission to authenticated users
-- Note: Admin check should be done in the application layer
GRANT EXECUTE ON FUNCTION public.get_users_with_conversations(UUID[]) TO authenticated;

