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
    console.log(`Generating AI image for product: ${product.name}`);
    const { data, error } = await supabase.functions.invoke('generate-product-image', {
      body: { 
        productId: product.id, 
        productName: product.name 
      }
    });

    if (error) {
      console.error('Failed to generate product image:', error);
      return null;
    }

    return data?.imageUrl || null;
  } catch (error) {
    console.error('Error calling generate-product-image function:', error);
    return null;
  }
}
