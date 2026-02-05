-- Create apartments table
CREATE TABLE apartments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create user_apartments junction table (many-to-many)
CREATE TABLE user_apartments (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  apartment_id INTEGER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, apartment_id)
);

-- Add indexes for apartments
CREATE INDEX idx_apartments_name ON apartments(name);
CREATE INDEX idx_apartments_created_by ON apartments(created_by);

-- Add indexes for user_apartments junction table
CREATE INDEX idx_user_apartments_user_id ON user_apartments(user_id);
CREATE INDEX idx_user_apartments_apartment_id ON user_apartments(apartment_id);

-- Add comments for documentation
COMMENT ON TABLE apartments IS 'Apartments at circle level for tracking expenses';
COMMENT ON TABLE user_apartments IS 'Many-to-many junction table between users and apartments';
COMMENT ON COLUMN apartments.name IS 'Name of the apartment';
COMMENT ON COLUMN apartments.description IS 'Optional description of the apartment';
COMMENT ON COLUMN user_apartments.assigned_at IS 'Timestamp when the user was assigned to the apartment';
