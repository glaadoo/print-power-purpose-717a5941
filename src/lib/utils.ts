import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "@/integrations/supabase/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const priceFromBase = (base: number) => Math.max(100, Math.round(base * 1.6));

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
