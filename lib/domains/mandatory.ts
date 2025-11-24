// lib/domains/mandatory.ts
import { createClient } from '@supabase/supabase-js';

export async function getMandatoryDomains(): Promise<string[]> {
  try {
    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return [];
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Query the mandatory domains with a join to get domain names
    const { data, error } = await supabase
      .from('mandatory_search_domains')
      .select(`
        domains!inner(domain)
      `);
      
    if (error) {
      console.error('Error fetching mandatory domains:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No mandatory domains found in the database');
      return [];
    }
    
    // Extract domain strings
    const domains = data
      .filter(item => item.domains?.domain)
      .map(item => item.domains.domain.toLowerCase().trim());
    
    console.log('Found mandatory domains:', domains);
    return domains;
    
  } catch (error) {
    console.error('Error in getMandatoryDomains:', error);
    return [];
  }
}