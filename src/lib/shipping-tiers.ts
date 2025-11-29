/**
 * Category-based shipping tiers for Print Power Purpose
 * 
 * Low Tier — $4.95: Brochures, flyers, stickers, small promo items
 * Medium Tier — $9.95: Photo panels, coroplast signs, medium prints
 * High Tier — $14.95: Aluminum signs, metal prints, large heavy items
 */

export const SHIPPING_TIERS = {
  LOW: 495,    // $4.95 in cents
  MEDIUM: 995, // $9.95 in cents
  HIGH: 1495,  // $14.95 in cents
} as const;

// Map category/subcategory keywords to shipping tiers
const LOW_TIER_KEYWORDS = [
  'brochure', 'flyer', 'sticker', 'label', 'bookmark', 'business card',
  'postcard', 'greeting card', 'invitation', 'notepad', 'envelope',
  'letterhead', 'door hanger', 'digital sheet', 'ncr form', 'booklet',
  'promotional', 'promo'
];

const MEDIUM_TIER_KEYWORDS = [
  'coroplast', 'photo panel', 'foam board', 'poster', 'presentation folder',
  'canvas', 'calendar', 'display board', 'vinyl', 'banner', 'cling',
  'window', 'floor graphic', 'decal', 'magnet', 'yard sign'
];

const HIGH_TIER_KEYWORDS = [
  'aluminum', 'metal', 'a-frame', 'h-stand', 'large format', 
  'pull up', 'retractable', 'heavy'
];

/**
 * Determine shipping tier based on product name and category
 */
export function getShippingTier(productName: string, category?: string | null): number {
  const searchText = `${productName} ${category || ''}`.toLowerCase();
  
  // Check high tier first (most expensive, specific items)
  for (const keyword of HIGH_TIER_KEYWORDS) {
    if (searchText.includes(keyword)) {
      return SHIPPING_TIERS.HIGH;
    }
  }
  
  // Check medium tier
  for (const keyword of MEDIUM_TIER_KEYWORDS) {
    if (searchText.includes(keyword)) {
      return SHIPPING_TIERS.MEDIUM;
    }
  }
  
  // Check low tier
  for (const keyword of LOW_TIER_KEYWORDS) {
    if (searchText.includes(keyword)) {
      return SHIPPING_TIERS.LOW;
    }
  }
  
  // Default to medium tier for unknown categories
  return SHIPPING_TIERS.MEDIUM;
}

/**
 * Calculate total shipping for an order
 * Uses the highest shipping tier among all items (not cumulative)
 */
export function calculateOrderShipping(items: Array<{ name: string; category?: string | null }>): number {
  if (items.length === 0) return 0;
  
  let maxShipping: number = SHIPPING_TIERS.LOW;
  
  for (const item of items) {
    const itemShipping = getShippingTier(item.name, item.category);
    if (itemShipping > maxShipping) {
      maxShipping = itemShipping;
    }
  }
  
  return maxShipping;
}

/**
 * Get shipping tier label for display
 */
export function getShippingTierLabel(shippingCents: number): string {
  switch (shippingCents) {
    case SHIPPING_TIERS.LOW:
      return 'Standard Shipping';
    case SHIPPING_TIERS.MEDIUM:
      return 'Standard Shipping';
    case SHIPPING_TIERS.HIGH:
      return 'Heavy Item Shipping';
    default:
      return 'Shipping';
  }
}
