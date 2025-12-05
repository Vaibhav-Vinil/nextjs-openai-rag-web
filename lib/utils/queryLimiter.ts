import { createClient } from "@/lib/supabase/server";

export async function checkQueryLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const supabase = await createClient();
    
    // Get the start of the current day in UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    // Count queries for this user today
    const { count, error } = await supabase
      .from('user_queries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('query_timestamp', today.toISOString());
      
    if (error) {
      console.error('Error checking query limit:', error);
      // In case of error, be permissive rather than restrictive
      return { allowed: true, remaining: 5 };
    }
    
    const remainingQueries = Math.max(0, 5 - (count || 0));
    return {
      allowed: (count || 0) < 5,
      remaining: remainingQueries
    };
  } catch (error) {
    console.error('Error in checkQueryLimit:', error);
    return { allowed: true, remaining: 5 };
  }
}

export async function recordQuery(userId: string, queryType: string = 'assistant_query') {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('user_queries')
      .insert([
        { 
          user_id: userId, 
          query_type: queryType 
        }
      ]);
      
    if (error) {
      console.error('Error recording query:', error);
      return { success: false, error };
    }
    
    // Dispatch a custom event to notify the UI to update the query count
    if (typeof window !== 'undefined') {
      // Create a custom event that bubbles up and is cancelable
      const event = new CustomEvent('queryRecorded', {
        bubbles: true,
        cancelable: true,
        detail: { timestamp: new Date().toISOString() }
      });
      window.dispatchEvent(event);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in recordQuery:', error);
    return { success: false, error };
  }
}
