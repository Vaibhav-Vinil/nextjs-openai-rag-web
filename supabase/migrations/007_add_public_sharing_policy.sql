-- Add policy for public access to shared conversations
-- This allows anyone to view conversations when accessed via the public share API

-- Add a column to track if a conversation is publicly shareable
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_publicly_shareable BOOLEAN DEFAULT false;

-- Create policy: Allow public access to conversations marked as shareable
CREATE POLICY "Allow public access to shareable conversations"
  ON conversations FOR SELECT
  USING (is_publicly_shareable = true);
