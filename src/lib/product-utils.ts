/**
 * Product utility functions for filtering and validation
 */

/**
 * Check if a Scalable Press product has at least one color with images
 * Returns true if:
 * - Product is not Scalable Press (show it)
 * - Product has at least one color with non-empty images array
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
  
  // No pricing_data: hide (can't verify images)
  if (!product.pricing_data) {
    return false;
  }
  
  // Check colors array
  const colors = product.pricing_data?.colors;
  if (!Array.isArray(colors) || colors.length === 0) {
    return false;
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
}): boolean {
  return isNotCanadaProduct(product) && hasScalablePressImages(product) && hasSinaliteImage(product);
}
