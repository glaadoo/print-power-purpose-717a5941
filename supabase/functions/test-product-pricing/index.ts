import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get sample products from each vendor
    const { data: sinaliteProducts } = await supabase
      .from('products')
      .select('id, name, vendor, vendor_product_id, pricing_data')
      .eq('vendor', 'sinalite')
      .eq('is_active', true)
      .not('name', 'ilike', '%canada%')
      .limit(5);
      
    const { data: scalableProducts } = await supabase
      .from('products')
      .select('id, name, vendor, vendor_product_id, pricing_data')
      .eq('vendor', 'scalablepress')
      .eq('is_active', true)
      .limit(5);
    
    const results: any = {
      timestamp: new Date().toISOString(),
      sinalite: [],
      scalablepress: [],
      summary: {
        total_tested: 0,
        passed: 0,
        failed: 0,
      }
    };
    
    // Test Sinalite products
    if (sinaliteProducts) {
      for (const product of sinaliteProducts) {
        const testResult: any = {
          product_id: product.id,
          product_name: product.name,
          vendor_product_id: product.vendor_product_id,
          status: 'unknown',
          details: {}
        };
        
        try {
          // Check if pricing_data exists and has valid structure
          if (!product.pricing_data || !Array.isArray(product.pricing_data)) {
            testResult.status = 'failed';
            testResult.details.error = 'Invalid pricing_data structure';
          } else {
            const options = product.pricing_data[0];
            if (!Array.isArray(options) || options.length === 0) {
              testResult.status = 'failed';
              testResult.details.error = 'No options in pricing_data';
            } else {
              // Check for NULL groups
              const nullGroups = options.filter((opt: any) => !opt.group || opt.group === '');
              if (nullGroups.length > 0) {
                testResult.status = 'failed';
                testResult.details.error = `${nullGroups.length} options with NULL/empty group`;
              } else {
                // Group options and create default variant key
                const groupMap: Record<string, any[]> = {};
                options.forEach((opt: any) => {
                  if (!groupMap[opt.group]) groupMap[opt.group] = [];
                  groupMap[opt.group].push(opt);
                });
                
                const defaultOptionIds = Object.values(groupMap)
                  .map(opts => opts.sort((a: any, b: any) => {
                    const aNum = parseInt(a.name);
                    const bNum = parseInt(b.name);
                    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                    return a.name.localeCompare(b.name);
                  })[0]?.id)
                  .filter(Boolean);
                
                const variantKey = defaultOptionIds.sort((a, b) => a - b).join('-');
                
                testResult.details.option_groups = Object.keys(groupMap);
                testResult.details.default_variant_key = variantKey;
                testResult.details.option_count = options.length;
                
                // Try calling sinalite-price with PRICEBYKEY
                try {
                  const { data: priceData, error: priceError } = await supabase.functions.invoke('sinalite-price', {
                    body: {
                      productId: product.vendor_product_id,
                      storeCode: 9,
                      variantKey: variantKey,
                      method: 'PRICEBYKEY'
                    }
                  });
                  
                  if (priceError) {
                    testResult.status = 'failed';
                    testResult.details.api_error = priceError.message;
                  } else if (priceData && Array.isArray(priceData) && priceData[0]?.price) {
                    testResult.status = 'passed';
                    testResult.details.price_response = priceData[0].price;
                  } else {
                    testResult.status = 'failed';
                    testResult.details.api_error = 'No price in response';
                    testResult.details.api_response = priceData;
                  }
                } catch (apiErr: any) {
                  testResult.status = 'failed';
                  testResult.details.api_exception = apiErr.message;
                }
              }
            }
          }
        } catch (err: any) {
          testResult.status = 'failed';
          testResult.details.exception = err.message;
        }
        
        results.sinalite.push(testResult);
        results.summary.total_tested++;
        if (testResult.status === 'passed') results.summary.passed++;
        if (testResult.status === 'failed') results.summary.failed++;
      }
    }
    
    // Test Scalable Press products
    if (scalableProducts) {
      for (const product of scalableProducts) {
        const testResult: any = {
          product_id: product.id,
          product_name: product.name,
          vendor_product_id: product.vendor_product_id,
          status: 'unknown',
          details: {}
        };
        
        try {
          if (!product.pricing_data || typeof product.pricing_data !== 'object') {
            testResult.status = 'failed';
            testResult.details.error = 'Invalid pricing_data structure';
          } else {
            const pricingData = product.pricing_data as any;
            
            if (!pricingData.colors || !Array.isArray(pricingData.colors) || pricingData.colors.length === 0) {
              testResult.status = 'failed';
              testResult.details.error = 'No colors available';
            } else if (!pricingData.items || typeof pricingData.items !== 'object') {
              testResult.status = 'failed';
              testResult.details.error = 'No items/pricing available';
            } else {
              // Check if we can extract a price
              let foundPrice = false;
              Object.values(pricingData.items).forEach((colorData: any) => {
                if (typeof colorData === 'object') {
                  Object.values(colorData).forEach((sizeData: any) => {
                    if (sizeData && typeof sizeData.price === 'number') {
                      foundPrice = true;
                      testResult.details.sample_price = sizeData.price;
                    }
                  });
                }
              });
              
              if (foundPrice) {
                testResult.status = 'passed';
                testResult.details.color_count = pricingData.colors.length;
                testResult.details.available_colors = pricingData.colors.map((c: any) => c.name);
              } else {
                testResult.status = 'failed';
                testResult.details.error = 'No prices found in items';
              }
            }
          }
        } catch (err: any) {
          testResult.status = 'failed';
          testResult.details.exception = err.message;
        }
        
        results.scalablepress.push(testResult);
        results.summary.total_tested++;
        if (testResult.status === 'passed') results.summary.passed++;
        if (testResult.status === 'failed') results.summary.failed++;
      }
    }
    
    return new Response(
      JSON.stringify(results, null, 2),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("[TEST-PRODUCT-PRICING] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
