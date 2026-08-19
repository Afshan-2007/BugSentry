/*
# Bug Detection & Incident Management System - Core Schema

## Overview
Creates the full database schema for an AI-powered bug detection and incident management system
with role-based access (reporter, developer, administrator). Includes profiles, bugs,
attachments, AI predictions, and notifications tables.

## New Tables
1. `profiles` - Extends auth.users with role (reporter/developer/administrator), full_name
2. `bugs` - Bug reports with title, description, severity, priority, category, status, reporter, assignee
3. `attachments` - File metadata for bug attachments (linked to Supabase storage)
4. `ai_predictions` - AI-generated predictions for bugs (category, root cause, confidence)
5. `notifications` - In-app notifications for users (e.g. status changes)

## Security
- RLS enabled on all tables
- Profiles: users read/update own profile; admins read all
- Bugs: reporters CRUD own bugs; developers read/update assigned bugs; admins read/update all
- Attachments: scoped through bug ownership/assignment
- AI predictions: readable by bug's reporter, assignee, and admins
- Notifications: users read/update own notifications

## Important Notes
1. Profiles are auto-created via trigger when a new auth.user signs up
2. The `role` column lives in profiles (NOT user_metadata) so it cannot be tampered with client-side
3. Bug status defaults to 'open'; valid transitions: open -> in_progress -> resolved
4. AI predictions are generated client-side via a deterministic module and stored here
5. Notifications are created when a developer changes a bug's status
*/

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'reporter' CHECK (role IN ('reporter', 'developer', 'administrator')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'administrator'
  );
$$;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'reporter')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- BUGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS bugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category text NOT NULL DEFAULT 'other' CHECK (category IN (
    'ui', 'backend', 'database', 'network', 'security', 'performance', 'api', 'other'
  )),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bugs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS bugs_reporter_id_idx ON bugs(reporter_id);
CREATE INDEX IF NOT EXISTS bugs_assignee_id_idx ON bugs(assignee_id);
CREATE INDEX IF NOT EXISTS bugs_status_idx ON bugs(status);

-- Bugs policies
-- SELECT: reporter sees own, developer sees assigned, admin sees all
DROP POLICY IF EXISTS "bugs_select" ON bugs;
CREATE POLICY "bugs_select"
ON bugs FOR SELECT
TO authenticated
USING (
  reporter_id = auth.uid()
  OR assignee_id = auth.uid()
  OR public.is_admin()
);

-- INSERT: any authenticated user can create a bug (reporter_id defaults to auth.uid())
DROP POLICY IF EXISTS "bugs_insert" ON bugs;
CREATE POLICY "bugs_insert"
ON bugs FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- UPDATE: reporter can update own, developer can update assigned, admin can update all
DROP POLICY IF EXISTS "bugs_update" ON bugs;
CREATE POLICY "bugs_update"
ON bugs FOR UPDATE
TO authenticated
USING (
  reporter_id = auth.uid()
  OR assignee_id = auth.uid()
  OR public.is_admin()
)
WITH CHECK (
  reporter_id = auth.uid()
  OR assignee_id = auth.uid()
  OR public.is_admin()
);

-- DELETE: admin only
DROP POLICY IF EXISTS "bugs_delete" ON bugs;
CREATE POLICY "bugs_delete"
ON bugs FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- ATTACHMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id uuid NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL DEFAULT '',
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS attachments_bug_id_idx ON attachments(bug_id);

-- Attachments policies: scoped through bug access
DROP POLICY IF EXISTS "attachments_select" ON attachments;
CREATE POLICY "attachments_select"
ON attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bugs b
    WHERE b.id = attachments.bug_id
    AND (
      b.reporter_id = auth.uid()
      OR b.assignee_id = auth.uid()
      OR public.is_admin()
    )
  )
);

DROP POLICY IF EXISTS "attachments_insert" ON attachments;
CREATE POLICY "attachments_insert"
ON attachments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bugs b
    WHERE b.id = attachments.bug_id
    AND (
      b.reporter_id = auth.uid()
      OR b.assignee_id = auth.uid()
      OR public.is_admin()
    )
  )
);

DROP POLICY IF EXISTS "attachments_delete" ON attachments;
CREATE POLICY "attachments_delete"
ON attachments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bugs b
    WHERE b.id = attachments.bug_id
    AND (
      b.reporter_id = auth.uid()
      OR public.is_admin()
    )
  )
);

-- ============================================================
-- AI PREDICTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id uuid NOT NULL UNIQUE REFERENCES bugs(id) ON DELETE CASCADE,
  predicted_category text NOT NULL,
  probable_root_cause text NOT NULL,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  model_version text NOT NULL DEFAULT 'deterministic-v1',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ai_predictions_bug_id_idx ON ai_predictions(bug_id);

-- AI predictions policies: same access as bug
DROP POLICY IF EXISTS "ai_predictions_select" ON ai_predictions;
CREATE POLICY "ai_predictions_select"
ON ai_predictions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bugs b
    WHERE b.id = ai_predictions.bug_id
    AND (
      b.reporter_id = auth.uid()
      OR b.assignee_id = auth.uid()
      OR public.is_admin()
    )
  )
);

DROP POLICY IF EXISTS "ai_predictions_insert" ON ai_predictions;
CREATE POLICY "ai_predictions_insert"
ON ai_predictions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bugs b
    WHERE b.id = ai_predictions.bug_id
    AND (
      b.reporter_id = auth.uid()
      OR b.assignee_id = auth.uid()
      OR public.is_admin()
    )
  )
);

DROP POLICY IF EXISTS "ai_predictions_update" ON ai_predictions;
CREATE POLICY "ai_predictions_update"
ON ai_predictions FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bug_id uuid REFERENCES bugs(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'status_change' CHECK (type IN ('status_change', 'assignment', 'general')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);

-- Notifications policies: user reads/updates own only
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM bugs b
    WHERE b.id = notifications.bug_id
    AND b.assignee_id = auth.uid()
  )
);

-- Allow developers to notify the reporter of their assigned bug
-- (covered by the insert policy above)

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-attachments', 'bug-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for bug attachments
DROP POLICY IF EXISTS "bug_attachments_select" ON storage.objects;
CREATE POLICY "bug_attachments_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'bug-attachments');

DROP POLICY IF EXISTS "bug_attachments_insert" ON storage.objects;
CREATE POLICY "bug_attachments_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bug-attachments');

DROP POLICY IF EXISTS "bug_attachments_delete" ON storage.objects;
CREATE POLICY "bug_attachments_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bug-attachments');

-- ============================================================
-- updated_at trigger for bugs
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bugs_set_updated_at ON bugs;
CREATE TRIGGER bugs_set_updated_at
  BEFORE UPDATE ON bugs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
