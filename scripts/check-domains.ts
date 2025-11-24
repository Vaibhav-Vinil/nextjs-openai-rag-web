// scripts/check-domains.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local file
const envPath = resolve(process.cwd(), '.env.local');
console.log(`Loading environment variables from: ${envPath}`);
dotenv.config({ path: envPath });

// Debug: Log environment variables (be careful with sensitive data in logs)
console.log('Environment variables loaded:');
console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'}`);
console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'}`);

async function checkDomains() {
  try {
    console.log('\n=== Testing Mandatory Domains ===');
    
    // Initialize Supabase client with environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(`
        Missing Supabase credentials in environment variables.
        Please ensure you have a .env.local file in your project root with:
        NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
        SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
      `);
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('\n[1/2] Querying mandatory domains...');
    const { data, error } = await supabase
      .from('mandatory_search_domains')
      .select(`
        domains!inner(domain)
      `);

    if (error) {
      console.error('❌ Error querying database:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('\n✅ Found mandatory domains:');
      data.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.domains.domain}`);
      });
    } else {
      console.log('\nℹ️  No mandatory domains found in database');
    }

  } catch (error) {
    console.error('\n❌ Error:');
    console.error(error instanceof Error ? error.message : error);
  }
}

checkDomains();