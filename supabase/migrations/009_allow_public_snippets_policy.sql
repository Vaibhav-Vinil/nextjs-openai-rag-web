-- Migration: enable public read/insert for snippets (dev only)

-- WARNING: This makes the `snippets` table public for read and insert.
-- Only apply this in development or if you intentionally want public snippets.

ALTER TABLE IF EXISTS snippets ENABLE ROW LEVEL SECURITY;

-- Allow anyone to SELECT snippets
-- Note: some Postgres versions (and Supabase) do not support `IF NOT EXISTS` for CREATE POLICY,
-- so we create the policies unconditionally. If they already exist this will error; remove the
-- existing policies first in that case or run this in an empty/dev environment.
CREATE POLICY "public_read" ON snippets
  FOR SELECT
  USING (true);

-- Allow anyone to INSERT snippets
CREATE POLICY "public_insert" ON snippets
  FOR INSERT
  WITH CHECK (true);

-- Optionally, you could restrict UPDATE/DELETE to service-role or authenticated users.
