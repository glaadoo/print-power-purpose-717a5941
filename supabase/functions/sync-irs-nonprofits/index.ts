import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify cron secret if provided
    const authHeader = req.headers.get('authorization');
    if (cronSecret && authHeader) {
      const providedSecret = authHeader.replace('Bearer ', '');
      if (providedSecret !== cronSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const maxImport = body.maxRecords || 10000; // Default 10k records
    const skipRecords = body.skipRecords || 0; // Allow resuming from offset
    
    console.log(`Starting IRS import: max=${maxImport}, skip=${skipRecords}`);

    // Download IRS Publication 78 Data
    const irsUrl = 'https://apps.irs.gov/pub/epostcard/data-download-pub78.zip';
    console.log('Downloading IRS data...');
    
    const response = await fetch(irsUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const zipBuffer = await response.arrayBuffer();
    console.log(`Downloaded: ${Math.round(zipBuffer.byteLength / 1024 / 1024)}MB`);
    
    // Extract ZIP using JSZip
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
    const zip = await JSZip.loadAsync(zipBuffer);
    
    const dataFile = Object.keys(zip.files).find(name => 
      name.endsWith('.txt') || name.endsWith('.csv')
    );
    
    if (!dataFile) {
      throw new Error('No data file in ZIP');
    }
    
    console.log(`Extracting: ${dataFile}`);
    
    // Start background processing
    const processingPromise = (async () => {
      let rowsAdded = 0;
      let rowsSkipped = 0;
      let rowsProcessed = 0;
      const insertBatchSize = 100;
      let batch: any[] = [];
      
      // Stream file content
      const fileText = await zip.files[dataFile].async('string');
      const lines = fileText.split('\n');
      
      // Parse header (pipe-delimited)
      const headers = lines[0].split('|').map(h => h.trim().replace(/"/g, ''));
      console.log(`Headers found: ${headers.length} columns`);
      
      // Find column indices
      const einIdx = headers.findIndex(h => h.toUpperCase() === 'EIN');
      const nameIdx = headers.findIndex(h => 
        h.toUpperCase() === 'NAME' || h.toUpperCase().includes('LEGAL')
      );
      const cityIdx = headers.findIndex(h => h.toUpperCase() === 'CITY');
      const stateIdx = headers.findIndex(h => h.toUpperCase() === 'STATE');
      const statusIdx = headers.findIndex(h => 
        h.toUpperCase().includes('STATUS') || h.toUpperCase().includes('DEDUCT')
      );
      
      console.log(`Column indices - EIN:${einIdx}, Name:${nameIdx}, City:${cityIdx}, State:${stateIdx}, Status:${statusIdx}`);
      
      // Process lines with skip and limit
      const startLine = skipRecords + 1; // +1 for header
      const endLine = Math.min(startLine + maxImport, lines.length);
      
      console.log(`Processing lines ${startLine} to ${endLine} (${endLine - startLine} records)`);
      
      for (let i = startLine; i < endLine; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;
        
        try {
          const values = line.split('|').map(v => v.trim().replace(/^"|"$/g, ''));
          
          // Extract essential fields only
          const ein = (values[einIdx] || '').replace(/[^0-9]/g, '');
          const name = values[nameIdx] || '';
          const city = values[cityIdx] || '';
          const state = values[stateIdx] || '';
          const status = values[statusIdx] || '';
          
          // Validation
          if (!ein || ein.length !== 9 || !name || name.length < 3) {
            rowsSkipped++;
            continue;
          }
          
          // Normalize
          const indexedName = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
          
          batch.push({
            ein,
            name: name.substring(0, 255), // Limit length
            city: city.substring(0, 100) || null,
            state: state.substring(0, 50) || null,
            country: 'US',
            source: 'irs',
            irs_status: 'active',
            indexed_name: indexedName.substring(0, 255),
            approved: true,
          });
          
          rowsProcessed++;
          
          // Insert batch
          if (batch.length >= insertBatchSize) {
            const { error } = await supabase
              .from('nonprofits')
              .upsert(batch, { onConflict: 'ein', ignoreDuplicates: false });
            
            if (error) {
              console.error('Batch insert error:', error.message);
            } else {
              rowsAdded += batch.length;
            }
            
            batch = [];
            
            // Progress log every 1000 records
            if (rowsProcessed % 1000 === 0) {
              console.log(`Progress: ${rowsProcessed} processed, ${rowsAdded} added`);
            }
          }
        } catch (err) {
          rowsSkipped++;
        }
      }
      
      // Final batch
      if (batch.length > 0) {
        const { error } = await supabase
          .from('nonprofits')
          .upsert(batch, { onConflict: 'ein', ignoreDuplicates: false });
        
        if (!error) {
          rowsAdded += batch.length;
        }
      }
      
      const result = {
        success: true,
        rowsAdded,
        rowsSkipped,
        rowsProcessed,
        totalLinesInFile: lines.length - 1,
        skipRecords,
        maxRecords: maxImport,
        timestamp: new Date().toISOString()
      };
      
      console.log('Import complete:', result);
      
      // Log to system
      await supabase.from('system_logs').insert({
        level: 'info',
        category: 'irs_sync',
        message: `IRS import: ${rowsAdded} added, ${rowsSkipped} skipped`,
        metadata: result
      });
      
      return result;
    })();
    
    // Return early response while processing continues in background
    return new Response(
      JSON.stringify({ 
        status: 'processing',
        message: 'Import started in background',
        expectedRecords: maxImport 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Import error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
