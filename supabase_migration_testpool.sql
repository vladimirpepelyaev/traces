-- SQL Migration for the Testpool Service and Feature Flags / A/B Testing

-- 1. Table testpool_experiments
CREATE TABLE IF NOT EXISTS testpool_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'partial', 'new_users', 'released', 'disabled')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  rollout_percent INT NOT NULL DEFAULT 0 CHECK (rollout_percent >= 0 AND rollout_percent <= 100),
  include_new_users BOOLEAN NOT NULL DEFAULT false,
  released_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Enable RLS on testpool_experiments
ALTER TABLE testpool_experiments ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow all authenticated users to read experiments so `isEnabled` can work client-side
DROP POLICY IF EXISTS "Enable read for authenticated on testpool_experiments" ON testpool_experiments;
CREATE POLICY "Enable read for authenticated on testpool_experiments" ON testpool_experiments
  FOR SELECT TO authenticated
  USING (true);

-- Insert/Update/Delete policy: Allow only staff (super_admin, admin, moderator, moderation, support) to edit
DROP POLICY IF EXISTS "Enable write for staff on testpool_experiments" ON testpool_experiments;
CREATE POLICY "Enable write for staff on testpool_experiments" ON testpool_experiments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'moderator', 'moderation', 'support')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'moderator', 'moderation', 'support')
    )
  );


-- 2. Table testpool_assignments
CREATE TABLE IF NOT EXISTS testpool_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES testpool_experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'rollout'
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  removed_at TIMESTAMPTZ,
  UNIQUE(experiment_id, user_id)
);

-- Enable RLS on testpool_assignments
ALTER TABLE testpool_assignments ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow authenticated users to view assignments
DROP POLICY IF EXISTS "Enable read for authenticated on testpool_assignments" ON testpool_assignments;
CREATE POLICY "Enable read for authenticated on testpool_assignments" ON testpool_assignments
  FOR SELECT TO authenticated
  USING (true);

-- Insert/Update/Delete policy: Allow only staff to manage assignments
DROP POLICY IF EXISTS "Enable write for staff on testpool_assignments" ON testpool_assignments;
CREATE POLICY "Enable write for staff on testpool_assignments" ON testpool_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'moderator', 'moderation', 'support')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'moderator', 'moderation', 'support')
    )
  );


-- 3. Table testpool_events
CREATE TABLE IF NOT EXISTS testpool_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES testpool_experiments(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on testpool_events
ALTER TABLE testpool_events ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow staff to view event logs
DROP POLICY IF EXISTS "Enable read for staff on testpool_events" ON testpool_events;
CREATE POLICY "Enable read for staff on testpool_events" ON testpool_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'moderator', 'moderation', 'support')
    )
  );

-- Insert policy: Allow authenticated staff to insert event logs
DROP POLICY IF EXISTS "Enable insert for staff on testpool_events" ON testpool_events;
CREATE POLICY "Enable insert for staff on testpool_events" ON testpool_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'moderator', 'moderation', 'support')
    )
  );

-- Add profile_theme column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_theme TEXT DEFAULT 'default';
