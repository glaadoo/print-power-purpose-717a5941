import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "@/integrations/supabase/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const priceFromBase = (base: number) => Math.max(100, Math.round(base * 1.6));

/**
 * Maps color names to hex values for display
 * Used as fallback when API doesn't provide hex colors
 */
export function getColorHex(colorName: string, apiHex?: string): string {
  // Use API hex if available
  if (apiHex && apiHex.startsWith('#')) {
    return apiHex;
  }
  
  // Common color name to hex mapping
  const colorMap: Record<string, string> = {
    // Basic colors
    'red': '#EF4444',
    'blue': '#3B82F6',
    'green': '#10B981',
    'yellow': '#F59E0B',
    'orange': '#F97316',
    'purple': '#A855F7',
    'pink': '#EC4899',
    'black': '#000000',
    'white': '#FFFFFF',
    'gray': '#6B7280',
    'grey': '#6B7280',
    'brown': '#92400E',
    'navy': '#1E3A8A',
    'teal': '#14B8A6',
    'cyan': '#06B6D4',
    'lime': '#84CC16',
    'indigo': '#6366F1',
    'violet': '#8B5CF6',
    'fuchsia': '#D946EF',
    'rose': '#F43F5E',
    'sky': '#0EA5E9',
    'emerald': '#059669',
    'amber': '#F59E0B',
    
    // Extended colors
    'maroon': '#800000',
    'olive': '#808000',
    'aqua': '#00FFFF',
    'silver': '#C0C0C0',
    'gold': '#FFD700',
    'beige': '#F5F5DC',
    'tan': '#D2B48C',
    'khaki': '#F0E68C',
    'coral': '#FF7F50',
    'salmon': '#FA8072',
    'crimson': '#DC143C',
    'mint': '#98FF98',
    'peach': '#FFDAB9',
    'lavender': '#E6E6FA',
    'plum': '#DDA0DD',
    'burgundy': '#800020',
    'charcoal': '#36454F',
    'cream': '#FFFDD0',
    'ivory': '#FFFFF0',
    'turquoise': '#40E0D0',
  };
  
  // Convert to lowercase and remove spaces for matching
  const normalizedName = colorName.toLowerCase().trim().replace(/\s+/g, '');
  
  // Try exact match first
  if (colorMap[normalizedName]) {
    return colorMap[normalizedName];
  }
  
  // Try partial match
  const matchedKey = Object.keys(colorMap).find(key => 
    normalizedName.includes(key) || key.includes(normalizedName)
  );
  
  if (matchedKey) {
    return colorMap[matchedKey];
  }
  
  // Default fallback
  return '#94A3B8'; // Neutral gray
}

/**
 * Gets the best available image URL for a product
 * Priority: image_url (from Sinalite) -> generated_image_url -> generate new
 */
export async function getProductImageUrl(product: {
  id: string;
  name: string;
  image_url?: string | null;
  generated_image_url?: string | null;
}): Promise<string | null> {
  // Return Sinalite image if available
  if (product.image_url) {
    return product.image_url;
  }

  // Return cached generated image if available
  if (product.generated_image_url) {
    return product.generated_image_url;
  }

  // Generate new image
  try {
    console.log(`[Image Gen] Starting generation for: ${product.name} (ID: ${product.id})`);
    
    const { data, error } = await supabase.functions.invoke('generate-product-image', {
      body: { 
        productId: product.id, 
        productName: product.name 
      }
    });

    console.log(`[Image Gen] Response for ${product.name}:`, { data, error });

    if (error) {
      console.error(`[Image Gen] Error for ${product.name}:`, error);
      throw new Error(`Image generation failed: ${error.message || JSON.stringify(error)}`);
    }

    if (!data?.imageUrl) {
      console.error(`[Image Gen] No imageUrl in response for ${product.name}`, data);
      throw new Error('No image URL returned from generation function');
    }

    console.log(`[Image Gen] Success for ${product.name}: ${data.imageUrl}`);
    return data.imageUrl;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Image Gen] Exception for ${product.name}:`, errorMsg);
    throw error; // Re-throw to be caught by the admin page
  }
}
