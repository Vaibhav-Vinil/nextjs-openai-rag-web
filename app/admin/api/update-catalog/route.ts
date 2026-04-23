import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/config/admin-emails';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Product {
  id: string;
  product_name: string;
  product_img: string;
  description: string;
  more_lowest_price: number;
  offers: Array<{
    base_currency: string;
    lead_time: number | null;
    warehouse: {
      from_country: {
        country_name: string;
      };
    };
  }>;
  pieces_in_pallet: number;
  pallets_in_container: number;
  ProductNavigatePath?: string;
  option_values?: Array<{
    filter_option: {
      option_name: string;
    };
    value: string;
  }>;
}

interface ProcessedProduct {
  id: string;
  product_name: string;
  product_img: string;
  description: string;
  price: number;
  base_currency: string;
  lead_time: string | null;
  country: string;
  pieces_per_pallet: number;
  pallets_per_container: number;
  product_url: string | null;
  specs: Record<string, string>;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !isAdmin(user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('--- DEBUG: CATALOG UPDATE START ---');
    const apiUrl = process.env.CATALOG_API_URL;
    console.log(`DEBUG: process.env.CATALOG_API_URL = "${apiUrl}"`);
    
    if (!apiUrl) {
      throw new Error('CATALOG_API_URL environment variable is not defined');
    }
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch catalog data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.products || !Array.isArray(data.products)) {
      throw new Error('Invalid catalog data format');
    }

    // Step 2: Process the data
    console.log(`Processing ${data.products.length} products...`);
    const processedData = data.products.map((product: Product) => {
      const specs: Record<string, string> = {};
      if (product.option_values) {
        product.option_values.forEach(option => {
          specs[option.filter_option.option_name] = option.value;
        });
      }

      // Format the product URL
      let productUrl = null;
      if (product.ProductNavigatePath) {
        const path = product.ProductNavigatePath.trim();
        const lastSlashIndex = path.lastIndexOf('/');
        if (lastSlashIndex >= 0) {
          const slug = path.substring(lastSlashIndex + 1);
          productUrl = `https://pv.market/product/details/${slug}`;
        } else {
          productUrl = `https://pv.market/product/details/${path.replace(/^\/+|\/+$/g, '')}`;
        }
      }

      return {
        id: product.id,
        product_name: product.product_name,
        product_img: product.product_img,
        description: product.description,
        price: product.more_lowest_price,
        base_currency: product.offers[0].base_currency,
        lead_time: product.offers[0].lead_time ? `${product.offers[0].lead_time} weeks` : null,
        country: product.offers[0].warehouse.from_country.country_name,
        pieces_per_pallet: product.pieces_in_pallet,
        pallets_per_container: product.pallets_in_container,
        product_url: productUrl,
        specs
      } as ProcessedProduct;
    });

    // Step 3: Convert to JSON string
    const jsonData = JSON.stringify(processedData, null, 2);

    // Step 4: Upload the file to OpenAI directly
    console.log('Uploading catalog file to OpenAI...');
    const fileBuffer = Buffer.from(jsonData, 'utf-8');
    const fileBlob = new Blob([fileBuffer], { type: 'application/json' });
    const file = await openai.files.create({
      file: new File([fileBlob], 'catalog.json'),
      purpose: 'assistants',
    });
    
    const fileId = file.id;
    console.log('File uploaded successfully, ID:', fileId);

    // Step 5: Get or create the vector store
    console.log('Getting or creating vector store...');
    const storeName = 'Product Catalog';

    // Check if we already have a vector store in our config
    const { data: existingStore, error: storeError } = await supabase
      .from('vector_store_config')
      .select('*')
      .eq('key', 'catalog')
      .single();

    if (storeError && storeError.code !== 'PGRST116') { // PGRST116 is 'not found' error
      console.error('Error checking for existing vector store:', storeError);
      throw new Error(`Database error: ${storeError.message}`);
    }

    let vectorStoreId = existingStore?.store_id;
    let needToCreateStore = !vectorStoreId;

    // If we have a store ID, verify it still exists
    if (vectorStoreId) {
      try {
        await openai.vectorStores.retrieve(vectorStoreId);
        console.log('Using existing vector store:', vectorStoreId);
      } catch (error) {
        console.log('Vector store not found, will create a new one:', error);
        needToCreateStore = true;
        vectorStoreId = undefined;
      }
    }

    if (needToCreateStore) {
      // Create a new vector store if one doesn't exist
      console.log('Creating new vector store...');
      const vectorStore = await openai.vectorStores.create({
        name: storeName,
      });
      vectorStoreId = vectorStore.id;
      console.log('Created new vector store:', vectorStoreId);

      // Save the new store ID to our config
      const { error: upsertError } = await supabase
        .from('vector_store_config')
        .upsert(
          { key: 'catalog', store_id: vectorStoreId },
          { onConflict: 'key' }
        );

      if (upsertError) {
        console.error('Failed to save vector store config:', upsertError);
        throw new Error(`Failed to save vector store config: ${upsertError.message}`);
      }
    } else {
      console.log('Using existing vector store:', vectorStoreId);
    }

    // Step 5: Get current files in the vector store and unlink them
    console.log('Getting current files in vector store...');
    const files = await openai.vectorStores.files.list(vectorStoreId);
    const currentFiles = files.data || [];

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

    // Now upload the file to the vector store
    console.log('Uploading file to vector store...');

    try {
      // First, delete any existing files in the vector store
      const files = await openai.vectorStores.files.list(vectorStoreId);

      if (files.data && files.data.length > 0) {
        console.log(`Cleaning up ${files.data.length} old files from vector store...`);
        for (const file of files.data) {
          try {
            await openai.vectorStores.files.del(vectorStoreId, file.id);
          } catch (error) {
            console.error(`Error deleting file ${file.id}:`, error);
            // Continue even if deletion fails for some files
          }
        }
      }

      // Upload the new file
      const uploadResult = await openai.vectorStores.files.createAndPoll(vectorStoreId, {
        file_id: fileId
      });
      console.log('File upload to vector store initiated:', uploadResult);

      // The createAndPoll method already handles polling, so we don't need to do it manually
      if (uploadResult.status !== 'completed') {
        throw new Error(`File processing did not complete. Final status: ${uploadResult.status}`);
      }

      console.log('File processing completed successfully');

      // Update the vector store configuration
      const updateConfig = async (key: string) => {
        const { error } = await supabase
          .from('vector_store_config')
          .upsert(
            {
              key,
              store_id: vectorStoreId,
              store_name: storeName,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'key' }
          );

        if (error) {
          console.error(`Failed to update ${key} vector store config:`, error);
          throw error;
        }
      };

      try {
        // Update both shared and catalog configurations
        await Promise.all([
          updateConfig('shared'),
          updateConfig('catalog')
        ]);

        // Update the assistant to use the new vector store if an assistant ID is configured
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
            console.error('Error updating assistant (non-fatal):', error);
            // Continue even if assistant update fails
          }
        }
      } catch (error) {
        console.error('Error updating configurations (non-fatal):', error);
        // Continue with the response even if config updates fail
      }

      console.log('Catalog update completed successfully');

      // Clean up old files from the vector store
      try {
        const files = await openai.files.list();
        const oldFiles = files.data.filter(file =>
          file.filename.startsWith('catalog') &&
          file.id !== fileId &&
          file.purpose === 'assistants' // Only clean up assistant files
        );

        console.log(`Found ${oldFiles.length} old catalog files to clean up`);

        // Delete each old file
        for (const file of oldFiles) {
          try {
            await openai.files.del(file.id);
            console.log(`Deleted old file: ${file.filename} (${file.id})`);
          } catch (error) {
            console.error(`Error deleting old file ${file.id}:`, error);
            // Continue with next file even if one fails
          }
        }
      } catch (error) {
        console.error('Error during old file cleanup:', error);
        // Don't fail the whole operation if cleanup fails
      }

      return NextResponse.json({
        success: true,
        message: 'Catalog updated successfully!',
        fileId,
        vectorStoreId
      });

    } catch (error) {
      console.error('Error uploading file to vector store:', error);
      throw error; // Re-throw to be caught by the outer catch
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
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined
        })
      },
      { status: statusCode }
    );
  }
}
