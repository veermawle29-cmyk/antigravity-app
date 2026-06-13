-- Users table: Core user profiles
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL, -- Firebase Auth UID for migration compatibility
  email TEXT,
  phone TEXT,
  fullname TEXT NOT NULL DEFAULT 'YaarBuzz User',
  username TEXT UNIQUE NOT NULL,
  avatar TEXT,
  bio TEXT DEFAULT '',
  city TEXT DEFAULT 'Unspecified',
  interests TEXT[] DEFAULT '{}',
  points INTEGER DEFAULT 50,
  posts_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  followers UUID[] DEFAULT '{}',
  following UUID[] DEFAULT '{}',
  badges TEXT[] DEFAULT ARRAY['pioneer'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "users_select_authenticated" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "users_insert_own" ON users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = uid OR uid = auth.uid()::text);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = uid OR id = auth.uid())
  WITH CHECK (auth.uid()::text = uid OR id = auth.uid());

CREATE POLICY "users_delete_own" ON users
  FOR DELETE TO authenticated
  USING (auth.uid()::text = uid OR id = auth.uid());

-- Usernames table: Unique username index for quick lookups
CREATE TABLE usernames (
  username TEXT PRIMARY KEY,
  uid TEXT NOT NULL, -- Firebase Auth UID
  email TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE usernames ENABLE ROW LEVEL SECURITY;

-- RLS Policies for usernames
CREATE POLICY "usernames_select_public" ON usernames
  FOR SELECT USING (true);

CREATE POLICY "usernames_insert_authenticated" ON usernames
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "usernames_delete_own" ON usernames
  FOR DELETE TO authenticated
  USING (uid = auth.uid()::text);

-- Index for faster lookups
CREATE INDEX idx_users_uid ON users(uid);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_points ON users(points DESC);
CREATE INDEX idx_usernames_uid ON usernames(uid);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();