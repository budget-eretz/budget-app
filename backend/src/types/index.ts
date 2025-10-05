export interface User {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string;
  group_id?: number;
  is_circle_treasurer: boolean;
  is_group_treasurer: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
}

export interface Budget {
  id: number;
  name: string;
  total_amount: number;
  group_id?: number;
  fiscal_year?: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface Fund {
  id: number;
  budget_id: number;
  name: string;
  allocated_amount: number;
  description?: string;
  created_at: Date;
}

export interface PlannedExpense {
  id: number;
  fund_id: number;
  user_id: number;
  amount: number;
  description: string;
  planned_date?: Date;
  status: 'planned' | 'executed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface Reimbursement {
  id: number;
  fund_id: number;
  user_id: number;
  amount: number;
  description: string;
  expense_date: Date;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  reviewed_by?: number;
  reviewed_at?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Income {
  id: number;
  budget_id: number;
  user_id: number;
  amount: number;
  source: string;
  description?: string;
  income_date: Date;
  created_at: Date;
}

export interface BudgetTransfer {
  id: number;
  from_budget_id: number;
  to_budget_id: number;
  amount: number;
  transferred_by: number;
  description?: string;
  created_at: Date;
}

export interface JWTPayload {
  userId: number;
  email: string;
  isCircleTreasurer: boolean;
  isGroupTreasurer: boolean;
  groupId?: number;
}
