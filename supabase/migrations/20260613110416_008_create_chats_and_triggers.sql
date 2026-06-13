-- Chats table for direct messaging
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chats_select_participant" ON chats FOR SELECT TO authenticated USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "chats_insert_authenticated" ON chats FOR INSERT TO authenticated WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "chats_update_participant" ON chats FOR UPDATE TO authenticated USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "chats_delete_participant" ON chats FOR DELETE TO authenticated USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE INDEX idx_chats_user1 ON chats(user1_id);
CREATE INDEX idx_chats_user2 ON chats(user2_id);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_select_participant" ON chat_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM chats WHERE id = chat_id AND (user1_id = auth.uid() OR user2_id = auth.uid())));

CREATE POLICY "chat_messages_insert_authenticated" ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "chat_messages_delete_own" ON chat_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Function to increment post likes count
CREATE OR REPLACE FUNCTION increment_post_likes() RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_post_likes_insert AFTER INSERT ON post_likes FOR EACH ROW EXECUTE FUNCTION increment_post_likes();

CREATE OR REPLACE FUNCTION decrement_post_likes() RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_post_likes_delete AFTER DELETE ON post_likes FOR EACH ROW EXECUTE FUNCTION decrement_post_likes();

-- Function to increment reel likes count
CREATE OR REPLACE FUNCTION increment_reel_likes() RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels SET likes = likes + 1 WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reel_likes_insert AFTER INSERT ON reel_likes FOR EACH ROW EXECUTE FUNCTION increment_reel_likes();

CREATE OR REPLACE FUNCTION decrement_reel_likes() RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels SET likes = GREATEST(0, likes - 1) WHERE id = OLD.reel_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reel_likes_delete AFTER DELETE ON reel_likes FOR EACH ROW EXECUTE FUNCTION decrement_reel_likes();

-- Function to increment post comments count
CREATE OR REPLACE FUNCTION increment_post_comments() RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_post_comments_insert AFTER INSERT ON post_comments FOR EACH ROW EXECUTE FUNCTION increment_post_comments();

CREATE OR REPLACE FUNCTION decrement_post_comments() RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_post_comments_delete AFTER DELETE ON post_comments FOR EACH ROW EXECUTE FUNCTION decrement_post_comments();