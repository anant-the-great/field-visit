-- Create enum types for roles and visit status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('collection_manager', 'field_agent');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visit_status') THEN
    CREATE TYPE visit_status AS ENUM ('completed', 'pending');
  END IF;
END
$$;

-- 1. Users table (extends auth.users with role and profile info)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'field_agent',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helper to avoid RLS recursion when checking role inside policies
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- 2. Visits table (immutable after submission)
CREATE TABLE IF NOT EXISTS public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  loan_id TEXT NOT NULL CHECK (length(loan_id) = 21),
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL,
  latitude DECIMAL(9, 6) NOT NULL,
  longitude DECIMAL(9, 6) NOT NULL,
  location_address TEXT,
  -- High-level status (for now always 'completed')
  status visit_status DEFAULT 'completed',
  -- Name of the person being visited
  customer_name TEXT NOT NULL,
  -- Detailed visit status selected by the agent
  visit_status TEXT NOT NULL,
  -- Free-form comments from the agent
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Visit photos table
CREATE TABLE IF NOT EXISTS public.visit_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_size_bytes INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Collection managers can see all users
CREATE POLICY "collection_managers_see_all_users" ON public.users
  FOR SELECT
  USING (
    public.current_user_role() = 'collection_manager'
  );

-- Field agents can only see their own profile
CREATE POLICY "field_agents_see_own_profile" ON public.users
  FOR SELECT
  USING (
    public.current_user_role() = 'field_agent'
    AND id = auth.uid()
  );

-- Collection managers can insert and update users (user management)
CREATE POLICY "collection_managers_manage_users" ON public.users
  FOR INSERT
  WITH CHECK (
    public.current_user_role() = 'collection_manager'
  );

CREATE POLICY "collection_managers_update_users" ON public.users
  FOR UPDATE
  USING (
    public.current_user_role() = 'collection_manager'
  )
  WITH CHECK (
    public.current_user_role() = 'collection_manager'
  );

-- RLS Policies for visits table (immutable - no update/delete)
-- Field agents can insert visits
CREATE POLICY "field_agents_insert_visits" ON public.visits
  FOR INSERT
  WITH CHECK (
    public.current_user_role() = 'field_agent'
    AND agent_id = auth.uid()
  );

-- Field agents can see their own visits
CREATE POLICY "field_agents_see_own_visits" ON public.visits
  FOR SELECT
  USING (
    public.current_user_role() = 'field_agent'
    AND agent_id = auth.uid()
  );

-- Collection managers can see all visits
CREATE POLICY "collection_managers_see_all_visits" ON public.visits
  FOR SELECT
  USING (
    public.current_user_role() = 'collection_manager'
  );

-- RLS Policies for visit_photos table
-- Field agents can insert photos for their own visits
CREATE POLICY "field_agents_insert_photos" ON public.visit_photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.visits
      WHERE visits.id = visit_photos.visit_id
      AND visits.agent_id = auth.uid()
    )
  );

-- Anyone authenticated can view photos for visits they can see
CREATE POLICY "view_accessible_photos" ON public.visit_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.visits
      WHERE visits.id = visit_photos.visit_id
      AND (
        visits.agent_id = auth.uid()
        OR public.current_user_role() = 'collection_manager'
      )
    )
  );

-- RLS Policies for audit_logs table
-- Collection managers can view all audit logs
CREATE POLICY "collection_managers_view_audit_logs" ON public.audit_logs
  FOR SELECT
  USING (
    public.current_user_role() = 'collection_manager'
  );

-- Anyone can insert audit logs (for their own actions)
CREATE POLICY "anyone_can_insert_audit_logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
  );

-- Create indexes for common queries
CREATE INDEX idx_visits_agent_id ON public.visits(agent_id);
CREATE INDEX idx_visits_loan_id ON public.visits(loan_id);
CREATE INDEX idx_visits_created_at ON public.visits(created_at DESC);
CREATE INDEX idx_visit_photos_visit_id ON public.visit_photos(visit_id);
CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_users_phone_number ON public.users(phone_number);
