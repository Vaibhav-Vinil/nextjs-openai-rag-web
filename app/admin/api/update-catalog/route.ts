import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/config/admin-emails';
import { readFile } from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

const execAsync = promisify(exec);
const openai = new OpenAI();

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdmin(user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run the update-catalog.ps1 script
    const scriptPath = path.join(process.cwd(), 'update-catalog.ps1');
    console.log('Running PowerShell script:', scriptPath);
    
    try {
      // Step 1: Run the PowerShell script to generate the catalog
      const { stdout, stderr } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
      console.log('PowerShell script output:', stdout);
      
      if (stderr) {
        console.error('PowerShell script stderr:', stderr);
      }

      // Step 2: Read the generated catalog.json
      const catalogPath = path.join(process.cwd(), 'catalog.json');
      console.log('Reading catalog file from:', catalogPath);
      
      const fileBuffer = await readFile(catalogPath);
      const fileContent = fileBuffer.toString('utf8').replace(/^\uFEFF/, '');
      
      // Step 3: Upload the file using the existing endpoint
      console.log('Uploading catalog file...');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const uploadResponse = await fetch(`${baseUrl}/api/vector_stores/upload_file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileObject: {
            name: 'catalog.json',
            content: fileBuffer.toString('base64')
          }
        })
      });
      
      if (!uploadResponse.ok) {
        const error = await uploadResponse.json().catch(() => ({}));
        throw new Error(`Failed to upload file: ${error.message || 'Unknown error'}`);
      }
      
      const { id: fileId } = await uploadResponse.json();
      console.log('File uploaded successfully, ID:', fileId);
      
      // Step 4: Get or create the vector store
      console.log('Getting or creating vector store...');
      const storeName = 'Product Catalog';
      
      // Check if we already have a vector store
      const { data: existingStore } = await supabase
        .from('vector_store_config')
        .select('*')
        .eq('key', 'catalog')
        .single();
      
      let vectorStoreId = existingStore?.store_id;
      
      if (!vectorStoreId) {
        // Create a new vector store if one doesn't exist
        const createResponse = await fetch(`${baseUrl}/api/vector_stores/create_store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: storeName })
        });
        
        if (!createResponse.ok) {
          const error = await createResponse.json().catch(() => ({}));
          throw new Error(`Failed to create vector store: ${error.message || 'Unknown error'}`);
        }
        
        const vectorStore = await createResponse.json();
        vectorStoreId = vectorStore.id;
        console.log('Created new vector store:', vectorStoreId);
      } else {
        console.log('Using existing vector store:', vectorStoreId);
      }
      
      // Step 5: Add the file to the vector store
      console.log('Adding file to vector store...');
      const addFileResponse = await fetch(`${baseUrl}/api/vector_stores/add_file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          vectorStoreId
        })
      });
      
      if (!addFileResponse.ok) {
        const error = await addFileResponse.json().catch(() => ({}));
        throw new Error(`Failed to add file to vector store: ${error.message || 'Unknown error'}`);
      }
      
      // Step 6: Update the vector store config in our database
      const { error: updateError } = await supabase
        .from('vector_store_config')
        .upsert({
          key: 'catalog',
          store_id: vectorStoreId,
          store_name: storeName,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      
      if (updateError) {
        throw new Error(`Failed to update vector store config: ${updateError.message}`);
      }
      
      console.log('Catalog update completed successfully');
      return NextResponse.json({ 
        success: true, 
        message: 'Catalog updated successfully',
        vectorStoreId
      });
      
    } catch (error) {
      console.error('Error in catalog update process:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to update catalog' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in update-catalog route:', error);
    
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      
      if (error.message.includes('ENOENT')) {
        errorMessage = 'Catalog file not found';
        statusCode = 404;
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Invalid catalog data format';
      } else if (error.message.includes('API key')) {
        errorMessage = 'OpenAI API key is missing or invalid';
        statusCode = 500;
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        ...(process.env.NODE_ENV === 'development' && { stack: error instanceof Error ? error.stack : undefined })
      }, 
      { status: statusCode }
    );
  }
}
