-- Posts table: User posts (photos, text)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_uid TEXT NOT NULL,
  author_fullname TEXT NOT NULL,
  author_username TEXT NOT NULL,
  author_avatar TEXT,
  author_city TEXT DEFAULT 'Unspecified',
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'photo')),
  media_url TEXT,
  caption TEXT DEFAULT '',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  points INTEGER DEFAULT 10,
  is_local BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_select_authenticated" ON posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "posts_insert_authenticated" ON posts FOR INSERT TO authenticated 
  WITH CHECK (author_id = auth.uid() OR author_uid = auth.uid()::text);

CREATE POLICY "posts_update_own" ON posts FOR UPDATE TO authenticated 
  USING (author_id = auth.uid() OR author_uid = auth.uid()::text);

CREATE POLICY "posts_delete_own" ON posts FOR DELETE TO authenticated 
  USING (author_id = auth.uid() OR author_uid = auth.uid()::text);

CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_author_id ON posts(author_id);

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Post likes table
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_likes_select_authenticated" ON post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_likes_insert_authenticated" ON post_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "post_likes_delete_own" ON post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Post comments table
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_comments_select_authenticated" ON post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "post_comments_insert_authenticated" ON post_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "post_comments_delete_own" ON post_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Reel likes table
CREATE TABLE reel_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);

ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reel_likes_select_authenticated" ON reel_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "reel_likes_insert_authenticated" ON reel_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reel_likes_delete_own" ON reel_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Reel comments table
CREATE TABLE reel_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reel_comments_select_authenticated" ON reel_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "reel_comments_insert_authenticated" ON reel_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reel_comments_delete_own" ON reel_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX idx_reel_likes_reel_id ON reel_likes(reel_id);
CREATE INDEX idx_reel_likes_user_id ON reel_likes(user_id);
