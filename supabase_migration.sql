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
  public_settings JSONB DEFAULT '{}'::jsonb,
  drafts JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read/write for self in profiles" ON profiles;
CREATE POLICY "Enable read/write for self in profiles" ON profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Enable read for everyone in profiles" ON profiles;
CREATE POLICY "Enable read for everyone in profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

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

DROP POLICY IF EXISTS "Enable ALL for own user_progress" ON user_progress;
CREATE POLICY "Enable ALL for own user_progress" ON user_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Table posts (Feed)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  title TEXT,
  text TEXT,
  image TEXT,
  likes INT NOT NULL DEFAULT 0,
  is_approved BOOLEAN DEFAULT true,
  moderated_by TEXT,
  post_format TEXT,
  topic_scores JSONB DEFAULT '[]'::jsonb,
  attention_score INT DEFAULT 0,
  boosted_users JSONB DEFAULT '[]'::jsonb,
  quiet_reactions JSONB DEFAULT '{"saved":0,"returned":0,"continued":0}'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Enable RLS on posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for everyone on posts" ON posts;
CREATE POLICY "Enable read for everyone on posts" ON posts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable write/update for everyone on posts" ON posts;
CREATE POLICY "Enable write/update for everyone on posts" ON posts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Table reactions (likes/downvotes)
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on reactions
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for everyone on reactions" ON reactions;
CREATE POLICY "Enable read for everyone on reactions" ON reactions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable write/update for own reactions" ON reactions;
CREATE POLICY "Enable write/update for own reactions" ON reactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Table support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  messages JSONB DEFAULT '[]'::jsonb,
  urgency TEXT DEFAULT 'low',
  category TEXT,
  source TEXT DEFAULT 'form',
  service_profile_id TEXT,
  service_profile_name TEXT,
  service_profile_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on support_tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable select for own tickets and support staff" ON support_tickets;
CREATE POLICY "Enable select for own tickets and support staff" ON support_tickets
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Table moderation_actions
CREATE TABLE IF NOT EXISTS moderation_actions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT,
  message TEXT NOT NULL,
  operator_id TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on moderation_actions
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read/write for moderation_actions" ON moderation_actions;
CREATE POLICY "Enable read/write for moderation_actions" ON moderation_actions
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8. Table alerts
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  tag TEXT DEFAULT 'Инфо',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on alerts
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for alerts" ON alerts;
CREATE POLICY "Enable read for alerts" ON alerts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable write for alerts staff" ON alerts;
CREATE POLICY "Enable write for alerts staff" ON alerts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 9. Table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable select/update for own notifications" ON notifications;
CREATE POLICY "Enable select/update for own notifications" ON notifications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 10. Table dialog_complaints
CREATE TABLE IF NOT EXISTS dialog_complaints (
  id TEXT PRIMARY KEY,
  offender_id TEXT,
  offender_name TEXT,
  offender_avatar TEXT,
  offender_trust NUMERIC,
  offender_risk NUMERIC,
  violation_type TEXT,
  source TEXT,
  reporter_id TEXT,
  reporter_name TEXT,
  reporter_avatar TEXT,
  participants JSONB DEFAULT '{}'::jsonb,
  preview_messages JSONB DEFAULT '[]'::jsonb,
  context_before JSONB DEFAULT '[]'::jsonb,
  context_after JSONB DEFAULT '[]'::jsonb,
  full_dialogue JSONB DEFAULT '[]'::jsonb,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  violation_history JSONB DEFAULT '{}'::jsonb,
  has_counter_complaint BOOLEAN DEFAULT false,
  counter_complaint_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE dialog_complaints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access on dialog_complaints" ON dialog_complaints;
CREATE POLICY "Enable all access on dialog_complaints" ON dialog_complaints
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. Table messenger_messages
CREATE TABLE IF NOT EXISTS messenger_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT,
  sender_name TEXT,
  sender_avatar TEXT,
  receiver_id TEXT,
  text TEXT,
  unread BOOLEAN DEFAULT false,
  support_ticket_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messenger_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access on messenger_messages" ON messenger_messages;
CREATE POLICY "Enable all access on messenger_messages" ON messenger_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 12. Table complaints
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  user_avatar TEXT,
  type TEXT,
  content TEXT,
  rating TEXT,
  image TEXT,
  reason TEXT,
  dept TEXT,
  moderated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access on complaints" ON complaints;
CREATE POLICY "Enable all access on complaints" ON complaints
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 13. Table transfers
CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sender_id TEXT,
  sender_name TEXT,
  receiver_id TEXT,
  receiver_name TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'COINS',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access on transfers" ON transfers;
CREATE POLICY "Enable all access on transfers" ON transfers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 14. Table search_history
CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access on search_history" ON search_history;
CREATE POLICY "Enable all access on search_history" ON search_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 15. Table security_logs
CREATE TABLE IF NOT EXISTS security_logs (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  ip TEXT,
  user_name TEXT,
  status TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access on security_logs" ON security_logs;
CREATE POLICY "Enable all access on security_logs" ON security_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- General trigger to update updated_at timestamp
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
