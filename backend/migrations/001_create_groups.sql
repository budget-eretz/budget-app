-- Create groups table
CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX idx_groups_name ON groups(name);
