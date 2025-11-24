-- Create mandatory_search_domains table for storing domains that should always be included in searches
CREATE TABLE IF NOT EXISTS mandatory_search_domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(domain_id) -- Ensure a domain can only be added once
);

-- Enable Row Level Security
ALTER TABLE mandatory_search_domains ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to view mandatory search domains"
  ON mandatory_search_domains FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admin users to manage mandatory search domains"
  ON mandatory_search_domains FOR ALL
  USING (auth.role() = 'authenticated' AND 
        EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_admin' = 'true'));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mandatory_search_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mandatory_search_domains_updated_at
  BEFORE UPDATE ON mandatory_search_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_mandatory_search_domains_updated_at();

-- Create a function to get mandatory domains for search
CREATE OR REPLACE FUNCTION get_mandatory_search_domains()
RETURNS TABLE (domain TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT d.domain 
  FROM domains d
  JOIN mandatory_search_domains msd ON d.id = msd.domain_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
