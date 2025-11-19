/**
 * Global SinaLite Pricing Engine
 * Single source of truth for all SinaLite product pricing with admin-configurable markups
 */

export interface PricingSettings {
  vendor: string;
  markup_mode: 'fixed' | 'percent';
  markup_fixed_cents: number;
  markup_percent: number;
  nonprofit_share_mode: 'fixed' | 'percent_of_markup';
  nonprofit_fixed_cents: number;
  nonprofit_percent_of_markup: number;
  currency: string;
}

export interface PricingInput {
  vendor: string;
  base_cost_cents: number;
  settings: PricingSettings;
}

export interface PricingOutput {
  base_price_per_unit_cents: number;
  markup_amount_cents: number;
  donation_per_unit_cents: number;
  gross_margin_per_unit_cents: number;
  final_price_per_unit_cents: number;
}

/**
 * Compute pricing for a SinaLite product using global settings
 * 
 * Algorithm:
 * 1) Compute markup based on mode (fixed $ or % of base)
 * 2) Compute nonprofit donation from markup (fixed $ or % of markup)
 * 3) Compute gross margin (markup - donation)
 * 4) Final price = base + markup
 */
export function computeGlobalPricing(input: PricingInput): PricingOutput {
  const { vendor, base_cost_cents, settings } = input;

  // Only apply global pricing to SinaLite products
  if (vendor !== 'sinalite') {
    return {
      base_price_per_unit_cents: base_cost_cents,
      markup_amount_cents: 0,
      donation_per_unit_cents: 0,
      gross_margin_per_unit_cents: 0,
      final_price_per_unit_cents: base_cost_cents,
    };
  }

  // Step 1: Compute markup amount
  let markup_amount_cents: number;
  
  if (settings.markup_mode === 'fixed') {
    markup_amount_cents = settings.markup_fixed_cents;
  } else { // percent
    markup_amount_cents = Math.round(base_cost_cents * (settings.markup_percent / 100));
  }

  // Step 2: Compute nonprofit donation from markup
  let donation_per_unit_cents: number;
  
  if (settings.nonprofit_share_mode === 'fixed') {
    // Fixed donation, but never more than the markup itself
    donation_per_unit_cents = Math.min(markup_amount_cents, settings.nonprofit_fixed_cents);
  } else { // percent_of_markup
    donation_per_unit_cents = Math.round(
      markup_amount_cents * (settings.nonprofit_percent_of_markup / 100)
    );
  }

  // Step 3: Compute gross margin (what we keep after donation)
  let gross_margin_per_unit_cents = markup_amount_cents - donation_per_unit_cents;
  
  // Safety: never allow negative margin
  if (gross_margin_per_unit_cents < 0) {
    gross_margin_per_unit_cents = 0;
    donation_per_unit_cents = markup_amount_cents;
  }

  // Step 4: Final price
  const final_price_per_unit_cents = base_cost_cents + markup_amount_cents;

  // Debug logging
  console.log('[PPP:PRICING] SinaLite calculation', {
    base_cost_cents,
    markup_mode: settings.markup_mode,
    markup_fixed_cents: settings.markup_fixed_cents,
    markup_percent: settings.markup_percent,
    markup_amount_cents,
    nonprofit_share_mode: settings.nonprofit_share_mode,
    nonprofit_fixed_cents: settings.nonprofit_fixed_cents,
    nonprofit_percent_of_markup: settings.nonprofit_percent_of_markup,
    donation_per_unit_cents,
    gross_margin_per_unit_cents,
    final_price_per_unit_cents,
  });

  return {
    base_price_per_unit_cents: base_cost_cents,
    markup_amount_cents,
    donation_per_unit_cents,
    gross_margin_per_unit_cents,
    final_price_per_unit_cents,
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
