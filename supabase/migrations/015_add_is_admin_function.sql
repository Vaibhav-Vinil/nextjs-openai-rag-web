-- Function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
  is_admin BOOLEAN;
BEGIN
  -- Get the email of the current user
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Check if the user's email is in the admin list
  -- This matches the same check used in the admin config policy
  SELECT EXISTS (
    SELECT 1 
    FROM admin_config 
    WHERE key = 'admin_emails' 
    AND value::text LIKE '%' || user_email || '%'
  ) INTO is_admin;
  
  -- Also check if the user is a service role (for server-side operations)
  IF NOT is_admin THEN
    SELECT current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' INTO is_admin;
  END IF;
  
  RETURN COALESCE(is_admin, FALSE);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
