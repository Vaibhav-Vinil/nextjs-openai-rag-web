import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isAdmin } from "@/config/admin-emails";

export async function POST() {
  console.log('Starting reset-query-limits request');
  
  try {
    const supabase = await createClient();
    
    // First verify user is authenticated and get their email
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError?.message || 'No user found');
      return NextResponse.json(
        { error: "Unauthorized - Please log in" }, 
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!isAdmin(user.email || "")) {
      console.error('Admin check failed for user:', user.email);
      return NextResponse.json(
        { error: "Forbidden - Admin access required" }, 
        { status: 403 }
      );
    }

    console.log('User is admin, proceeding with reset...');

    try {
      // Use a direct SQL query to delete all records
      const { data, error } = await supabase.rpc('reset_query_limits');
      
      if (error) {
        console.error('Error executing reset query:', error);
        throw error;
      }
      
      console.log('Successfully reset query limits');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Successfully reset query limits for all users',
        deletedCount: data || 0
      });
      
    } catch (sqlError) {
      console.error('SQL error in reset-query-limits:', sqlError);
      throw new Error('Failed to execute reset query');
    }
    
  } catch (error) {
    console.error('Unexpected error in reset-query-limits:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
