import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reportsAPI, reimbursementsAPI, plannedExpensesAPI, monthlyAllocationsAPI } from '../services/api';
import { Dashboard as DashboardType, Reimbursement, MonthlyFundStatus, Fund } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Navigation from '../components/Navigation';

// Add hover effects for table rows
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  tbody tr:hover {
    background-color: #f7fafc !important;
  }
`;
if (!document.head.querySelector('style[data-dashboard-table-hover]')) {
  styleSheet.setAttribute('data-dashboard-table-hover', 'true');
  document.head.appendChild(styleSheet);
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardType | null>(null);
  const [monthlyStatus, setMonthlyStatus] = useState<MonthlyFundStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; reimbursement: Reimbursement | null }>({ isOpen: false, reimbursement: null });
  const [rejectNotes, setRejectNotes] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    loadDashboard();
    loadMonthlyStatus();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await reportsAPI.getDashboard();
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyStatus = async () => {
    try {
      const response = await monthlyAllocationsAPI.getDashboardMonthlyStatus();
      // Transform snake_case to camelCase
      const transformedData = response.data.map((item: any) => ({
        fundId: item.fund_id,
        fundName: item.fund_name,
        year: item.year,
        month: item.month,
        allocatedAmount: item.allocated_amount,
        spentAmount: item.spent_amount,
        plannedAmount: item.planned_amount,
        remainingAmount: item.remaining_amount,
        allocationType: item.allocation_type
      }));
      setMonthlyStatus(transformedData);
    } catch (error: any) {
      console.error('Failed to load monthly status:', error);
      // Don't show error - monthly status is optional
    }
  };

  const handleApprove = async (reimbursementId: number) => {
    if (!confirm('האם אתה בטוח שברצונך לאשר בקשה זו?')) return;

    setActionLoading(reimbursementId);
    try {
      await reimbursementsAPI.approve(reimbursementId);
      showToast('בקשת ההחזר אושרה בהצלחה', 'success');
      await loadDashboard();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה באישור הבקשה', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClick = (reimbursement: Reimbursement) => {
    setRejectModal({ isOpen: true, reimbursement });
    setRejectNotes('');
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal.reimbursement) return;

    setActionLoading(rejectModal.reimbursement.id);
    try {
      await reimbursementsAPI.reject(rejectModal.reimbursement.id, rejectNotes);
      showToast('בקשת ההחזר נדחתה', 'info');
      setRejectModal({ isOpen: false, reimbursement: null });
      setRejectNotes('');
      await loadDashboard();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בדחיית הבקשה', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePlannedExpense = async (expenseId: number) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק תכנון זה?')) return;

    try {
      await plannedExpensesAPI.delete(expenseId);
      showToast('התכנון נמחק בהצלחה', 'success');
      await loadDashboard();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה במחיקת התכנון', 'error');
    }
  };

  const handleExecutePlannedExpense = async (expenseId: number) => {
    if (!confirm('האם אתה בטוח שביצעת את ההוצאה הזו? לאחר מכן תוכל להגיש בקשת החזר.')) return;

    try {
      await plannedExpensesAPI.update(expenseId, { status: 'executed' });
      showToast('התכנון סומן כמבוצע', 'success');
      await loadDashboard();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בעדכון התכנון', 'error');
    }
  };

  if (loading) {
    return <div style={styles.loading}>טוען...</div>;
  }

  if (!dashboard) {
    return <div style={styles.error}>שגיאה בטעינת הנתונים</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
  };

  const getHebrewMonth = (month: number): string => {
    const hebrewMonths = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    return hebrewMonths[month - 1] || '';
  };

  // Group funds by budget
  const fundsByBudget = dashboard.funds.reduce((acc, fund) => {
    const budgetId = fund.budget_id;
    if (!acc[budgetId]) {
      acc[budgetId] = [];
    }
    acc[budgetId].push(fund);
    return acc;
  }, {} as Record<number, Fund[]>);

  // Group monthly status by budget
  const monthlyStatusByBudget = monthlyStatus.reduce((acc, status) => {
    // Find the fund to get its budget_id
    const fund = dashboard.funds.find(f => f.id === status.fundId);
    if (fund) {
      const budgetId = fund.budget_id;
      if (!acc[budgetId]) {
        acc[budgetId] = [];
      }
      acc[budgetId].push(status);
    }
    return acc;
  }, {} as Record<number, MonthlyFundStatus[]>);

  return (
    <div style={styles.container}>
      <Navigation />

      <div style={styles.content}>
        {/* Budgets and Funds Overview */}
        <section style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={styles.sectionTitle}>תקציבים וקופות</h2>
            {(user?.isCircleTreasurer || user?.isGroupTreasurer) && (
              <Button variant="primary" size="sm" onClick={() => navigate('/budgets')}>
                ניהול תקציבים
              </Button>
            )}
          </div>

          {dashboard.budgets.map(budget => {
            const budgetFunds = fundsByBudget[budget.id] || [];
            const budgetMonthlyStatus = monthlyStatusByBudget[budget.id] || [];
            
            return (
              <div key={budget.id} style={styles.budgetSection}>
                {/* Budget Header */}
                <div style={styles.budgetHeader}>
                  <div style={styles.budgetHeaderLeft}>
                    <h3 style={styles.budgetTitle}>{budget.name}</h3>
                    <span style={styles.budgetSubtitle}>
                      {budget.group_name || 'תקציב מעגלי'}
                    </span>
                  </div>
                  <div style={styles.budgetHeaderRight}>
                    <span style={styles.budgetAmount}>{formatCurrency(budget.total_amount)}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/budgets/${budget.id}`)}
                      style={styles.viewBudgetButton}
                    >
                      פרטים
                    </Button>
                  </div>
                </div>

                {/* Monthly Status Table */}
                {budgetMonthlyStatus.length > 0 && (
                  <div style={styles.tableSection}>
                    <h4 style={styles.tableSectionTitle}>
                      מצב חודשי - {getHebrewMonth(new Date().getMonth() + 1)} {new Date().getFullYear()}
                    </h4>
                    <div style={styles.tableContainer}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>קופה</th>
                            <th style={styles.th}>מוקצה</th>
                            <th style={styles.th}>הוצא</th>
                            <th style={styles.th}>מתוכנן</th>
                            <th style={styles.th}>נותר</th>
                            <th style={styles.th}>% שימוש</th>
                            <th style={styles.th}>פעולות</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetMonthlyStatus.map(status => {
                            const usagePercent = status.allocatedAmount > 0 
                              ? (status.spentAmount / status.allocatedAmount) * 100 
                              : 0;
                            const progressColor = usagePercent > 90 ? '#e53e3e' : usagePercent > 75 ? '#dd6b20' : '#38a169';
                            
                            return (
                              <tr key={status.fundId} style={styles.tableRow}>
                                <td style={styles.td}>
                                  <strong>{status.fundName}</strong>
                                </td>
                                <td style={styles.td}>{formatCurrency(status.allocatedAmount)}</td>
                                <td style={{ ...styles.td, color: '#e53e3e' }}>{formatCurrency(status.spentAmount)}</td>
                                <td style={{ ...styles.td, color: '#dd6b20' }}>{formatCurrency(status.plannedAmount)}</td>
                                <td style={{ ...styles.td, color: progressColor, fontWeight: 600 }}>
                                  {formatCurrency(status.remainingAmount)}
                                </td>
                                <td style={styles.td}>
                                  <div style={styles.progressContainer}>
                                    <div style={{ ...styles.progressBar, width: `${Math.min(usagePercent, 100)}%`, backgroundColor: progressColor }} />
                                    <span style={styles.progressText}>{usagePercent.toFixed(0)}%</span>
                                  </div>
                                </td>
                                <td style={styles.td}>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => navigate(`/funds/${status.fundId}/monthly`)}
                                    style={styles.smallButton}
                                  >
                                    פרטים
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Annual Funds Table */}
                {budgetFunds.length > 0 && (
                  <div style={styles.tableSection}>
                    <h4 style={styles.tableSectionTitle}>תמונת מצב שנתית</h4>
                    <div style={styles.tableContainer}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>קופה</th>
                            <th style={styles.th}>תקציב מוקצה</th>
                            <th style={styles.th}>הוצא</th>
                            <th style={styles.th}>מתוכנן</th>
                            <th style={styles.th}>נותר</th>
                            <th style={styles.th}>% שימוש</th>
                            <th style={styles.th}>פעולות</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetFunds.map(fund => {
                            const allocated = Number(fund.allocated_amount || 0);
                            const spent = Number(fund.spent_amount || 0);
                            const planned = Number(fund.planned_amount || 0);
                            const remaining = allocated - spent;
                            const usagePercent = allocated > 0 ? (spent / allocated) * 100 : 0;
                            const progressColor = usagePercent > 90 ? '#e53e3e' : usagePercent > 75 ? '#dd6b20' : '#38a169';
                            
                            return (
                              <tr key={fund.id} style={styles.tableRow}>
                                <td style={styles.td}>
                                  <div style={styles.fundNameCell}>
                                    <strong>{fund.name}</strong>
                                    {fund.description && (
                                      <span style={styles.fundDescription}>{fund.description}</span>
                                    )}
                                  </div>
                                </td>
                                <td style={styles.td}>{formatCurrency(allocated)}</td>
                                <td style={{ ...styles.td, color: '#e53e3e' }}>{formatCurrency(spent)}</td>
                                <td style={{ ...styles.td, color: '#dd6b20' }}>{formatCurrency(planned)}</td>
                                <td style={{ ...styles.td, color: progressColor, fontWeight: 600 }}>
                                  {formatCurrency(remaining)}
                                </td>
                                <td style={styles.td}>
                                  <div style={styles.progressContainer}>
                                    <div style={{ ...styles.progressBar, width: `${Math.min(usagePercent, 100)}%`, backgroundColor: progressColor }} />
                                    <span style={styles.progressText}>{usagePercent.toFixed(0)}%</span>
                                  </div>
                                </td>
                                <td style={styles.td}>
                                  <div style={styles.actionButtons}>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => navigate(`/funds/${fund.id}/monthly`)}
                                      style={styles.smallButton}
                                    >
                                      פרטים
                                    </Button>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => navigate(`/reimbursements/new?fundId=${fund.id}`)}
                                      style={styles.smallButton}
                                    >
                                      החזר
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {budgetFunds.length === 0 && (
                  <div style={styles.emptyBudgetState}>
                    <p>אין קופות בתקציב זה</p>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Pending Reimbursements (for treasurers) */}
        {dashboard.pendingReimbursements && dashboard.pendingReimbursements.length > 0 && (
          <section style={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={styles.sectionTitle}>בקשות החזר ממתינות ({dashboard.pendingReimbursements.length})</h2>
              <Button variant="primary" size="sm" onClick={() => navigate('/payments')}>
                רשימת תשלומים
              </Button>
            </div>
            <div style={styles.table}>
              {dashboard.pendingReimbursements.map(reimb => (
                <div key={reimb.id} style={styles.reimbursementRow}>
                  <div style={styles.tableCell}>
                    <strong>{reimb.user_name}</strong>
                    <small style={{ color: '#718096' }}>{reimb.fund_name}</small>
                  </div>
                  <div style={styles.tableCell}>{reimb.description}</div>
                  <div style={styles.tableCell}>{formatCurrency(reimb.amount)}</div>
                  <div style={styles.actionsCell}>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleApprove(reimb.id)}
                      isLoading={actionLoading === reimb.id}
                      disabled={actionLoading !== null}
                    >
                      אשר
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRejectClick(reimb)}
                      disabled={actionLoading !== null}
                    >
                      דחה
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Planned Expenses */}
        <section style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={styles.sectionTitle}>התכנונים שלי ({dashboard.myPlannedExpenses.length})</h2>
            <Button variant="primary" size="sm" onClick={() => navigate('/planned-expenses/new')}>
              + תכנון חדש
            </Button>
          </div>
          {dashboard.myPlannedExpenses.length === 0 ? (
            <div style={styles.emptyState}>
              <p>אין לך תכנונים פעילים</p>
              <Button variant="primary" onClick={() => navigate('/planned-expenses/new')}>
                צור תכנון ראשון
              </Button>
            </div>
          ) : (
            <div style={styles.table}>
              {dashboard.myPlannedExpenses.map(expense => (
                <div key={expense.id} style={styles.plannedExpenseRow}>
                  <div style={styles.tableCell}>{expense.fund_name}</div>
                  <div style={styles.tableCell}>{expense.description}</div>
                  <div style={styles.tableCell}>{formatCurrency(expense.amount)}</div>
                  <div style={styles.tableCell}>
                    {expense.planned_date ? new Date(expense.planned_date).toLocaleDateString('he-IL') : 'ללא תאריך'}
                  </div>
                  <div style={styles.actionsCell}>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleExecutePlannedExpense(expense.id)}
                    >
                      בוצע
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeletePlannedExpense(expense.id)}
                    >
                      מחק
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My Recent Reimbursements */}
        <section style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={styles.sectionTitle}>ההחזרים שלי</h2>
            <Button variant="primary" size="sm" onClick={() => navigate('/reimbursements/new')}>
              + הגש בקשת החזר
            </Button>
          </div>
          {dashboard.myReimbursements.length === 0 ? (
            <div style={styles.emptyState}>
              <p>לא הגשת עדיין בקשות החזר</p>
              <Button variant="primary" onClick={() => navigate('/reimbursements/new')}>
                הגש בקשה ראשונה
              </Button>
            </div>
          ) : (
            <div style={styles.table}>
              {dashboard.myReimbursements.slice(0, 5).map(reimb => (
                <div key={reimb.id} style={styles.tableRow}>
                  <div style={styles.tableCell}>{reimb.fund_name}</div>
                  <div style={styles.tableCell}>{reimb.description}</div>
                  <div style={styles.tableCell}>{formatCurrency(reimb.amount)}</div>
                  <div style={styles.tableCell}>
                    <span style={getStatusStyle(reimb.status)}>{getStatusText(reimb.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, reimbursement: null })}
        title="דחיית בקשת החזר"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>האם אתה בטוח שברצונך לדחות את הבקשה של <strong>{rejectModal.reimbursement?.user_name}</strong>?</p>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              הערות (אופציונלי):
            </label>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="למה הבקשה נדחתה..."
              rows={4}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #cbd5e0',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => setRejectModal({ isOpen: false, reimbursement: null })}
              disabled={actionLoading !== null}
            >
              ביטול
            </Button>
            <Button
              variant="danger"
              onClick={handleRejectConfirm}
              isLoading={actionLoading === rejectModal.reimbursement?.id}
              disabled={actionLoading !== null}
            >
              דחה בקשה
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function getStatusText(status: string) {
  const statusMap: Record<string, string> = {
    pending: 'ממתין',
    approved: 'אושר',
    rejected: 'נדחה',
    paid: 'שולם',
  };
  return statusMap[status] || status;
}

function getStatusStyle(status: string): React.CSSProperties {
  const baseStyle = {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  };

  const colorMap: Record<string, React.CSSProperties> = {
    pending: { ...baseStyle, background: '#fef5e7', color: '#d68910' },
    approved: { ...baseStyle, background: '#d4edda', color: '#155724' },
    rejected: { ...baseStyle, background: '#f8d7da', color: '#721c24' },
    paid: { ...baseStyle, background: '#d1ecf1', color: '#0c5460' },
  };

  return colorMap[status] || baseStyle;
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '20px',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '20px',
    color: '#e53e3e',
  },
  container: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  content: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#2d3748',
  },
  budgetSection: {
    background: 'white',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  budgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e2e8f0',
  },
  budgetHeaderLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  budgetHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  budgetTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  budgetSubtitle: {
    fontSize: '14px',
    color: '#718096',
  },
  budgetAmount: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#667eea',
  },
  viewBudgetButton: {
    minWidth: 'auto',
  },
  tableSection: {
    marginBottom: '24px',
  },
  tableSectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '12px',
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'right',
    padding: '12px',
    borderBottom: '2px solid #e2e8f0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#4a5568',
    background: '#f7fafc',
  },
  td: {
    textAlign: 'right',
    padding: '12px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#2d3748',
  },
  tableRow: {
    transition: 'background-color 0.2s',
  },
  fundNameCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fundDescription: {
    fontSize: '12px',
    color: '#718096',
  },
  progressContainer: {
    position: 'relative',
    width: '100%',
    height: '24px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    transition: 'width 0.3s ease',
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '12px',
    fontWeight: 600,
    color: '#2d3748',
    zIndex: 1,
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-start',
  },
  smallButton: {
    padding: '6px 12px',
    fontSize: '13px',
    minWidth: 'auto',
  },
  emptyBudgetState: {
    padding: '20px',
    textAlign: 'center',
    color: '#718096',
    fontSize: '14px',
  },
  reimbursementRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 3fr 1fr 2fr',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    gap: '16px',
    alignItems: 'center',
  },
  plannedExpenseRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 3fr 1fr 1fr 1.5fr',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    gap: '16px',
    alignItems: 'center',
  },
  tableCell: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  actionsCell: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  emptyState: {
    background: 'white',
    padding: '40px 20px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  loadingState: {
    background: 'white',
    padding: '40px 20px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    color: '#718096',
  },
  errorState: {
    background: 'white',
    padding: '40px 20px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    color: '#e53e3e',
  },
};
