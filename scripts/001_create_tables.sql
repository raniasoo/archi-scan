-- Archi-Scan Database Schema

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  phone TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  site_area NUMERIC NOT NULL,
  zone_type TEXT,
  max_coverage_ratio NUMERIC,
  max_floor_area_ratio NUMERIC,
  max_height NUMERIC,
  max_floors INTEGER,
  road_width NUMERIC,
  road_condition TEXT,
  parking_ratio NUMERIC,
  setback_front NUMERIC,
  setback_side NUMERIC,
  setback_rear NUMERIC,
  design_strategy TEXT,
  additional_notes TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Layouts table
CREATE TABLE IF NOT EXISTS public.layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  floors INTEGER NOT NULL,
  units INTEGER NOT NULL,
  coverage NUMERIC NOT NULL,
  parking INTEGER NOT NULL,
  open_space NUMERIC,
  footprint_area NUMERIC,
  gfa NUMERIC,
  scores JSONB,
  is_recommended BOOLEAN DEFAULT FALSE,
  recommendation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  doc_number TEXT NOT NULL,
  title TEXT NOT NULL,
  layout_id UUID REFERENCES public.layouts(id) ON DELETE SET NULL,
  html_content TEXT,
  financials JSONB,
  regulation_analysis JSONB,
  ai_reasoning JSONB,
  status TEXT DEFAULT 'draft',
  downloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT DEFAULT 'KRW',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_layouts_project_id ON public.layouts(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
