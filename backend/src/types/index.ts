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
  payment_transfer_id?: number;
  created_at: Date;
  updated_at: Date;
  
  // Joined fields
  fund_name?: string;
  budget_id?: number;
  user_name?: string;
  recipient_name?: string;
  reviewer_name?: string;
  payment_transfer_status?: 'pending' | 'executed';
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
  
  // Joined fields
  user_name?: string;
  budget_name?: string;
  categories?: IncomeCategory[];
}

export interface IncomeCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  created_by?: number;
  created_at: Date;
  updated_at: Date;
  
  // Joined fields
  income_count?: number;
}

export interface ExpectedIncome {
  id: number;
  budget_id: number;
  user_id?: number;
  source_name: string;
  amount: number;
  description?: string;
  year: number;
  month: number;
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'annual';
  parent_annual_id?: number;
  is_manual: boolean;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  
  // Joined fields
  budget_name?: string;
  categories?: IncomeCategory[];
}

export interface IncomeComparison {
  source_name: string;
  user_id?: number;
  expected_amount: number;
  actual_amount: number;
  difference: number;
  percentage: number;
  status: 'not-received' | 'partial' | 'full' | 'exceeded';
  categories?: IncomeCategory[];
}

export interface MonthlyIncomeSummary {
  year: number;
  month: number;
  total_expected: number;
  total_actual: number;
  difference: number;
  fulfillment_percentage: number;
  by_category?: {
    category_id: number;
    category_name: string;
    expected: number;
    actual: number;
  }[];
  by_source?: IncomeComparison[];
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

export interface PaymentTransfer {
  id: number;
  recipient_user_id: number;
  recipient_name: string;
  recipient_email: string;
  budget_type: 'circle' | 'group';
  group_id: number | null;
  group_name: string | null;
  status: 'pending' | 'executed';
  total_amount: number;
  reimbursement_count: number;
  created_at: Date;
  executed_at: Date | null;
  executed_by: number | null;
  executed_by_name: string | null;
}

export interface PaymentTransferDetails extends PaymentTransfer {
  reimbursements: Reimbursement[];
}

export interface PaymentTransferStats {
  pendingCount: number;
  pendingTotalAmount: number;
  executedCount: number;
  executedTotalAmount: number;
  recentExecutions: PaymentTransfer[];
}

export interface FundMonthlyAllocation {
  id: number;
  fund_id: number;
  year: number;
  month: number;
  allocated_amount: number;
  allocation_type: 'fixed' | 'variable';
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface MonthlyFundStatus {
  fund_id: number;
  fund_name: string;
  year: number;
  month: number;
  allocated_amount: number;
  spent_amount: number;
  planned_amount: number;
  remaining_amount: number;
  allocation_type?: 'fixed' | 'variable';
}

export interface FundAllocationSummary {
  fund_id: number;
  total_fund_allocation: number;
  total_monthly_allocations: number;
  remaining_unallocated: number;
  monthly_allocations: FundMonthlyAllocation[];
}

export interface MonthlyExpenseDetail {
  id: number;
  fund_id: number;
  submitter_id: number;
  submitter_name: string;
  recipient_id: number;
  recipient_name: string;
  amount: number;
  description: string;
  expense_date: Date;
  status: string;
  receipt_url?: string;
}

export interface MonthlyPlannedExpenseDetail {
  id: number;
  fund_id: number;
  user_id: number;
  user_name: string;
  amount: number;
  description: string;
  planned_date: Date;
  status: string;
}

export interface FundAllocationHistory {
  id: number;
  fund_id: number;
  year: number;
  month: number;
  allocated_amount: number;
  allocation_type: 'fixed' | 'variable';
  changed_by: number;
  changed_at: Date;
  change_type: 'created' | 'updated' | 'deleted';
  changed_by_name?: string;
}
