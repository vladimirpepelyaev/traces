-- Migration to create tables and set up RLS policies

-- Enable pgcrypto (for gen_random_uuid() if not enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Enable read for self" ON profiles;
DROP POLICY IF EXISTS "Enable write for self" ON profiles;
DROP POLICY IF EXISTS "Enable read/write for self in profiles" ON profiles;

CREATE POLICY "Enable read/write for self in profiles" ON profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Table user_records
CREATE TABLE IF NOT EXISTS user_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_records
ALTER TABLE user_records ENABLE ROW LEVEL SECURITY;

-- User Records Policies
DROP POLICY IF EXISTS "Enable read/write for own user_records" ON user_records;

CREATE POLICY "Enable read/write for own user_records" ON user_records
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Table user_progress
CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_step TEXT,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_progress
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- User Progress Policies
DROP POLICY IF EXISTS "Enable ALL for own user_progress" ON user_progress;

CREATE POLICY "Enable ALL for own user_progress" ON user_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_user_records_updated_at ON user_records;
CREATE TRIGGER set_user_records_updated_at
  BEFORE UPDATE ON user_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
