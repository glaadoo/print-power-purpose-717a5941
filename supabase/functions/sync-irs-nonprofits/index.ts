import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IRSRecord {
  EIN: string;
  LEGAL_NAME: string;
  CITY: string;
  STATE: string;
  STATUS: string;
  [key: string]: any;
}

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

    // IRS Exempt Organizations Business Master File Extract (EO BMF)
    // Format: CSV with pipe delimiter
    const irsUrl = 'https://www.irs.gov/pub/irs-soi/eo_info.csv';
    
    console.log('Downloading IRS data from:', irsUrl);
    const response = await fetch(irsUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download IRS data: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    console.log(`Downloaded ${lines.length} total lines`);

    // Parse CSV header
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('CSV Headers:', headers.slice(0, 10));

    // Process records
    let rowsAdded = 0;
    let rowsUpdated = 0;
    let rowsSkipped = 0;
    const batchSize = 100;
    let batch: any[] = [];

    // Limit for quick seed mode
    const maxRecords = quickSeed ? 5000 : Infinity;
    let processedCount = 0;

    for (let i = 1; i < lines.length && processedCount < maxRecords; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        // Parse CSV line (handle quoted fields)
        const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => 
          v.trim().replace(/^"/, '').replace(/"$/, '')
        ) || [];

        if (values.length < headers.length) continue;

        const record: any = {};
        headers.forEach((header, idx) => {
          record[header] = values[idx] || '';
        });

        // Extract key fields (IRS CSV format varies, adjust field names as needed)
        const ein = (record.EIN || record.ein || '').replace(/[^0-9]/g, '');
        const name = record.NAME || record.LEGAL_NAME || record.name || '';
        const city = record.CITY || record.city || '';
        const state = record.STATE || record.state || '';
        const status = record.STATUS || record.status || record.DEDUCTIBILITY || 'unknown';

        if (!ein || ein.length !== 9 || !name) {
          rowsSkipped++;
          continue;
        }

        // Normalize data
        const indexedName = name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        let irsStatus = 'unknown';
        
        // Map IRS status codes
        if (status.toLowerCase().includes('active') || status === '1') {
          irsStatus = 'active';
        } else if (status.toLowerCase().includes('revoked') || status.toLowerCase().includes('terminated')) {
          irsStatus = 'revoked';
        }

        const nonprofit = {
          ein,
          name: name.trim(),
          city: city.trim() || null,
          state: state.trim() || null,
          country: 'US',
          source: 'irs',
          irs_status: irsStatus,
          indexed_name: indexedName,
          approved: true, // Auto-approve IRS records
        };

        batch.push(nonprofit);
        processedCount++;

        // Upsert batch when full
        if (batch.length >= batchSize) {
          const { data, error } = await supabase
            .from('nonprofits')
            .upsert(batch, { 
              onConflict: 'ein',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error('Batch upsert error:', error);
          } else {
            rowsAdded += batch.length;
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
      const { data, error } = await supabase
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
      rowsUpdated,
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
