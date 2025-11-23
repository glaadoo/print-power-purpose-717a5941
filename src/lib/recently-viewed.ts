// Utility for managing recently viewed products in localStorage

const STORAGE_KEY = 'ppp_recently_viewed';
const MAX_ITEMS = 10;

export type RecentlyViewedProduct = {
  id: string;
  name: string;
  image_url?: string | null;
  category?: string | null;
  viewedAt: number;
};

/**
 * Add a product to recently viewed list
 */
export function addRecentlyViewed(product: {
  id: string;
  name: string;
  image_url?: string | null;
  category?: string | null;
}) {
  try {
    const existing = getRecentlyViewed();
    
    // Remove if already exists to avoid duplicates
    const filtered = existing.filter(p => p.id !== product.id);
    
    // Add to beginning of array
    const updated: RecentlyViewedProduct[] = [
      {
        ...product,
        viewedAt: Date.now()
      },
      ...filtered
    ].slice(0, MAX_ITEMS); // Keep only MAX_ITEMS
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    console.log('[RecentlyViewed] Added product:', product.name);
  } catch (error) {
    console.error('[RecentlyViewed] Failed to save:', error);
  }
}

/**
 * Get all recently viewed products
 */
export function getRecentlyViewed(): RecentlyViewedProduct[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    
    // Validate structure
    if (!Array.isArray(parsed)) return [];
    
    return parsed.filter(item => 
      item && 
      typeof item === 'object' && 
      item.id && 
      item.name &&
      item.viewedAt
    );
  } catch (error) {
    console.error('[RecentlyViewed] Failed to load:', error);
    return [];
  }
}

/**
 * Clear all recently viewed products
 */
export function clearRecentlyViewed() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[RecentlyViewed] Cleared all');
  } catch (error) {
    console.error('[RecentlyViewed] Failed to clear:', error);
  }
}

/**
 * Remove a specific product from recently viewed
 */
export function removeRecentlyViewed(productId: string) {
  try {
    const existing = getRecentlyViewed();
    const updated = existing.filter(p => p.id !== productId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log('[RecentlyViewed] Removed product:', productId);
  } catch (error) {
    console.error('[RecentlyViewed] Failed to remove:', error);
  }
}
