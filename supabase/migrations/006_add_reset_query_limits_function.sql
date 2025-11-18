-- Create a function to reset query limits
CREATE OR REPLACE FUNCTION public.reset_query_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete all records from user_queries table
  DELETE FROM public.user_queries
  WHERE user_id IS NOT NULL;
  
  -- Get the number of deleted rows
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Return the count of deleted rows
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.reset_query_limits() TO authenticated;
