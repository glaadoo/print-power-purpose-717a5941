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

    // Verify cron secret if provided in request
    const authHeader = req.headers.get('authorization');
    if (cronSecret && authHeader) {
      const providedSecret = authHeader.replace('Bearer ', '');
      if (providedSecret !== cronSecret) {
        console.error('Invalid CRON_SECRET');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const { quickSeed = false } = await req.json().catch(() => ({ quickSeed: false }));

    console.log(`Starting IRS nonprofit sync - Quick seed: ${quickSeed}`);

    // IRS Publication 78 Data - Organizations eligible to receive tax-deductible contributions
    // Using streaming to handle large file efficiently
    const irsUrl = 'https://apps.irs.gov/pub/epostcard/data-download-pub78.zip';
    
    console.log('Downloading IRS Publication 78 data from:', irsUrl);
    const response = await fetch(irsUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download IRS data: ${response.status} ${response.statusText}`);
    }

    // Download ZIP file
    const zipBuffer = await response.arrayBuffer();
    console.log(`Downloaded ZIP file: ${zipBuffer.byteLength} bytes`);
    
    // Import JSZip for ZIP extraction
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
    const zip = await JSZip.loadAsync(zipBuffer);
    
    // Find the data file in the ZIP
    const fileNames = Object.keys(zip.files);
    const dataFile = fileNames.find(name => 
      name.endsWith('.txt') || name.endsWith('.csv')
    );
    
    if (!dataFile) {
      throw new Error('No data file found in ZIP archive');
    }
    
    console.log(`Extracting file: ${dataFile}`);
    
    // Process records
    let rowsAdded = 0;
    let rowsSkipped = 0;
    const batchSize = 50; // Smaller batches for better performance
    let batch: any[] = [];
    
    // Limit for processing
    const maxRecords = quickSeed ? 100 : 1000; // Much smaller limits
    let processedCount = 0;
    
    console.log(`Processing up to ${maxRecords} records...`);

    // Stream the file content line by line
    const dataStream = await zip.files[dataFile].async('string');
    const lines = dataStream.split('\n');
    
    if (lines.length === 0) {
      throw new Error('No data found in file');
    }
    
    // Parse pipe-delimited header
    const headers = lines[0].split('|').map(h => h.trim().replace(/"/g, ''));
    console.log('First 5 headers:', headers.slice(0, 5));

    // Process lines in small chunks to avoid timeout
    for (let i = 1; i < Math.min(lines.length, maxRecords + 1); i++) {
      const line = lines[i].trim();
      if (!line || processedCount >= maxRecords) break;

      try {
        // Parse pipe-delimited line
        const values = line.split('|').map(v => v.trim().replace(/^"/, '').replace(/"$/, ''));

        if (values.length < 3) continue;

        const record: any = {};
        headers.forEach((header, idx) => {
          if (idx < values.length) {
            record[header] = values[idx] || '';
          }
        });

        // Publication 78 typical fields: EIN, Name, City, State, Country
        const ein = (record.EIN || record.ein || '').replace(/[^0-9]/g, '');
        const name = record.NAME || record['Legal Name'] || record.name || '';
        const city = record.CITY || record.City || record.city || '';
        const state = record.STATE || record.State || record.state || '';

        if (!ein || ein.length !== 9 || !name || name.length < 2) {
          rowsSkipped++;
          continue;
        }

        // Normalize data
        const indexedName = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        
        const nonprofit = {
          ein,
          name: name.trim(),
          city: city.trim() || null,
          state: state.trim() || null,
          country: 'US',
          source: 'irs',
          irs_status: 'active',
          indexed_name: indexedName,
          approved: true,
        };

        batch.push(nonprofit);
        processedCount++;

        // Upsert batch when full
        if (batch.length >= batchSize) {
          const { error } = await supabase
            .from('nonprofits')
            .upsert(batch, { 
              onConflict: 'ein',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error('Batch upsert error:', error);
          } else {
            rowsAdded += batch.length;
            console.log(`Imported ${rowsAdded} records so far...`);
          }

          batch = [];
        }
      } catch (err) {
        console.error('Error processing line', i, ':', err);
        rowsSkipped++;
      }
    }

    // Insert remaining batch
    if (batch.length > 0) {
      const { error } = await supabase
        .from('nonprofits')
        .upsert(batch, { 
          onConflict: 'ein',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Final batch upsert error:', error);
      } else {
        rowsAdded += batch.length;
      }
    }

    const result = {
      success: true,
      quickSeed,
      rowsAdded,
      rowsSkipped,
      totalProcessed: processedCount,
      timestamp: new Date().toISOString()
    };

    console.log('IRS sync complete:', result);

    // Log to system_logs table
    await supabase.from('system_logs').insert({
      level: 'info',
      category: 'irs_sync',
      message: `IRS sync completed: ${rowsAdded} records processed`,
      metadata: result
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('IRS sync error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
