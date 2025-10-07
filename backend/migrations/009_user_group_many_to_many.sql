-- Migration: Convert user-group relationship from one-to-many to many-to-many
-- This migration creates a junction table for user-group associations

-- Step 1: Create the user_groups junction table
CREATE TABLE user_groups (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

-- Step 2: Migrate existing group_id data from users table to user_groups junction table
-- Only migrate users that have a group_id assigned (not NULL)
INSERT INTO user_groups (user_id, group_id, assigned_at)
SELECT id, group_id, NOW()
FROM users
WHERE group_id IS NOT NULL;

-- Step 3: Drop the old group_id column from users table
ALTER TABLE users DROP COLUMN group_id;

-- Step 4: Add indexes for performance optimization
-- Index on user_id for fast lookups of all groups for a user
CREATE INDEX idx_user_groups_user_id ON user_groups(user_id);

-- Index on group_id for fast lookups of all users in a group
CREATE INDEX idx_user_groups_group_id ON user_groups(group_id);

-- Composite index for checking specific user-group associations
CREATE INDEX idx_user_groups_composite ON user_groups(user_id, group_id);

-- Add comment for documentation
COMMENT ON TABLE user_groups IS 'Junction table for many-to-many relationship between users and groups';
COMMENT ON COLUMN user_groups.assigned_at IS 'Timestamp when the user was assigned to the group';
