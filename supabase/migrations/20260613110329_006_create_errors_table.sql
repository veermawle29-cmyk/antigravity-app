-- Errors table: Centralized error logging
CREATE TABLE errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (but allow anonymous inserts for pre-auth errors)
ALTER TABLE errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "errors_insert_anyone" ON errors FOR INSERT WITH CHECK (true);

CREATE POLICY "errors_select_authenticated" ON errors FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_errors_created_at ON errors(created_at DESC);
CREATE INDEX idx_errors_feature ON errors(feature);
CREATE INDEX idx_errors_user_id ON errors(user_id);