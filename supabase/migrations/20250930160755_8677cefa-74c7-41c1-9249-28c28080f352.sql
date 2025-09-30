-- Create causes table
create table if not exists causes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  summary text,
  goal_cents integer not null,
  raised_cents integer not null default 0,
  image_url text,
  created_at timestamptz not null default now()
);

-- Create products table
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  vendor text not null default 'mock',
  vendor_id text not null,
  name text not null,
  category text,
  base_cost_cents integer not null,
  image_url text,
  created_at timestamptz not null default now(),
  unique (vendor, vendor_id)
);

-- Create orders table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  cause_id uuid references causes(id),
  qty integer not null default 1 check (qty > 0),
  amount_cents integer not null check (amount_cents >= 0),
  status text not null,
  stripe_cs_id text,
  stripe_pi_id text,
  created_at timestamptz not null default now()
);

-- Enable RLS on all tables
ALTER TABLE causes ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Public read access for causes and products
CREATE POLICY "Public read access for causes"
  ON causes FOR SELECT
  USING (true);

CREATE POLICY "Public read access for products"
  ON products FOR SELECT
  USING (true);

-- Orders only readable by system
CREATE POLICY "Public can view orders"
  ON orders FOR SELECT
  USING (true);

-- Insert seed data for causes
INSERT INTO causes (name, summary, goal_cents, raised_cents, image_url) VALUES
('Senior Class Fund','Help students print for graduation.',500000, 75000, null),
('Community Soccer Club','Posters & banners for youth matches.',350000, 50000, null),
('Neighborhood Library','Flyers to grow reading programs.',300000, 40000, null)
ON CONFLICT DO NOTHING;

-- Insert seed data for products
INSERT INTO products (vendor, vendor_id, name, category, base_cost_cents, image_url) VALUES
('mock','SINA-BC-500','Business Cards (500)','Cards',1500,null),
('mock','SINA-PC-100','Postcards (100)','Cards',1200,null),
('mock','SP-STICK-250','Stickers (250)','Stickers',1000,null),
('mock','SP-BANNER-2x6','Vinyl Banner (2x6 ft)','Banners',2500,null)
ON CONFLICT DO NOTHING;