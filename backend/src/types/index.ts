export interface User {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string;
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

export interface UserWithGroups extends Omit<User, 'password_hash'> {
  groups: Group[];
}

export interface UserGroup {
  user_id: number;
  group_id: number;
  assigned_at: Date;
}

export interface GroupWithMemberCount extends Group {
  member_count: number;
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
  recipient_user_id?: number;
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
  
  // Joined fields
  fund_name?: string;
  budget_id?: number;
  user_name?: string;
  recipient_name?: string;
  reviewer_name?: string;
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

export interface Charge {
  id: number;
  fund_id: number;
  user_id: number;
  amount: number;
  description: string;
  charge_date: Date;
  status: 'active' | 'settled' | 'cancelled';
  created_at: Date;
  updated_at: Date;
  
  // Joined fields
  fund_name?: string;
  budget_id?: number;
}

export interface PaymentSummary {
  totalReimbursements: number;
  totalCharges: number;
  netAmount: number;
  pendingCount: number;
  approvedCount: number;
}

export interface FundWithBudget extends Fund {
  budget_name: string;
  budget_type: 'circle' | 'group';
  group_name?: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  isCircleTreasurer: boolean;
  isGroupTreasurer: boolean;
  groupIds: number[];
}
