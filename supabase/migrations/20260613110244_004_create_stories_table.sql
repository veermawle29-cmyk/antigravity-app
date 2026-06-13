-- Stories table: Ephemeral 24-hour content
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_uid TEXT NOT NULL,
  author_fullname TEXT NOT NULL,
  author_username TEXT NOT NULL,
  author_avatar TEXT,
  author_city TEXT DEFAULT 'Unspecified',
  media_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories_select_authenticated" ON stories FOR SELECT TO authenticated USING (expires_at > NOW());

CREATE POLICY "stories_insert_authenticated" ON stories FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() OR author_uid = auth.uid()::text);

CREATE POLICY "stories_delete_own" ON stories FOR DELETE TO authenticated USING (author_id = auth.uid() OR author_uid = auth.uid()::text);

CREATE INDEX idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX idx_stories_expires_at ON stories(expires_at);
CREATE INDEX idx_stories_author_id ON stories(author_id);

-- Function to automatically delete expired stories
CREATE OR REPLACE FUNCTION delete_expired_stories() RETURNS void AS $$
BEGIN
  DELETE FROM stories WHERE expires_at <= NOW();
END;
$$ LANGUAGE plpgsql;