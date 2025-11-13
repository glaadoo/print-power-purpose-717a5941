-- Create table for who we serve page content
CREATE TABLE public.who_we_serve_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT NOT NULL UNIQUE CHECK (page_slug IN ('nonprofits', 'schools')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.who_we_serve_pages ENABLE ROW LEVEL SECURITY;

-- Public can read
CREATE POLICY "Anyone can read who we serve pages"
  ON public.who_we_serve_pages
  FOR SELECT
  USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage who we serve pages"
  ON public.who_we_serve_pages
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_who_we_serve_pages_updated_at
  BEFORE UPDATE ON public.who_we_serve_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial content for nonprofits page
INSERT INTO public.who_we_serve_pages (page_slug, content) VALUES (
  'nonprofits',
  '{
    "h1": "Nonprofits & Clubs",
    "subtitle": "Printing with purpose for your mission.",
    "overview": "Transform supporter printing into meaningful donations for your cause. Every time someone prints products supporting your nonprofit, funds automatically flow to your mission. Watch your donation barometer grow as your community prints with purpose—no technical setup required.",
    "who_we_serve": ["501(c)(3) nonprofits", "Community clubs", "Youth organizations", "Faith-based groups", "Environmental & advocacy groups", "Alumni associations", "Animal shelters & rescues", "Cultural & arts organizations"],
    "benefits": [
      {"title": "Automatic Donations", "description": "Earn donations with every supporter purchase—no manual processing needed."},
      {"title": "Clear Progress Tracking", "description": "Visual barometer shows real-time fundraising progress to motivate supporters."},
      {"title": "Easy Discovery", "description": "Supporters find you via curated lists or IRS-verified search."},
      {"title": "Fast Selection", "description": "Transparent, secure nonprofit selection process builds trust."}
    ],
    "products": ["Banners", "Posters", "Stickers", "Flyers", "Apparel", "Promo Items"],
    "use_cases": [
      {"title": "🐾 Animal Rescue Fundraising", "description": "Print adoption event posters and banners while raising funds for shelter operations."},
      {"title": "⛪ Faith-Based Outreach", "description": "Create event flyers and community materials that fund ministry programs."},
      {"title": "📢 Advocacy Campaigns", "description": "Produce campaign materials while building financial support for your cause."}
    ],
    "selection_steps": [
      "Supporters choose your nonprofit from our curated list or search the IRS-verified database.",
      "If selecting from IRS search, new entries show \"Pending approval\" status during verification.",
      "Your nonprofit appears on the donation barometer, product pages, and throughout checkout.",
      "Track donations in real-time as supporters print with purpose."
    ]
  }'::jsonb
);

-- Insert initial content for schools page
INSERT INTO public.who_we_serve_pages (page_slug, content) VALUES (
  'schools',
  '{
    "h1": "Schools & Teams",
    "subtitle": "Purposeful printing for students, teachers, and athletes.",
    "overview": "Supporters print what they need and funds flow to your school or team. Parents, students, and alumni contribute effortlessly while getting quality printing.",
    "who_we_serve": ["K–12 schools", "Universities", "PTA/PTO groups", "Clubs & academic teams", "Sports teams", "Arts & theater groups"],
    "benefits": [
      {"title": "Support Your Mission", "description": "Fund uniforms, travel, supplies, and more through everyday printing."},
      {"title": "Track Progress", "description": "Watch your fundraising grow with real-time barometer updates."},
      {"title": "Easy for Families", "description": "Simple for parents and supporters to contribute while getting what they need."}
    ],
    "products": ["Banners & posters", "Event flyers", "Stickers", "Senior night posters", "Team apparel", "School essentials"],
    "use_cases": [
      {"title": "🏀 Sports Teams", "description": "Raise funds for equipment, travel, and uniforms through supporter printing."},
      {"title": "📚 PTA Support", "description": "Help teachers get classroom supplies while families print school materials."},
      {"title": "🎭 Academic Clubs", "description": "Promote events and raise funds simultaneously with custom printing."}
    ],
    "selection_steps": [
      "Supporters choose your school or team from our curated list or IRS search.",
      "Your organization appears on the barometer and throughout checkout.",
      "Track progress as your community prints with purpose.",
      "Celebrate milestones together as fundraising goals are reached."
    ]
  }'::jsonb
);