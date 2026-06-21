-- Errors table: Centralized error logging for client-side debugging
CREATE TABLE errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  user_id TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE errors ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert errors (for pre-auth failures)
CREATE POLICY "errors_insert_all" ON errors FOR INSERT WITH CHECK (true);

-- Only authenticated users can read their own errors
CREATE POLICY "errors_select_own" ON errors FOR SELECT TO authenticated 
  USING (user_id = auth.uid()::text);

-- Index for faster queries
CREATE INDEX idx_errors_created_at ON errors(created_at DESC);