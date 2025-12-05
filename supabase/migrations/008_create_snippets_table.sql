-- Migration: create snippets table for shared message snippets

CREATE TABLE IF NOT EXISTS snippets (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0
);

-- Optional: policy to allow public reads (read-only) for accidentally exposed table
-- This policy allows anyone to SELECT snippets (only enable if you intend public snippets)
-- ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "public_read" ON snippets FOR SELECT USING (true);
