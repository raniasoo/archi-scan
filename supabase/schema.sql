-- Archi-Scan Supabase Schema
-- Run this in your Supabase SQL Editor

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  name TEXT,
  company TEXT,
  subscription_tier TEXT DEFAULT 'free',
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  site_area NUMERIC NOT NULL,
  zone_type TEXT,
  design_strategy TEXT,
  status TEXT DEFAULT 'draft',
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Layouts
CREATE TABLE IF NOT EXISTS layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  floors INT,
  units INT,
  coverage NUMERIC,
  parking INT,
  gfa NUMERIC,
  scores JSONB,
  is_recommended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  doc_number TEXT,
  title TEXT,
  html_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view own layouts" ON layouts FOR SELECT USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (user_id = auth.uid());
