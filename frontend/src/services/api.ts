import axios from 'axios';

// Use backend URL - environment variable or default to production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://budget-app-backend-r7x1.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; fullName: string; phone?: string; groupId?: number }) =>
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// Budgets API
export const budgetsAPI = {
  getAll: () => api.get('/budgets'),
  getById: (id: number) => api.get(`/budgets/${id}`),
  create: (data: { name: string; totalAmount: number; groupId?: number; fiscalYear?: number }) =>
    api.post('/budgets', data),
  update: (id: number, data: Partial<{ name: string; totalAmount: number; fiscalYear: number }>) =>
    api.patch(`/budgets/${id}`, data),
  delete: (id: number) => api.delete(`/budgets/${id}`),
  transfer: (data: { fromBudgetId: number; toBudgetId: number; amount: number; description?: string }) =>
    api.post('/budgets/transfer', data),
};

// Funds API
export const fundsAPI = {
  getAll: (budgetId?: number) => api.get('/funds', { params: { budgetId } }),
  getAccessible: () => api.get('/funds/accessible'),
  getById: (id: number) => api.get(`/funds/${id}`),
  create: (data: { budgetId: number; name: string; allocatedAmount: number; description?: string }) =>
    api.post('/funds', data),
  update: (id: number, data: Partial<{ name: string; allocatedAmount: number; description: string }>) =>
    api.patch(`/funds/${id}`, data),
  delete: (id: number) => api.delete(`/funds/${id}`),
};

// Planned Expenses API
export const plannedExpensesAPI = {
  getAll: (fundId?: number) => api.get('/planned-expenses', { params: { fundId } }),
  getById: (id: number) => api.get(`/planned-expenses/${id}`),
  create: (data: { fundId: number; amount: number; description: string; plannedDate?: string }) =>
    api.post('/planned-expenses', data),
  update: (id: number, data: Partial<{ fundId?: number; amount: number; description: string; plannedDate: string; status: string }>) =>
    api.patch(`/planned-expenses/${id}`, data),
  delete: (id: number) => api.delete(`/planned-expenses/${id}`),
};

// Reimbursements API
export const reimbursementsAPI = {
  getAll: (params?: { fundId?: number; status?: string }) => api.get('/reimbursements', { params }),
  getMy: (params?: { status?: string }) => api.get('/reimbursements/my', { params }),
  getSummary: () => api.get('/reimbursements/my/summary'),
  getById: (id: number) => api.get(`/reimbursements/${id}`),
  create: (data: { fundId: number; amount: number; description: string; expenseDate: string; receiptUrl?: string; recipientUserId?: number }) =>
    api.post('/reimbursements', data),
  update: (id: number, data: Partial<{ amount: number; description: string; expenseDate: string; receiptUrl: string; recipientUserId: number }>) =>
    api.patch(`/reimbursements/${id}`, data),
  delete: (id: number) => api.delete(`/reimbursements/${id}`),
  approve: (id: number, notes?: string) => api.post(`/reimbursements/${id}/approve`, { notes }),
  reject: (id: number, notes?: string) => api.post(`/reimbursements/${id}/reject`, { notes }),
  markAsPaid: (id: number) => api.post(`/reimbursements/${id}/paid`),
  
  // Treasurer management functions
  getTreasurerAll: (groupBy?: string) => api.get('/reimbursements/treasurer/all', { params: { groupBy } }),
  markForReview: (id: number, notes?: string) => api.post(`/reimbursements/${id}/mark-review`, { notes }),
  returnToPending: (id: number) => api.post(`/reimbursements/${id}/return-to-pending`),
  
  // Batch operations
  batchMarkForReview: (ids: number[], notes?: string) => 
    api.post('/reimbursements/batch/mark-review', { reimbursementIds: ids, notes }),
  batchApprove: (ids: number[], notes?: string) => 
    api.post('/reimbursements/batch/approve', { reimbursementIds: ids, notes }),
  batchReject: (ids: number[], rejectionReason: string) => 
    api.post('/reimbursements/batch/reject', { reimbursementIds: ids, rejectionReason }),
  batchMarkAsPaid: (ids: number[]) => 
    api.post('/reimbursements/batch/mark-paid', { reimbursementIds: ids }),
};

// Incomes API
export const incomesAPI = {
  getAll: (params?: { 
    budgetId?: number; 
    startDate?: string; 
    endDate?: string; 
    source?: string; 
    categoryId?: number; 
    year?: number; 
    month?: number;
  }) => api.get('/incomes', { params }),
  getById: (id: number) => api.get(`/incomes/${id}`),
  create: (data: { 
    amount: number; 
    source: string; 
    description?: string; 
    incomeDate: string;
    categoryIds?: number[];
  }) => api.post('/incomes', data),
  update: (id: number, data: Partial<{
    amount: number;
    description: string;
    incomeDate: string;
    source: string;
  }>) => api.patch(`/incomes/${id}`, data),
  delete: (id: number) => api.delete(`/incomes/${id}`),
  assignCategories: (id: number, categoryIds: number[]) => 
    api.post(`/incomes/${id}/categories`, { categoryIds }),
};

// Income Categories API
export const incomeCategoriesAPI = {
  getAll: () => api.get('/income-categories'),
  getById: (id: number) => api.get(`/income-categories/${id}`),
  create: (data: { name: string; description?: string; color?: string }) =>
    api.post('/income-categories', data),
  update: (id: number, data: Partial<{ name: string; description: string; color: string }>) =>
    api.patch(`/income-categories/${id}`, data),
  delete: (id: number) => api.delete(`/income-categories/${id}`),
};

// Expected Incomes API
export const expectedIncomesAPI = {
  getAll: (params?: {
    budgetId?: number;
    year?: number;
    month?: number;
    source?: string;
    categoryId?: number;
    frequency?: string;
  }) => api.get('/expected-incomes', { params }),
  getById: (id: number) => api.get(`/expected-incomes/${id}`),
  createAnnual: (data: {
    budgetId: number;
    userId?: number;
    sourceName: string;
    amount: number;
    description?: string;
    year: number;
    frequency: 'one-time' | 'monthly' | 'quarterly' | 'annual';
    month?: number; // Required for one-time
    categoryIds?: number[];
  }) => api.post('/expected-incomes/annual', data),
  createMonthly: (data: {
    budgetId: number;
    userId?: number;
    sourceName: string;
    amount: number;
    description?: string;
    year: number;
    month: number;
    categoryIds?: number[];
  }) => api.post('/expected-incomes/monthly', data),
  update: (id: number, data: Partial<{
    amount: number;
    description: string;
    sourceName: string;
  }>) => api.patch(`/expected-incomes/${id}`, data),
  delete: (id: number) => api.delete(`/expected-incomes/${id}`),
  assignCategories: (id: number, categoryIds: number[]) =>
    api.post(`/expected-incomes/${id}/categories`, { categoryIds }),
};

// Income Comparison API
export const incomeComparisonAPI = {
  getMonthlyComparison: (year: number, month: number) =>
    api.get(`/incomes/comparison/monthly/${year}/${month}`),
  getDashboardSummary: () =>
    api.get('/incomes/dashboard/summary'),
};

// Charges API
export const chargesAPI = {
  getMy: (params?: { status?: string }) => api.get('/charges/my', { params }),
  getById: (id: number) => api.get(`/charges/${id}`),
  create: (data: { fundId: number; amount: number; description: string; chargeDate: string }) =>
    api.post('/charges', data),
  update: (id: number, data: Partial<{ amount: number; description: string; chargeDate: string }>) =>
    api.patch(`/charges/${id}`, data),
  delete: (id: number) => api.delete(`/charges/${id}`),
  
  // Treasurer management functions
  getTreasurerAll: (groupBy?: string) => api.get('/charges/treasurer/all', { params: { groupBy } }),
  markForReview: (id: number, notes?: string) => api.post(`/charges/${id}/mark-review`, { notes }),
  returnToPending: (id: number) => api.post(`/charges/${id}/return-to-pending`),
  
  // Batch operations
  batchMarkForReview: (ids: number[], notes?: string) => 
    api.post('/charges/batch/mark-review', { chargeIds: ids, notes }),
  batchApprove: (ids: number[], notes?: string) => 
    api.post('/charges/batch/approve', { chargeIds: ids, notes }),
  batchReject: (ids: number[], rejectionReason: string) => 
    api.post('/charges/batch/reject', { chargeIds: ids, rejectionReason }),
};

// Reports API
export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getPaymentsList: () => api.get('/reports/payments'),
  getBudgetReport: (id: number) => api.get(`/reports/budget/${id}`),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getBasic: () => api.get('/users/basic'),
  getById: (id: number) => api.get(`/users/${id}`),
  getCurrentUser: () => api.get('/users/me'),
  updateOwnProfile: (data: { fullName: string; phone?: string }) => 
    api.patch('/users/me', data),
  changeOwnPassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/users/me/password', data),
  create: (data: { 
    email: string; 
    password: string; 
    fullName: string; 
    phone?: string; 
    role?: 'member' | 'group_treasurer' | 'circle_treasurer';
    groupIds?: number[];
  }) => api.post('/users', data),
  updateRole: (id: number, data: { role: 'member' | 'group_treasurer' | 'circle_treasurer' }) =>
    api.patch(`/users/${id}/role`, data),
  resetPassword: (id: number, data: { newPassword: string }) =>
    api.patch(`/users/${id}/reset-password`, data),
  assignToGroup: (userId: number, groupId: number) =>
    api.post(`/users/${userId}/groups`, { groupId }),
  removeFromGroup: (userId: number, groupId: number) =>
    api.delete(`/users/${userId}/groups/${groupId}`),
  getUserGroups: (userId: number) => api.get(`/users/${userId}/groups`),
};

// Groups API
export const groupsAPI = {
  getAll: () => api.get('/groups'),
  getById: (id: number) => api.get(`/groups/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post('/groups', data),
  update: (id: number, data: { name?: string; description?: string }) =>
    api.patch(`/groups/${id}`, data),
  delete: (id: number) => api.delete(`/groups/${id}`),
  getMembers: (id: number) => api.get(`/groups/${id}/members`),
};

// Payment Transfers API
export const paymentTransfersAPI = {
  getAll: (params?: { status?: string; recipientUserId?: number; dateFrom?: string; dateTo?: string }) => 
    api.get('/payment-transfers', { params }),
  getById: (id: number) => 
    api.get(`/payment-transfers/${id}`),
  execute: (id: number) => 
    api.post(`/payment-transfers/${id}/execute`),
  getStats: () => 
    api.get('/payment-transfers/stats'),
};

// Monthly Allocations API
export const monthlyAllocationsAPI = {
  setFixedAllocation: (fundId: number, data: { amount: number; startYear: number; startMonth: number }) =>
    api.post(`/funds/${fundId}/monthly-allocations/fixed`, data),
  setVariableAllocations: (fundId: number, data: { allocations: Array<{ year: number; month: number; amount: number }> }) =>
    api.post(`/funds/${fundId}/monthly-allocations/variable`, data),
  getAllocations: (fundId: number) =>
    api.get(`/funds/${fundId}/monthly-allocations`),
  getMonthAllocation: (fundId: number, year: number, month: number) =>
    api.get(`/funds/${fundId}/monthly-allocations/${year}/${month}`),
  deleteMonthAllocation: (fundId: number, year: number, month: number) =>
    api.delete(`/funds/${fundId}/monthly-allocations/${year}/${month}`),
  getMonthlyStatus: (fundId: number, year: number, month: number) =>
    api.get(`/funds/${fundId}/monthly-status/${year}/${month}`),
  getMonthlyExpenses: (fundId: number, year: number, month: number) =>
    api.get(`/funds/${fundId}/monthly-expenses/${year}/${month}`),
  getMonthlyPlannedExpenses: (fundId: number, year: number, month: number) =>
    api.get(`/funds/${fundId}/monthly-planned/${year}/${month}`),
  getDashboardMonthlyStatus: () =>
    api.get('/dashboard/monthly-status'),
  getBudgetMonthlyStatus: (budgetId: number, year: number, month: number) =>
    api.get(`/budgets/${budgetId}/monthly-status/${year}/${month}`),
  getAllocationHistory: (fundId: number) =>
    api.get(`/funds/${fundId}/allocation-history`),
};

// Direct Expenses API
export const directExpensesAPI = {
  getById: (id: number) => api.get(`/direct-expenses/${id}`),
  create: (data: { fundId: number; amount: number; description: string; expenseDate: string; payee: string; receiptUrl?: string }) =>
    api.post('/direct-expenses', data),
  update: (id: number, data: Partial<{ amount: number; description: string; expenseDate: string; payee: string; receiptUrl: string }>) =>
    api.patch(`/direct-expenses/${id}`, data),
  delete: (id: number) => api.delete(`/direct-expenses/${id}`),
};

// Recurring Transfers API
export const recurringTransfersAPI = {
  getAll: () => api.get('/recurring-transfers'),
  getMy: () => api.get('/recurring-transfers/my'),
  getById: (id: number) => api.get(`/recurring-transfers/${id}`),
  create: (data: { 
    recipientUserId: number; 
    fundId: number; 
    amount: number; 
    description: string; 
    startDate: string; 
    endDate?: string; 
    frequency: 'monthly' | 'quarterly' | 'annual' 
  }) => api.post('/recurring-transfers', data),
  update: (id: number, data: Partial<{ 
    amount: number; 
    description: string; 
    endDate: string; 
    frequency: 'monthly' | 'quarterly' | 'annual'; 
    status: 'active' | 'paused' | 'cancelled' 
  }>) => api.patch(`/recurring-transfers/${id}`, data),
  delete: (id: number) => api.delete(`/recurring-transfers/${id}`),
};

export default api;
