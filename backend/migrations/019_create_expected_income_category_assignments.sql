-- Create expected_income_category_assignments table (many-to-many relationship)
CREATE TABLE expected_income_category_assignments (
  expected_income_id INTEGER REFERENCES expected_incomes(id) ON DELETE CASCADE NOT NULL,
  category_id INTEGER REFERENCES income_categories(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (expected_income_id, category_id)
);

-- Add indexes for faster lookups
CREATE INDEX idx_expected_income_category_income ON expected_income_category_assignments(expected_income_id);
CREATE INDEX idx_expected_income_category_category ON expected_income_category_assignments(category_id);
