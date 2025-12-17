-- Create a function to get all users with basic metadata
-- This allows admins to see all registered users in the admin panel
CREATE OR REPLACE FUNCTION public.get_all_users_with_metadata()
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
  ORDER BY au.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
-- Note: Admin check is enforced in the application layer
GRANT EXECUTE ON FUNCTION public.get_all_users_with_metadata() TO authenticated;


