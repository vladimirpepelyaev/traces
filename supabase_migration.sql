-- Migration to create tables and set up RLS policies

-- Enable pgcrypto (for gen_random_uuid() if not enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table profiles
CREATE SEQUENCE IF NOT EXISTS profiles_public_id_seq START WITH 1;

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
  public_id BIGINT UNIQUE DEFAULT nextval('profiles_public_id_seq'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure public_id column exists if profiles table was already created
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_id BIGINT UNIQUE DEFAULT nextval('profiles_public_id_seq');

-- Populate existing null public_ids sequentially by created_at ASC, id ASC
DO $
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE public_id IS NULL) THEN
    WITH ordered_profiles AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC NULLS LAST, id ASC) as row_num
      FROM profiles
      WHERE public_id IS NULL
    )
    UPDATE profiles
    SET public_id = ordered_profiles.row_num
    FROM ordered_profiles
    WHERE profiles.id = ordered_profiles.id;
  END IF;
END $;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read/write for self in profiles" ON profiles;
CREATE POLICY "Enable read/write for self in profiles" ON profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Enable update for staff on profiles" ON profiles;
CREATE POLICY "Enable update for staff on profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

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
  course_id TEXT NOT NULL,
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
DROP POLICY IF EXISTS "Enable insert for alerts" ON alerts;
CREATE POLICY "Enable insert for alerts" ON alerts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable update for alerts" ON alerts;
CREATE POLICY "Enable update for alerts" ON alerts
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable delete for alerts" ON alerts;
CREATE POLICY "Enable delete for alerts" ON alerts
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

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
DROP POLICY IF EXISTS "messenger_insert_policy" ON messenger_messages;
DROP POLICY IF EXISTS "messenger_select_policy" ON messenger_messages;
DROP POLICY IF EXISTS "messenger_delete_policy" ON messenger_messages;

CREATE POLICY "messenger_insert_policy" ON messenger_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

CREATE POLICY "messenger_select_policy" ON messenger_messages
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()::text
    OR receiver_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

CREATE POLICY "messenger_delete_policy" ON messenger_messages
  FOR DELETE TO authenticated
  USING (
    sender_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

-- 11b. New Full Messenger Architecture Tables

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct', -- 'direct' or 'group'
  name TEXT,
  avatar_url TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Conversation Members table
CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_message_id UUID,
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sender_name TEXT,
  sender_avatar TEXT,
  text TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  support_ticket_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ DEFAULT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Message Read Receipts table
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Conversation Settings table
CREATE TABLE IF NOT EXISTS conversation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on new messenger tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
DROP POLICY IF EXISTS "Select member conversations" ON conversations;
CREATE POLICY "Select member conversations" ON conversations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversations.id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

DROP POLICY IF EXISTS "Insert authenticated conversations" ON conversations;
CREATE POLICY "Insert authenticated conversations" ON conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Update owner/admin conversations" ON conversations;
CREATE POLICY "Update owner/admin conversations" ON conversations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversations.id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

-- RLS Policies for conversation_members
DROP POLICY IF EXISTS "Select members of own conversations" ON conversation_members;
CREATE POLICY "Select members of own conversations" ON conversation_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

DROP POLICY IF EXISTS "Insert members" ON conversation_members;
CREATE POLICY "Insert members" ON conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

DROP POLICY IF EXISTS "Delete members" ON conversation_members;
CREATE POLICY "Delete members" ON conversation_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

-- RLS Policies for messages
DROP POLICY IF EXISTS "Select messages in member conversations" ON messages;
CREATE POLICY "Select messages in member conversations" ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

DROP POLICY IF EXISTS "Insert message as member" ON messages;
CREATE POLICY "Insert message as member" ON messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Update own message" ON messages;
CREATE POLICY "Update own message" ON messages FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

-- RLS Policies for message_read_receipts
DROP POLICY IF EXISTS "Select receipts" ON message_read_receipts;
CREATE POLICY "Select receipts" ON message_read_receipts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = message_read_receipts.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Insert own receipt" ON message_read_receipts;
CREATE POLICY "Insert own receipt" ON message_read_receipts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = message_read_receipts.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

-- RLS Policies for conversation_settings
DROP POLICY IF EXISTS "Own settings" ON conversation_settings;
CREATE POLICY "Own settings" ON conversation_settings FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 11b. New Full Messenger Architecture Tables

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct', -- 'direct' or 'group'
  name TEXT,
  avatar_url TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Conversation Members table
CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_message_id UUID,
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sender_name TEXT,
  sender_avatar TEXT,
  text TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  support_ticket_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ DEFAULT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Message Read Receipts table
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Conversation Settings table
CREATE TABLE IF NOT EXISTS conversation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on new messenger tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
DROP POLICY IF EXISTS "Select member conversations" ON conversations;
CREATE POLICY "Select member conversations" ON conversations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversations.id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

DROP POLICY IF EXISTS "Insert authenticated conversations" ON conversations;
CREATE POLICY "Insert authenticated conversations" ON conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Update owner/admin conversations" ON conversations;
CREATE POLICY "Update owner/admin conversations" ON conversations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversations.id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

-- RLS Policies for conversation_members
DROP POLICY IF EXISTS "Select members of own conversations" ON conversation_members;
CREATE POLICY "Select members of own conversations" ON conversation_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

DROP POLICY IF EXISTS "Insert members" ON conversation_members;
CREATE POLICY "Insert members" ON conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

DROP POLICY IF EXISTS "Delete members" ON conversation_members;
CREATE POLICY "Delete members" ON conversation_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

-- RLS Policies for messages
DROP POLICY IF EXISTS "Select messages in member conversations" ON messages;
CREATE POLICY "Select messages in member conversations" ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
      AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

DROP POLICY IF EXISTS "Insert message as member" ON messages;
CREATE POLICY "Insert message as member" ON messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Update own message" ON messages;
CREATE POLICY "Update own message" ON messages FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('support', 'moderator', 'super_admin', 'staff', 'moderation')
    )
  );

-- RLS Policies for message_read_receipts
DROP POLICY IF EXISTS "Select receipts" ON message_read_receipts;
CREATE POLICY "Select receipts" ON message_read_receipts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = message_read_receipts.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Insert own receipt" ON message_read_receipts;
CREATE POLICY "Insert own receipt" ON message_read_receipts FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = message_read_receipts.conversation_id
      AND cm.user_id = auth.uid()
    )
  );

-- RLS Policies for conversation_settings
DROP POLICY IF EXISTS "Own settings" ON conversation_settings;
CREATE POLICY "Own settings" ON conversation_settings FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

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
  target_id TEXT,
  target_name TEXT,
  status TEXT DEFAULT 'pending',
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

-- 16. Testpool Tables & Security Policies
CREATE TABLE IF NOT EXISTS public.testpool_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    enabled BOOLEAN NOT NULL DEFAULT false,
    rollout_percent INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percent >= 0 AND rollout_percent <= 100),
    include_new_users BOOLEAN NOT NULL DEFAULT false,
    released_at TIMESTAMPTZ,
    created_by TEXT NOT NULL DEFAULT '',
    updated_by TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.testpool_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES public.testpool_experiments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    enabled BOOLEAN NOT NULL DEFAULT true,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at TIMESTAMPTZ,
    UNIQUE(experiment_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.testpool_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES public.testpool_experiments(id) ON DELETE CASCADE,
    operator_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.testpool_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testpool_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testpool_events ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated users
DROP POLICY IF EXISTS "Allow read access for testpool_experiments" ON public.testpool_experiments;
CREATE POLICY "Allow read access for testpool_experiments" ON public.testpool_experiments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read access for testpool_assignments" ON public.testpool_assignments;
CREATE POLICY "Allow read access for testpool_assignments" ON public.testpool_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow read access for testpool_events" ON public.testpool_events;
CREATE POLICY "Allow read access for testpool_events" ON public.testpool_events FOR SELECT USING (true);

-- Superadmin Write policies
DROP POLICY IF EXISTS "Superadmin insert on testpool_experiments" ON public.testpool_experiments;
CREATE POLICY "Superadmin insert on testpool_experiments" ON public.testpool_experiments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'superadmin', 'admin'))
    OR auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Superadmin update on testpool_experiments" ON public.testpool_experiments;
CREATE POLICY "Superadmin update on testpool_experiments" ON public.testpool_experiments FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'superadmin', 'admin'))
    OR auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Superadmin delete on testpool_experiments" ON public.testpool_experiments;
CREATE POLICY "Superadmin delete on testpool_experiments" ON public.testpool_experiments FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'superadmin', 'admin'))
    OR auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Superadmin write on testpool_assignments" ON public.testpool_assignments;
CREATE POLICY "Superadmin write on testpool_assignments" ON public.testpool_assignments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'superadmin', 'admin'))
    OR auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Superadmin write on testpool_events" ON public.testpool_events;
CREATE POLICY "Superadmin write on testpool_events" ON public.testpool_events FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'superadmin', 'admin'))
    OR auth.role() = 'authenticated'
);
