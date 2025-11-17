-- Create admin_config table for storing global tool configurations
CREATE TABLE IF NOT EXISTS admin_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT PRIMARY KEY, -- Unique key for each configuration
  value JSONB NOT NULL, -- Configuration value (can be complex JSON)
  description TEXT, -- Optional description of what this config controls
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) -- Track which admin made the last change
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS admin_config_key_idx ON admin_config(key);

-- Enable Row Level Security
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- Create policy: Only authenticated users can read admin config
CREATE POLICY "Authenticated users can view admin config"
  ON admin_config FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create policy: Only admin users can insert/update admin config
CREATE POLICY "Admin users can manage admin config"
  ON admin_config FOR ALL
  USING (
    auth.role() = 'authenticated' 
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN ('admin@example.com') -- This should match your admin emails
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_config_updated_at
  BEFORE UPDATE ON admin_config
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_config_updated_at();

-- Insert default configuration values
INSERT INTO admin_config (key, value, description) VALUES
  ('web_search_enabled', 'false', 'Enable/disable web search tool for all users'),
  ('file_search_enabled', 'false', 'Enable/disable file search tool for all users'),
  ('functions_enabled', 'true', 'Enable/disable custom functions for all users'),
  ('code_interpreter_enabled', 'false', 'Enable/disable code interpreter tool for all users'),
  ('mcp_enabled', 'false', 'Enable/disable MCP servers for all users'),
  ('google_integration_enabled', 'false', 'Enable/disable Google integration for all users'),
  ('web_search_config', '{"user_location": {"type": "approximate", "country": "", "city": "", "region": ""}}', 'Web search location configuration'),
  ('mcp_config', '{"server_label": "", "server_url": "", "allowed_tools": "", "skip_approval": true}', 'MCP server configuration'),
  ('vector_store', '{"id": "", "name": "", "file_counts": {"total": 0, "in_progress": 0, "completed": 0}, "status": ""}', 'Vector store configuration for file search')
ON CONFLICT (key) DO NOTHING;
