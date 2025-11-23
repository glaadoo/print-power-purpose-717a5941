import { supabase } from "@/integrations/supabase/client";

interface PrefetchResult {
  success: number;
  failed: number;
  cached: number;
}

const PREFETCH_BATCH_SIZE = 5;
const PREFETCH_BATCH_DELAY = 1000; // 1 second between batches
const MAX_CONSECUTIVE_FAILURES = 3;
const CIRCUIT_BREAKER_RESET_MS = 60000; // 1 minute

// Circuit breaker state
let consecutiveFailures = 0;
let circuitBreakerOpen = false;

function resetCircuitBreaker() {
  console.log('[PricePrefetch] Circuit breaker reset');
  consecutiveFailures = 0;
  circuitBreakerOpen = false;
}

/**
 * Background price prefetching service
 * Loads prices for all products and caches them in sessionStorage
 */
export async function prefetchAllProductPrices(): Promise<PrefetchResult> {
  const result: PrefetchResult = { success: 0, failed: 0, cached: 0 };
  
  try {
    // Get existing cache
    const cache = getCache();
    
    // Fetch all active products with pricing data
    const { data: products, error } = await supabase
      .from('products')
      .select('id, vendor_product_id, pricing_data')
      .eq('is_active', true)
      .eq('vendor', 'sinalite')
      .not('pricing_data', 'is', null);

    if (error || !products) {
      console.warn('[PricePrefetch] Failed to fetch products:', error);
      return result;
    }

    console.log(`[PricePrefetch] Starting prefetch for ${products.length} products`);

    // Process products in batches
    for (let i = 0; i < products.length; i += PREFETCH_BATCH_SIZE) {
      // Check circuit breaker before each batch
      if (circuitBreakerOpen) {
        console.warn('[PricePrefetch] Circuit breaker open - stopping prefetch (API may be down)');
        break;
      }

      const batch = products.slice(i, i + PREFETCH_BATCH_SIZE);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (product) => {
          try {
            // Extract first configuration from pricing_data
            const pricingData = product.pricing_data as any;
            if (!Array.isArray(pricingData) || pricingData.length < 2) {
              throw new Error('Invalid pricing data structure');
            }

            const options = pricingData[0] || [];
            const combinations = pricingData[1] || [];

            if (options.length === 0 || combinations.length === 0) {
              throw new Error('Missing options or combinations');
            }

            // Build variant key from first combination
            const firstCombo = combinations[0];
            const optionIds = firstCombo.options || [];
            const variantKey = optionIds.sort((a: number, b: number) => a - b).join('-');

            // Check if already cached
            if (cache[variantKey]) {
              result.cached++;
              return;
            }

            // Fetch price from API
            const { data, error: priceError } = await supabase.functions.invoke('sinalite-price', {
              body: {
                productId: product.vendor_product_id,
                storeCode: 9,
                variantKey: variantKey,
                method: 'PRICEBYKEY'
              },
            });

            if (priceError || !data || !Array.isArray(data) || data.length === 0 || !data[0]?.price) {
              throw new Error(priceError?.message || 'Invalid price response');
            }

            // Cache the price
            const priceFloat = parseFloat(data[0].price);
            const priceCents = Math.round(priceFloat * 100);
            cache[variantKey] = priceCents;
            result.success++;

          } catch (err) {
            console.warn('[PricePrefetch] Error prefetching price for product:', product.id, err);
            throw err; // Re-throw to count as failure
          }
        })
      );

      // Count failures in this batch
      const batchFailures = batchResults.filter(r => r.status === 'rejected').length;
      const batchSuccesses = batchResults.filter(r => r.status === 'fulfilled').length;
      
      result.failed += batchFailures;
      
      // Track consecutive failures for circuit breaker
      if (batchFailures > 0) {
        consecutiveFailures += batchFailures;
        console.log(`[PricePrefetch] Batch ${Math.floor(i / PREFETCH_BATCH_SIZE) + 1}: ${batchSuccesses} success, ${batchFailures} failed (consecutive failures: ${consecutiveFailures})`);
        
        // Open circuit breaker if too many consecutive failures
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          circuitBreakerOpen = true;
          console.error('[PricePrefetch] Circuit breaker OPEN - SinaLite API appears to be down');
          
          // Schedule circuit breaker reset
          setTimeout(resetCircuitBreaker, CIRCUIT_BREAKER_RESET_MS);
          break;
        }
      } else {
        // Reset consecutive failures on successful batch
        if (consecutiveFailures > 0) {
          console.log('[PricePrefetch] Batch successful - resetting failure counter');
          consecutiveFailures = 0;
        }
      }

      // Update cache after each batch
      setCache(cache);

      // Wait between batches to avoid overwhelming the API
      if (i + PREFETCH_BATCH_SIZE < products.length) {
        await new Promise(resolve => setTimeout(resolve, PREFETCH_BATCH_DELAY));
      }
    }

    console.log('[PricePrefetch] Complete:', result);
    return result;

  } catch (err) {
    console.error('[PricePrefetch] Fatal error:', err);
    return result;
  }
}

function getCache(): Record<string, number> {
  try {
    const cached = sessionStorage.getItem('sinalite-price-cache');
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCache(cache: Record<string, number>) {
  try {
    sessionStorage.setItem('sinalite-price-cache', JSON.stringify(cache));
  } catch (e) {
    console.warn('[PricePrefetch] Failed to update cache:', e);
  }
}

/**
 * Initialize price prefetching after a delay
 * Call this after the app has loaded to warm up the price cache
 */
export function initPricePrefetch(delayMs: number = 2000) {
  // Wait for initial page load to complete
  setTimeout(() => {
    prefetchAllProductPrices().then(result => {
      console.log('[PricePrefetch] Prefetch complete:', 
        `${result.success} successful, ${result.cached} cached, ${result.failed} failed`);
    });
  }, delayMs);
}
