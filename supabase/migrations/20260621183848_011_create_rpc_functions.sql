-- RPC Functions for YaarBuzz

-- Increment post likes
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET likes_count = likes_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement post likes
CREATE OR REPLACE FUNCTION decrement_post_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment reel likes
CREATE OR REPLACE FUNCTION increment_reel_likes(reel_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE reels SET likes = likes + 1 WHERE id = reel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement reel likes
CREATE OR REPLACE FUNCTION decrement_reel_likes(reel_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE reels SET likes = GREATEST(0, likes - 1) WHERE id = reel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment user posts count
CREATE OR REPLACE FUNCTION increment_user_posts(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users SET posts_count = posts_count + 1 WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement user posts count
CREATE OR REPLACE FUNCTION decrement_user_posts(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users SET posts_count = GREATEST(0, posts_count - 1) WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;