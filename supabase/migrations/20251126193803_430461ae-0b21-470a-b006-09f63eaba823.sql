-- Create video_metadata table for storing video information
CREATE TABLE IF NOT EXISTS public.video_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_name TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_metadata ENABLE ROW LEVEL SECURITY;

-- Public can read active videos
CREATE POLICY "Anyone can read active video metadata"
  ON public.video_metadata
  FOR SELECT
  USING (is_active = true);

-- Admins can manage video metadata
CREATE POLICY "Admins can manage video metadata"
  ON public.video_metadata
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX idx_video_metadata_video_name ON public.video_metadata(video_name);
CREATE INDEX idx_video_metadata_display_order ON public.video_metadata(display_order);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_video_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_metadata_updated_at
  BEFORE UPDATE ON public.video_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_video_metadata_updated_at();

-- Create thumbnails storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-thumbnails', 'video-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for video-thumbnails bucket
CREATE POLICY "Public can view thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'video-thumbnails');

CREATE POLICY "Admins can upload thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'video-thumbnails' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete thumbnails"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'video-thumbnails' AND
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );