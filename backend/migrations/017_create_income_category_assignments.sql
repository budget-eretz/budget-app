-- Create income_category_assignments table (many-to-many relationship)
CREATE TABLE income_category_assignments (
  income_id INTEGER REFERENCES incomes(id) ON DELETE CASCADE NOT NULL,
  category_id INTEGER REFERENCES income_categories(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (income_id, category_id)
);

-- Add indexes for faster lookups
CREATE INDEX idx_income_category_income ON income_category_assignments(income_id);
CREATE INDEX idx_income_category_category ON income_category_assignments(category_id);
