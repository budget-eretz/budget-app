export interface User {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  isCircleTreasurer: boolean;
  isGroupTreasurer: boolean;
  groups?: Group[];
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  memberCount?: number;
}

export interface UserGroup {
  userId: number;
  groupId: number;
  assignedAt: string;
}

export interface Budget {
  id: number;
  name: string;
  total_amount: number;
  group_id?: number;
  group_name?: string;
  fiscal_year?: number;
  created_by: number;
  created_at: string;
  total_income?: number;
}

export interface Fund {
  id: number;
  budget_id: number;
  name: string;
  allocated_amount: number;
  description?: string;
  spent_amount?: number;
  planned_amount?: number;
  available_amount?: number;
  created_at: string;
}

export interface PlannedExpense {
  id: number;
  fund_id: number;
  fund_name?: string;
  user_id: number;
  user_name?: string;
  amount: number;
  description: string;
  planned_date?: string;
  status: 'planned' | 'executed' | 'cancelled';
  created_at: string;
}

export interface Reimbursement {
  id: number;
  fund_id: number;
  fund_name?: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  amount: number;
  description: string;
  expense_date: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  reviewed_by?: number;
  reviewer_name?: string;
  reviewed_at?: string;
  notes?: string;
  created_at: string;
}

export interface Income {
  id: number;
  budget_id: number;
  budget_name?: string;
  user_id: number;
  user_name?: string;
  amount: number;
  source: string;
  description?: string;
  income_date: string;
  created_at: string;
}

export interface Dashboard {
  user: User;
  budgets: Budget[];
  funds: Fund[];
  pendingReimbursements?: Reimbursement[];
  myReimbursements: Reimbursement[];
  myPlannedExpenses: PlannedExpense[];
}
