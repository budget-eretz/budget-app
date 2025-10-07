import axios from 'axios';

// Use backend URL directly - in Docker it's accessible on host
const api = axios.create({
  baseURL: 'http://localhost:4567/api',
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
  create: (data: { fundId: number; amount: number; description: string; plannedDate?: string }) =>
    api.post('/planned-expenses', data),
  update: (id: number, data: Partial<{ amount: number; description: string; plannedDate: string; status: string }>) =>
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
  getAll: (budgetId?: number) => api.get('/incomes', { params: { budgetId } }),
  create: (data: { budgetId: number; amount: number; source: string; description?: string; incomeDate: string }) =>
    api.post('/incomes', data),
  delete: (id: number) => api.delete(`/incomes/${id}`),
};

// Charges API
export const chargesAPI = {
  getMy: (params?: { status?: string }) => api.get('/charges/my', { params }),
  create: (data: { fundId: number; amount: number; description: string; chargeDate: string }) =>
    api.post('/charges', data),
  update: (id: number, data: Partial<{ amount: number; description: string; chargeDate: string }>) =>
    api.patch(`/charges/${id}`, data),
  delete: (id: number) => api.delete(`/charges/${id}`),
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
  updateRole: (id: number, data: { role: 'member' | 'group_treasurer' | 'circle_treasurer' }) =>
    api.patch(`/users/${id}/role`, data),
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

export default api;
