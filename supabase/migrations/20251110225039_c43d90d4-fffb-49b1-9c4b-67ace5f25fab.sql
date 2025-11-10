-- Create legal_documents table for storing all legal content
CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('privacy', 'terms', 'legal')),
  version integer NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  effective_date date NOT NULL,
  published_at timestamp with time zone,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  changelog text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (type, version)
);

-- Enable RLS
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Public can read published documents
CREATE POLICY "Anyone can view published legal documents"
ON public.legal_documents
FOR SELECT
USING (status = 'published');

-- Admins can view all documents
CREATE POLICY "Admins can view all legal documents"
ON public.legal_documents
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can create documents
CREATE POLICY "Admins can create legal documents"
ON public.legal_documents
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins can update documents
CREATE POLICY "Admins can update legal documents"
ON public.legal_documents
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete documents
CREATE POLICY "Admins can delete legal documents"
ON public.legal_documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_legal_documents_updated_at
BEFORE UPDATE ON public.legal_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_legal_documents_type_status ON public.legal_documents(type, status);
CREATE INDEX idx_legal_documents_published_at ON public.legal_documents(published_at DESC);