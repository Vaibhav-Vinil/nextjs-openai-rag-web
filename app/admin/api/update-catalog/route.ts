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
      // Remove BOM if present and convert to string
      fileBuffer.toString('utf8').replace(/^\uFEFF/, '');
      
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
      
      // Check if we already have a vector store in our config
      const { data: existingStore } = await supabase
        .from('vector_store_config')
        .select('*')
        .eq('key', 'catalog')
        .single();
      
      let vectorStoreId = existingStore?.store_id;
      let needToCreateStore = !vectorStoreId;
      
      // If we have a store ID, verify it still exists
      if (vectorStoreId) {
        try {
          await openai.vectorStores.retrieve(vectorStoreId);
          console.log('Using existing vector store:', vectorStoreId);
        } catch {
          console.log('Vector store not found, will create a new one');
          needToCreateStore = true;
          vectorStoreId = undefined;
        }
      }
      
      if (needToCreateStore) {
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
      
      // Step 5: Get current files in the vector store and unlink them
      console.log('Getting current files in vector store...');
      const listFilesResponse = await fetch(`${baseUrl}/api/vector_stores/list_files?vector_store_id=${vectorStoreId}`);
      
      if (listFilesResponse.ok) {
        const filesData = await listFilesResponse.json();
        const currentFiles = filesData.data || [];
        
        // Unlink and delete all existing files
        console.log(`Found ${currentFiles.length} existing files, cleaning up...`);
        for (const file of currentFiles) {
          try {
            // First unlink from vector store
            await openai.vectorStores.files.del(
              vectorStoreId,
              file.id
            );
            console.log(`Unlinked file from vector store: ${file.id}`);
            
            // Then delete the file from OpenAI storage
            await openai.files.del(file.id);
            console.log(`Deleted file from OpenAI storage: ${file.id}`);
            
          } catch (error) {
            console.error(`Error cleaning up file ${file.id}:`, error);
            // Continue with other files even if one fails
          }
        }
      }

      // Step 6: Add the new file to the vector store
      console.log('Adding new file to vector store...');
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
      
      // Update the shared store configuration to ensure UI consistency
      await supabase
        .from('vector_store_config')
        .upsert(
          {
            key: 'shared',
            store_id: vectorStoreId,
            store_name: storeName,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'key' }
        );
      
      // Step 7: Update the assistant to use the vector store
      console.log('Updating assistant with new vector store...');
      const { data: assistantData } = await supabase
        .from('vector_store_config')
        .select('assistant_id')
        .eq('key', 'catalog')
        .single();
        
      if (assistantData?.assistant_id) {
        try {
          await openai.beta.assistants.update(assistantData.assistant_id, {
            tool_resources: {
              file_search: {
                vector_store_ids: [vectorStoreId]
              }
            }
          });
          console.log('Assistant updated with new vector store');
        } catch (error) {
          console.error('Error updating assistant:', error);
          // Continue even if assistant update fails
        }
      }
      
      // Step 6: Update the shared vector store configuration directly using service role
      // This bypasses RLS policies for admin operations
      const { error: sharedStoreError } = await supabase
        .from('vector_store_config')
        .upsert(
          {
            key: 'shared',
            store_id: vectorStoreId,
            store_name: storeName,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'key' }
        );

      if (sharedStoreError) {
        console.error('Failed to update shared vector store:', sharedStoreError);
        // Continue even if this fails as the main operation was successful
      }

      // Also update the catalog-specific config using the authenticated client
      const { error: updateError } = await supabase
        .from('vector_store_config')
        .upsert(
          {
            key: 'catalog',
            store_id: vectorStoreId,
            store_name: storeName,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'key' }
        );
      
      if (updateError) {
        console.error('Failed to update vector store config:', updateError);
        // Continue even if this fails as the main operation was successful
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
