-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  is_circle_treasurer BOOLEAN DEFAULT FALSE,
  is_group_treasurer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_group_id ON users(group_id);
CREATE INDEX idx_users_circle_treasurer ON users(is_circle_treasurer) WHERE is_circle_treasurer = TRUE;
CREATE INDEX idx_users_group_treasurer ON users(is_group_treasurer) WHERE is_group_treasurer = TRUE;
