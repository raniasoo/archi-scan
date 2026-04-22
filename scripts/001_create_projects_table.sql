-- ============================================================================
-- Saved Projects Table for Feasibility Report System
-- This is a separate extension module - does NOT modify the frozen report template
-- ============================================================================

-- Create saved_projects table
CREATE TABLE IF NOT EXISTS public.saved_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Project metadata
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Project thumbnail/preview (optional, for future use)
  thumbnail_url TEXT,
  
  -- Complete project snapshot as JSONB
  -- Contains all report input state: basic info, regulation, layouts, financials, etc.
  project_data JSONB NOT NULL,
  
  -- Document metadata
  document_number TEXT,
  address TEXT,
  site_area_sqm NUMERIC,
  
  -- For future user association (currently anonymous)
  user_id UUID,
  
  -- Soft delete support
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_projects_created_at ON public.saved_projects (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_projects_address ON public.saved_projects (address);
CREATE INDEX IF NOT EXISTS idx_saved_projects_is_deleted ON public.saved_projects (is_deleted);

-- Enable Row Level Security
ALTER TABLE public.saved_projects ENABLE ROW LEVEL SECURITY;

-- For now, allow anonymous access (no auth required)
-- This can be updated later when user authentication is added
CREATE POLICY "Allow anonymous read" ON public.saved_projects 
  FOR SELECT USING (is_deleted = FALSE);

CREATE POLICY "Allow anonymous insert" ON public.saved_projects 
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Allow anonymous update" ON public.saved_projects 
  FOR UPDATE USING (is_deleted = FALSE);

CREATE POLICY "Allow anonymous delete" ON public.saved_projects 
  FOR DELETE USING (TRUE);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to saved_projects
DROP TRIGGER IF EXISTS update_saved_projects_updated_at ON public.saved_projects;
CREATE TRIGGER update_saved_projects_updated_at
  BEFORE UPDATE ON public.saved_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
