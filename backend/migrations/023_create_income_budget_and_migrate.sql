-- Migration to create dedicated "הכנסות" (Income) budget and migrate existing incomes
-- This migration:
-- 1. Checks if an income budget already exists
-- 2. Creates one if it doesn't exist
-- 3. Migrates all existing incomes to the income budget

DO $$
DECLARE
  v_income_budget_id INTEGER;
  v_circle_treasurer_id INTEGER;
  v_migrated_count INTEGER := 0;
BEGIN
  -- Get a circle treasurer to use as creator (prefer the first one)
  SELECT id INTO v_circle_treasurer_id
  FROM users
  WHERE is_circle_treasurer = true
  ORDER BY id
  LIMIT 1;

  -- If no circle treasurer exists, use the first user
  IF v_circle_treasurer_id IS NULL THEN
    SELECT id INTO v_circle_treasurer_id
    FROM users
    ORDER BY id
    LIMIT 1;
  END IF;

  -- Check if an income budget already exists (circle budget with name "הכנסות")
  SELECT id INTO v_income_budget_id
  FROM budgets
  WHERE name = 'הכנסות' AND group_id IS NULL;

  -- If income budget doesn't exist, create it
  IF v_income_budget_id IS NULL THEN
    INSERT INTO budgets (name, total_amount, group_id, fiscal_year, created_by, created_at, updated_at)
    VALUES (
      'הכנסות',
      0, -- Will be updated based on actual incomes
      NULL, -- Circle budget
      EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
      v_circle_treasurer_id,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_income_budget_id;

    RAISE NOTICE 'Created income budget with ID: %', v_income_budget_id;
  ELSE
    RAISE NOTICE 'Income budget already exists with ID: %', v_income_budget_id;
  END IF;

  -- Migrate all incomes that are NOT already in the income budget
  UPDATE incomes
  SET budget_id = v_income_budget_id
  WHERE budget_id != v_income_budget_id;

  GET DIAGNOSTICS v_migrated_count = ROW_COUNT;

  RAISE NOTICE 'Migrated % income records to income budget', v_migrated_count;

  -- Update the income budget total_amount to reflect total incomes
  UPDATE budgets
  SET total_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM incomes
    WHERE budget_id = v_income_budget_id
  ),
  updated_at = NOW()
  WHERE id = v_income_budget_id;

  RAISE NOTICE 'Updated income budget total amount';

END $$;
