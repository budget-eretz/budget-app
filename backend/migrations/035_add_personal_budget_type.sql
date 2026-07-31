-- Migration: Add 'personal' value to budget_type_enum
-- Purpose: Support personal budgets - circle-level budgets visible only to the
--          members they are assigned to (plus circle treasurers).
--
-- NOTE: This migration only adds the enum value. The budget_owners table and the
-- CHECK constraint that reference the new value live in migration 036, because
-- PostgreSQL forbids using a newly added enum value in the same transaction.

ALTER TYPE budget_type_enum ADD VALUE IF NOT EXISTS 'personal';
