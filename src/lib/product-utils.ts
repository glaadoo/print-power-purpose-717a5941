/**
 * Product utility functions for filtering and validation
 */

// Type for products with image and active status
export interface ProductWithImage {
  id?: string;
  name: string;
  vendor?: string | null;
  pricing_data?: any;
  image_url?: string | null;
  is_active?: boolean | null;
}

/**
 * Filter products to only include those with valid images and active status.
 * Use this helper on any product list to ensure rendering only shows valid products.
 * 
 * @param products - Array of products to filter
 * @returns Filtered array with only products that have images and are active
 */
export function filterProductsWithImages<T extends ProductWithImage>(products: T[]): T[] {
  return products.filter(
    (p) => p.is_active !== false && !!p.image_url && p.image_url.trim() !== ''
  );
}

/**
 * Check if a single product has a valid image
 */
export function hasValidImage(product: { image_url?: string | null }): boolean {
  return !!product.image_url && product.image_url.trim() !== '';
}

/**
 * Check if a Scalable Press product has at least one color with images
 * Returns true if:
 * - Product is not Scalable Press (show it)
 * - Product has at least one color with non-empty images array
 * - pricing_data is not available (show product on list pages where data isn't fetched)
 * Returns false if:
 * - Product is Scalable Press and ALL colors have empty images arrays
 */
export function hasScalablePressImages(product: {
  vendor?: string | null;
  pricing_data?: any;
}): boolean {
  // Non-Scalable Press products: always show
  if (product.vendor !== 'scalablepress') {
    return true;
  }
  
  // No pricing_data: show product (can't verify images, but don't hide on list pages)
  if (!product.pricing_data) {
    return true;
  }
  
  // Check colors array
  const colors = product.pricing_data?.colors;
  if (!Array.isArray(colors) || colors.length === 0) {
    return true; // Show if no colors data available
  }
  
  // Check if ANY color has at least one image
  return colors.some((color: any) => {
    const images = color?.images;
    return Array.isArray(images) && images.length > 0;
  });
}

/**
 * Check if a SinaLite product has an image
 * Returns true always for SinaLite products (show all regardless of image)
 */
export function hasSinaliteImage(product: {
  vendor?: string | null;
  image_url?: string | null;
}): boolean {
  // Always show all products - no image filtering for SinaLite
  return true;
}

/**
 * Filter out Canada products by name
 */
export function isNotCanadaProduct(product: { name: string }): boolean {
  const nameLower = product.name.toLowerCase();
  return !nameLower.includes('canada');
}

/**
 * Combined filter: not Canada AND has images (vendor-specific checks)
 */
export function shouldShowProduct(product: {
  name: string;
  vendor?: string | null;
  pricing_data?: any;
  image_url?: string | null;
  is_active?: boolean | null;
}): boolean {
  // Must be active and have valid image
  if (product.is_active === false) return false;
  if (!hasValidImage(product)) return false;
  
  return isNotCanadaProduct(product) && hasScalablePressImages(product) && hasSinaliteImage(product);
}
