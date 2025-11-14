-- Create shared_domains table
CREATE TABLE IF NOT EXISTS shared_domains (
  key TEXT PRIMARY KEY,
  domains TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE shared_domains ENABLE ROW LEVEL SECURITY;

-- Allow public read access to shared domains
CREATE POLICY "Enable read access for all users"
  ON shared_domains
  FOR SELECT
  USING (true);

-- Only allow authenticated users to update shared domains
CREATE POLICY "Enable update for authenticated users only"
  ON shared_domains
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only allow authenticated users to insert shared domains
CREATE POLICY "Enable insert for authenticated users only"
  ON shared_domains
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shared_domains_updated_at
BEFORE UPDATE ON shared_domains
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
