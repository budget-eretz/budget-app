export interface User {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  isCircleTreasurer: boolean;
  isGroupTreasurer: boolean;
  groups?: Group[];
}

export interface BasicUser {
  id: number;
  fullName: string;
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

export interface FundWithBudget {
  id: number;
  name: string;
  allocated_amount: number;
  available_amount: number;
  description?: string;
  created_at: string;
}

export interface BudgetWithFunds {
  id: number;
  name: string;
  type: 'circle' | 'group';
  groupName?: string;
  funds: FundWithBudget[];
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

export type ReimbursementStatus = 
  | 'pending' 
  | 'under_review' 
  | 'approved' 
  | 'rejected' 
  | 'paid';

export interface Reimbursement {
  id: number;
  fund_id: number;
  fund_name?: string;
  user_id: number;
  user_name?: string;
  user_email?: string;
  recipient_user_id?: number;
  recipient_name?: string;
  amount: number;
  description: string;
  expense_date: string;
  receipt_url?: string;
  status: ReimbursementStatus;
  reviewed_by?: number;
  reviewer_name?: string;
  reviewed_at?: string;
  notes?: string;
  under_review_by?: number;
  under_review_at?: string;
  review_notes?: string;
  payment_transfer_id?: number;
  payment_transfer_status?: 'pending' | 'executed';
  created_at: string;
}

export interface Charge {
  id: number;
  fund_id: number;
  fund_name?: string;
  user_id: number;
  amount: number;
  description: string;
  charge_date: string;
  status: 'active' | 'settled' | 'cancelled';
  created_at: string;
}

export interface PaymentSummary {
  totalReimbursements: number;
  totalCharges: number;
  netAmount: number;
  pendingCount: number;
  approvedCount: number;
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
  categories?: IncomeCategory[];
}

export interface IncomeCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  income_count?: number;
}

export interface ExpectedIncome {
  id: number;
  budget_id: number;
  budget_name?: string;
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
  created_at: string;
  updated_at: string;
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

export interface ReimbursementsByStatus {
  pending: Reimbursement[];
  under_review: Reimbursement[];
  approved: Reimbursement[];
  rejected: Reimbursement[];
  paid: Reimbursement[];
  summary: {
    pendingCount: number;
    underReviewCount: number;
    approvedCount: number;
    rejectedCount: number;
    paidCount: number;
    totalPendingAmount: number;
    totalApprovedAmount: number;
  };
}

export type GroupByOption = 'status' | 'user' | 'fund' | 'none';

export interface Dashboard {
  user: User;
  budgets: Budget[];
  funds: Fund[];
  pendingReimbursements?: Reimbursement[];
  myReimbursements: Reimbursement[];
  myPlannedExpenses: PlannedExpense[];
}

export interface PaymentTransfer {
  id: number;
  recipientUserId: number;
  recipientName: string;
  recipientEmail: string;
  budgetType: 'circle' | 'group';
  groupId: number | null;
  groupName: string | null;
  status: 'pending' | 'executed';
  totalAmount: number;
  reimbursementCount: number;
  createdAt: string;
  executedAt: string | null;
  executedBy: number | null;
  executedByName: string | null;
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
  fundId: number;
  year: number;
  month: number;
  allocatedAmount: number;
  allocationType: 'fixed' | 'variable';
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyFundStatus {
  fundId: number;
  fundName: string;
  year: number;
  month: number;
  allocated: number;
  actual: {
    spent: number;
    remaining: number;
  };
  planning: {
    planned: number;
    unplanned: number;
  };
  variance: {
    planned: number;
    actual: number;
    difference: number;
    percentage: number;
  };
  allocationType?: 'fixed' | 'variable';
}

export interface FundAllocationSummary {
  fundId: number;
  totalFundAllocation: number;
  totalMonthlyAllocations: number;
  remainingUnallocated: number;
  monthlyAllocations: FundMonthlyAllocation[];
}

export interface MonthlyExpenseDetail {
  id: number;
  fundId: number;
  submitterId: number;
  submitterName: string;
  recipientId: number;
  recipientName: string;
  amount: number;
  description: string;
  expenseDate: string;
  status: string;
  receiptUrl?: string;
}

export interface MonthlyPlannedExpenseDetail {
  id: number;
  fundId: number;
  userId: number;
  userName: string;
  amount: number;
  description: string;
  plannedDate: string;
  status: string;
}

export interface FundAllocationHistory {
  id: number;
  fundId: number;
  year: number;
  month: number;
  allocatedAmount: number;
  allocationType: 'fixed' | 'variable';
  changedBy: number;
  changedAt: string;
  changeType: 'created' | 'updated' | 'deleted';
  changedByName?: string;
}
