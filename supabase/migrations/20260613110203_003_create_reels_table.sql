-- Reels table: Short video content
CREATE TABLE reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_uid TEXT NOT NULL,
  creator_fullname TEXT NOT NULL,
  creator_username TEXT NOT NULL,
  creator_avatar TEXT,
  creator_city TEXT DEFAULT 'Unspecified',
  video_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  points INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reels_select_authenticated" ON reels FOR SELECT TO authenticated USING (true);

CREATE POLICY "reels_insert_authenticated" ON reels FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid() OR creator_uid = auth.uid()::text);

CREATE POLICY "reels_update_own" ON reels FOR UPDATE TO authenticated USING (creator_id = auth.uid() OR creator_uid = auth.uid()::text) WITH CHECK (creator_id = auth.uid() OR creator_uid = auth.uid()::text);

CREATE POLICY "reels_delete_own" ON reels FOR DELETE TO authenticated USING (creator_id = auth.uid() OR creator_uid = auth.uid()::text);

CREATE INDEX idx_reels_created_at ON reels(created_at DESC);
CREATE INDEX idx_reels_creator_id ON reels(creator_id);

CREATE TRIGGER update_reels_updated_at BEFORE UPDATE ON reels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();