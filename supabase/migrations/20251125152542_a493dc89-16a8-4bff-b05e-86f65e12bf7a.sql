-- Add parent_id to categories table for parent-child relationships
ALTER TABLE public.categories 
ADD COLUMN parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
ADD COLUMN icon_emoji TEXT;

-- Create index for faster parent-child queries
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);

-- Clear existing categories and insert new mega-menu structure
DELETE FROM public.categories;

-- Insert parent categories with emojis
INSERT INTO public.categories (id, name, slug, display_order, is_active, icon_emoji) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Signs & Displays', 'signs-displays', 1, true, '🟥'),
  ('22222222-2222-2222-2222-222222222222', 'Banners', 'banners', 2, true, '🟧'),
  ('33333333-3333-3333-3333-333333333333', 'Promotional Products', 'promotional', 3, true, '🟨'),
  ('44444444-4444-4444-4444-444444444444', 'Apparel', 'apparel', 4, true, '🟩'),
  ('55555555-5555-5555-5555-555555555555', 'Cards & Invitations', 'cards-invitations', 5, true, '🟦'),
  ('66666666-6666-6666-6666-666666666666', 'Marketing Materials', 'marketing', 6, true, '🟪'),
  ('77777777-7777-7777-7777-777777777777', 'Specialty Products', 'specialty', 7, true, '⬛');

-- Insert Signs & Displays subcategories
INSERT INTO public.categories (name, slug, parent_id, display_order, is_active) VALUES
  ('A-Frame Signs', 'a-frame-signs', '11111111-1111-1111-1111-111111111111', 1, true),
  ('A Frame Stands', 'a-frame-stands', '11111111-1111-1111-1111-111111111111', 2, true),
  ('Aluminum Signs', 'aluminum-signs', '11111111-1111-1111-1111-111111111111', 3, true),
  ('Coroplast Signs', 'coroplast-signs', '11111111-1111-1111-1111-111111111111', 4, true),
  ('H-Stands for Signs', 'h-stands', '11111111-1111-1111-1111-111111111111', 5, true),
  ('Yard Signs', 'yard-signs', '11111111-1111-1111-1111-111111111111', 6, true),
  ('Display Board', 'display-board', '11111111-1111-1111-1111-111111111111', 7, true),
  ('Floor Graphics', 'floor-graphics', '11111111-1111-1111-1111-111111111111', 8, true),
  ('Large Format Posters', 'large-format-posters', '11111111-1111-1111-1111-111111111111', 9, true),
  ('Wall Decals', 'wall-decals', '11111111-1111-1111-1111-111111111111', 10, true),
  ('Window Clings', 'window-clings', '11111111-1111-1111-1111-111111111111', 11, true);

-- Insert Banners subcategories
INSERT INTO public.categories (name, slug, parent_id, display_order, is_active) VALUES
  ('Pull Up Banners', 'pull-up-banners', '22222222-2222-2222-2222-222222222222', 1, true),
  ('Pull Up Banner Stands', 'banner-stands', '22222222-2222-2222-2222-222222222222', 2, true),
  ('Vinyl Banners', 'vinyl-banners', '22222222-2222-2222-2222-222222222222', 3, true);

-- Insert Promotional Products subcategories
INSERT INTO public.categories (name, slug, parent_id, display_order, is_active) VALUES
  ('Booklets', 'booklets', '33333333-3333-3333-3333-333333333333', 1, true),
  ('Bookmarks', 'bookmarks', '33333333-3333-3333-3333-333333333333', 2, true),
  ('Notepads', 'notepads', '33333333-3333-3333-3333-333333333333', 3, true),
  ('Envelopes', 'envelopes', '33333333-3333-3333-3333-333333333333', 4, true),
  ('Forms', 'forms', '33333333-3333-3333-3333-333333333333', 5, true),
  ('Digital Sheets', 'digital-sheets', '33333333-3333-3333-3333-333333333333', 6, true),
  ('Stickers', 'stickers', '33333333-3333-3333-3333-333333333333', 7, true);

-- Insert Apparel subcategories
INSERT INTO public.categories (name, slug, parent_id, display_order, is_active) VALUES
  ('Clothing', 'clothing', '44444444-4444-4444-4444-444444444444', 1, true),
  ('Dress Shirts', 'dress-shirts', '44444444-4444-4444-4444-444444444444', 2, true),
  ('Aprons', 'aprons', '44444444-4444-4444-4444-444444444444', 3, true),
  ('Hats', 'hats', '44444444-4444-4444-4444-444444444444', 4, true),
  ('Beanies', 'beanies', '44444444-4444-4444-4444-444444444444', 5, true),
  ('Full Brim Hats', 'full-brim-hats', '44444444-4444-4444-4444-444444444444', 6, true),
  ('Bags', 'bags', '44444444-4444-4444-4444-444444444444', 7, true),
  ('Backpacks', 'backpacks', '44444444-4444-4444-4444-444444444444', 8, true),
  ('Tote Bags', 'tote-bags', '44444444-4444-4444-4444-444444444444', 9, true);

-- Insert Cards & Invitations subcategories
INSERT INTO public.categories (name, slug, parent_id, display_order, is_active) VALUES
  ('Greeting Cards', 'greeting-cards', '55555555-5555-5555-5555-555555555555', 1, true),
  ('Specialty Cards', 'specialty-cards', '55555555-5555-5555-5555-555555555555', 2, true),
  ('Postcards', 'postcards', '55555555-5555-5555-5555-555555555555', 3, true),
  ('Invitations', 'invitations', '55555555-5555-5555-5555-555555555555', 4, true),
  ('Folded Business Cards', 'folded-business-cards', '55555555-5555-5555-5555-555555555555', 5, true),
  ('Business Cards', 'business-cards', '55555555-5555-5555-5555-555555555555', 6, true);

-- Insert Marketing Materials subcategories
INSERT INTO public.categories (name, slug, parent_id, display_order, is_active) VALUES
  ('Flyers', 'flyers', '66666666-6666-6666-6666-666666666666', 1, true),
  ('Posters', 'posters', '66666666-6666-6666-6666-666666666666', 2, true),
  ('Presentation Folders', 'presentation-folders', '66666666-6666-6666-6666-666666666666', 3, true),
  ('Door Hangers', 'door-hangers', '66666666-6666-6666-6666-666666666666', 4, true),
  ('Brochures', 'brochures', '66666666-6666-6666-6666-666666666666', 5, true);

-- Insert Specialty Products subcategories
INSERT INTO public.categories (name, slug, parent_id, display_order, is_active) VALUES
  ('Covid-19 Decals', 'covid-decals', '77777777-7777-7777-7777-777777777777', 1, true),
  ('Wall Calendars', 'wall-calendars', '77777777-7777-7777-7777-777777777777', 2, true),
  ('Canvas Prints', 'canvas-prints', '77777777-7777-7777-7777-777777777777', 3, true),
  ('Foam Board', 'foam-board', '77777777-7777-7777-7777-777777777777', 4, true);