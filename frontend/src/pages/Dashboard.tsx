import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reportsAPI, plannedExpensesAPI, monthlyAllocationsAPI } from '../services/api';
import { Dashboard as DashboardType, MonthlyFundStatus, Fund } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
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
      // Transform snake_case to camelCase with new structure
      const transformedData = response.data.map((item: any) => ({
        fundId: item.fund_id,
        fundName: item.fund_name,
        year: item.year,
        month: item.month,
        allocated: item.allocated,
        actual: {
          spent: item.actual.spent,
          remaining: item.actual.remaining
        },
        planning: {
          planned: item.planning.planned,
          unplanned: item.planning.unplanned
        },
        variance: {
          planned: item.variance.planned,
          actual: item.variance.actual,
          difference: item.variance.difference,
          percentage: item.variance.percentage
        },
        allocationType: item.allocation_type
      }));
      setMonthlyStatus(transformedData);
    } catch (error: any) {
      console.error('Failed to load monthly status:', error);
      // Don't show error - monthly status is optional
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
                            const usagePercent = status.allocated > 0 
                              ? (status.actual.spent / status.allocated) * 100 
                              : 0;
                            const progressColor = usagePercent > 90 ? '#e53e3e' : usagePercent > 75 ? '#dd6b20' : '#38a169';
                            
                            return (
                              <tr key={status.fundId} style={styles.tableRow}>
                                <td style={styles.td}>
                                  <strong>{status.fundName}</strong>
                                </td>
                                <td style={styles.td}>{formatCurrency(status.allocated)}</td>
                                <td style={{ ...styles.td, color: '#e53e3e' }}>{formatCurrency(status.actual.spent)}</td>
                                <td style={{ ...styles.td, color: '#3182ce' }}>{formatCurrency(status.planning.planned)}</td>
                                <td style={{ ...styles.td, color: progressColor, fontWeight: 600 }}>
                                  {formatCurrency(status.actual.remaining)}
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
                אשר החזרים
              </Button>
            </div>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>מגיש</th>
                    <th style={styles.th}>קופה</th>
                    <th style={styles.th}>תיאור</th>
                    <th style={styles.th}>סכום</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.pendingReimbursements.map(reimb => (
                    <tr key={reimb.id} style={styles.tableRow}>
                      <td style={styles.td}>
                        <strong>{reimb.user_name}</strong>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontSize: '13px', color: '#718096' }}>{reimb.fund_name}</span>
                      </td>
                      <td style={styles.td}>{reimb.description}</td>
                      <td style={styles.td}>{formatCurrency(reimb.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

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
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>קופה</th>
                    <th style={styles.th}>תיאור</th>
                    <th style={styles.th}>סכום</th>
                    <th style={styles.th}>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.myReimbursements.slice(0, 5).map(reimb => (
                    <tr key={reimb.id} style={styles.tableRow}>
                      <td style={styles.td}>{reimb.fund_name}</td>
                      <td style={styles.td}>{reimb.description}</td>
                      <td style={styles.td}>{formatCurrency(reimb.amount)}</td>
                      <td style={styles.td}>
                        <span style={getStatusStyle(reimb.status)}>{getStatusText(reimb.status)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* My Planned Expenses - Current Month */}
        <section style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={styles.sectionTitle}>
              התכנונים שלי - {getHebrewMonth(new Date().getMonth() + 1)} {new Date().getFullYear()}
              {' '}
              ({(() => {
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();
                const currentMonthExpenses = dashboard.myPlannedExpenses.filter(expense => {
                  if (!expense.planned_date) return false;
                  const expenseDate = new Date(expense.planned_date);
                  return expenseDate.getMonth() + 1 === currentMonth && expenseDate.getFullYear() === currentYear;
                });
                return currentMonthExpenses.length;
              })()})
            </h2>
            <Button variant="primary" size="sm" onClick={() => navigate('/planned-expenses/new')}>
              + תכנון חדש
            </Button>
          </div>
          {(() => {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const currentMonthExpenses = dashboard.myPlannedExpenses.filter(expense => {
              if (!expense.planned_date) return false;
              const expenseDate = new Date(expense.planned_date);
              return expenseDate.getMonth() + 1 === currentMonth && expenseDate.getFullYear() === currentYear;
            });

            if (currentMonthExpenses.length === 0) {
              return (
                <div style={styles.emptyState}>
                  <p>אין לך תכנונים לחודש הנוכחי</p>
                  <Button variant="primary" onClick={() => navigate('/planned-expenses/new')}>
                    צור תכנון חדש
                  </Button>
                </div>
              );
            }

            return (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>קופה</th>
                      <th style={styles.th}>תיאור</th>
                      <th style={styles.th}>סכום</th>
                      <th style={styles.th}>תאריך מתוכנן</th>
                      <th style={styles.th}>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMonthExpenses.map(expense => (
                      <tr key={expense.id} style={styles.tableRow}>
                        <td style={styles.td}>{expense.fund_name}</td>
                        <td style={styles.td}>{expense.description}</td>
                        <td style={styles.td}>{formatCurrency(expense.amount)}</td>
                        <td style={styles.td}>
                          {expense.planned_date ? new Date(expense.planned_date).toLocaleDateString('he-IL') : 'ללא תאריך'}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionButtons}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(`/planned-expenses/${expense.id}/edit`)}
                            >
                              ערוך
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeletePlannedExpense(expense.id)}
                            >
                              מחק
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </section>
      </div>

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
