/**
 * Shared pricing utilities for edge functions
 * Must be duplicated from frontend code since edge functions can't import from src/
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

export function computeGlobalPricing(input: PricingInput): PricingOutput {
  const { vendor, base_cost_cents, settings } = input;

  if (vendor !== 'sinalite') {
    return {
      base_price_per_unit_cents: base_cost_cents,
      markup_amount_cents: 0,
      donation_per_unit_cents: 0,
      gross_margin_per_unit_cents: 0,
      final_price_per_unit_cents: base_cost_cents,
    };
  }

  let markup_amount_cents: number;
  
  if (settings.markup_mode === 'fixed') {
    markup_amount_cents = settings.markup_fixed_cents;
  } else {
    markup_amount_cents = Math.round(base_cost_cents * (settings.markup_percent / 100));
  }

  let donation_per_unit_cents: number;
  
  if (settings.nonprofit_share_mode === 'fixed') {
    donation_per_unit_cents = Math.min(markup_amount_cents, settings.nonprofit_fixed_cents);
  } else {
    donation_per_unit_cents = Math.round(
      markup_amount_cents * (settings.nonprofit_percent_of_markup / 100)
    );
  }

  let gross_margin_per_unit_cents = markup_amount_cents - donation_per_unit_cents;
  
  if (gross_margin_per_unit_cents < 0) {
    gross_margin_per_unit_cents = 0;
    donation_per_unit_cents = markup_amount_cents;
  }

  const final_price_per_unit_cents = base_cost_cents + markup_amount_cents;

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
