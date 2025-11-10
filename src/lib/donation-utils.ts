/**
 * Centralized donation validation and normalization utilities
 */

const STRIPE_MIN_AMOUNT_CENTS = 50; // Stripe minimum is $0.50
const MAX_DONATION_CENTS = 10000000; // $100,000 max

/**
 * Normalizes a donation amount in cents.
 * - Clamps to valid range (0 to MAX_DONATION_CENTS)
 * - If below Stripe minimum but > 0, returns 0 (skip donation)
 * - Rounds to nearest integer
 */
export function normalizeDonationCents(cents: number | undefined | null): number {
  if (cents === undefined || cents === null || isNaN(cents)) {
    return 0;
  }

  // Ensure integer
  const normalized = Math.floor(Number(cents));

  // Clamp to valid range
  const clamped = Math.max(0, Math.min(MAX_DONATION_CENTS, normalized));

  // If below Stripe minimum but > 0, treat as 0
  if (clamped > 0 && clamped < STRIPE_MIN_AMOUNT_CENTS) {
    return 0;
  }

  return clamped;
}

/**
 * Normalizes a donation amount in USD dollars.
 * - Converts to cents
 * - Applies same validation as normalizeDonationCents
 */
export function normalizeDonationUsd(dollars: number | undefined | null): number {
  if (dollars === undefined || dollars === null || isNaN(dollars)) {
    return 0;
  }

  const cents = Math.round(Number(dollars) * 100);
  return normalizeDonationCents(cents);
}

/**
 * Validates that a donation amount in cents is valid for Stripe
 */
export function isValidDonationCents(cents: number): boolean {
  return cents === 0 || (cents >= STRIPE_MIN_AMOUNT_CENTS && cents <= MAX_DONATION_CENTS);
}

/**
 * Formats donation amount for display
 */
export function formatDonation(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculates transaction fees (approximation)
 * Stripe charges ~2.9% + $0.30
 */
export function calculateWithTransactionFees(amountUsd: number): number {
  return Math.round((amountUsd + 0.30) / 0.971 * 100) / 100;
}
