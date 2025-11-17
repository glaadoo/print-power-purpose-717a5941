/**
 * Unified pricing calculation for PPP
 * Single source of truth for product pricing with SinaLite base + markups
 */

export interface PricingInput {
  base_price_cents: number;
  markup_fixed_cents?: number | null;
  markup_percent?: number | null;
}

export interface PricingResult {
  base_price_cents: number;
  markup_fixed_cents: number;
  markup_percent: number;
  final_price_cents: number;
}

/**
 * Compute final price from base + markups
 * 
 * Algorithm:
 * 1) Apply percentage markup to base
 * 2) Add fixed markup
 * 3) Round to eliminate floating point noise
 * 
 * @param base_price_cents - SinaLite base price in cents
 * @param markup_fixed_cents - Fixed markup in cents (optional)
 * @param markup_percent - Percentage markup (e.g., 20 = 20%) (optional)
 * @returns Final unit price in cents
 */
export function computeFinalPrice(
  base_price_cents: number,
  markup_fixed_cents?: number | null,
  markup_percent?: number | null
): number {
  const fixed = markup_fixed_cents ?? 0;
  const percent = markup_percent ?? 0;
  
  let price = base_price_cents;
  
  // Apply percentage markup
  price += base_price_cents * (percent / 100);
  
  // Add fixed markup
  price += fixed;
  
  // Round to eliminate floating point noise
  return Math.round(price);
}

/**
 * Compute pricing with full details
 */
export function computePricingDetails(input: PricingInput): PricingResult {
  const fixed = input.markup_fixed_cents ?? 0;
  const percent = input.markup_percent ?? 0;
  
  return {
    base_price_cents: input.base_price_cents,
    markup_fixed_cents: fixed,
    markup_percent: percent,
    final_price_cents: computeFinalPrice(
      input.base_price_cents,
      fixed,
      percent
    ),
  };
}

/**
 * Format cents as USD currency string
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/**
 * Compute effective markups for a variant
 * Variant overrides take precedence over product defaults
 */
export function getEffectiveMarkups(
  variant: {
    markup_fixed_cents?: number | null;
    markup_percent?: number | null;
  },
  product: {
    markup_fixed_cents?: number | null;
    markup_percent?: number | null;
  }
): {
  markup_fixed_cents: number;
  markup_percent: number;
} {
  return {
    markup_fixed_cents: variant.markup_fixed_cents ?? product.markup_fixed_cents ?? 0,
    markup_percent: variant.markup_percent ?? product.markup_percent ?? 0,
  };
}
