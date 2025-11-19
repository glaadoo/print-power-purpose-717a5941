-- Add generated_image_url column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS generated_image_url TEXT;