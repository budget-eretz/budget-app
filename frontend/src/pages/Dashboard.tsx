import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reportsAPI, plannedExpensesAPI, fundsAPI, monthlyAllocationsAPI } from '../services/api';
import { Dashboard as DashboardType, BudgetWithFunds, FundWithBudget } from '../types';
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
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Collapse state for tables
  const [isPendingCollapsed, setIsPendingCollapsed] = useState(false);
  const [isMyReimbursementsCollapsed, setIsMyReimbursementsCollapsed] = useState(false);
  const [isPlannedCollapsed, setIsPlannedCollapsed] = useState(false);

  // Fund search state
  const [fundSearchQuery, setFundSearchQuery] = useState('');
  const [accessibleBudgets, setAccessibleBudgets] = useState<BudgetWithFunds[]>([]);
  const [selectedFund, setSelectedFund] = useState<FundWithBudget | null>(null);
  const [selectedFundBudgetName, setSelectedFundBudgetName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [fundSearchLoading, setFundSearchLoading] = useState(false);
  const [fundMonthYear, setFundMonthYear] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [fundMonthlyData, setFundMonthlyData] = useState<any>(null);
  const fundSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDashboard();
    loadAccessibleFunds();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fundSearchRef.current && !fundSearchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const loadAccessibleFunds = async () => {
    try {
      const response = await fundsAPI.getAccessible();
      setAccessibleBudgets(response.data.budgets);
    } catch (error) {
      console.error('Failed to load accessible funds:', error);
    }
  };

  const loadFundMonthlyData = async (fundId: number, year: number, month: number) => {
    setFundSearchLoading(true);
    try {
      const response = await monthlyAllocationsAPI.getMonthlyStatus(fundId, year, month);
      const data = response.data;
      setFundMonthlyData({
        allocated: data.allocated,
        spent: data.actual.spent,
        planned: data.planning.planned,
        remaining: data.actual.remaining,
        allocationType: data.allocation_type,
      });
    } catch (error) {
      console.error('Failed to load monthly fund status:', error);
      setFundMonthlyData(null);
    } finally {
      setFundSearchLoading(false);
    }
  };

  const handleFundSelect = async (fund: FundWithBudget, budgetName: string) => {
    setSelectedFund(fund);
    setSelectedFundBudgetName(budgetName);
    setFundSearchQuery(fund.name);
    setShowDropdown(false);
    const now = new Date();
    const monthYear = { month: now.getMonth() + 1, year: now.getFullYear() };
    setFundMonthYear(monthYear);
    await loadFundMonthlyData(fund.id, monthYear.year, monthYear.month);
  };

  const handleFundMonthChange = async (offset: number) => {
    if (!selectedFund) return;
    const nextDate = new Date(fundMonthYear.year, fundMonthYear.month - 1 + offset, 1);
    const newMonthYear = { month: nextDate.getMonth() + 1, year: nextDate.getFullYear() };
    setFundMonthYear(newMonthYear);
    await loadFundMonthlyData(selectedFund.id, newMonthYear.year, newMonthYear.month);
  };

  const clearFundSelection = () => {
    setSelectedFund(null);
    setFundMonthlyData(null);
    setFundSearchQuery('');
    setSelectedFundBudgetName('');
  };

  const handleMonthChange = (offset: number) => {
    setSelectedMonthYear(prev => {
      const nextDate = new Date(prev.year, prev.month - 1 + offset, 1);
      return {
        month: nextDate.getMonth() + 1,
        year: nextDate.getFullYear()
      };
    });
  };

  const resetToCurrentMonth = () => {
    setSelectedMonthYear({ month: currentMonth, year: currentYear });
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

  // Filter funds for autocomplete
  const filteredFunds = fundSearchQuery.trim().length > 0 && !selectedFund
    ? accessibleBudgets.flatMap(budget =>
        budget.funds
          .filter(fund => fund.name.includes(fundSearchQuery.trim()))
          .map(fund => ({ ...fund, budgetName: budget.name, budgetGroupName: budget.groupName }))
      )
    : [];

  const getExpensesForMonth = (month: number, year: number) => {
    return dashboard.myPlannedExpenses.filter(expense => {
      if (!expense.planned_date) return false;
      const expenseDate = new Date(expense.planned_date);
      return expenseDate.getMonth() + 1 === month && expenseDate.getFullYear() === year;
    });
  };

  const selectedMonthExpenses = getExpensesForMonth(selectedMonthYear.month, selectedMonthYear.year);
  const selectedMonthLabel = `${getHebrewMonth(selectedMonthYear.month)} ${selectedMonthYear.year}`;
  const isCurrentMonthSelected =
    selectedMonthYear.month === currentMonth && selectedMonthYear.year === currentYear;

  return (
    <div style={styles.container}>
      <Navigation />

      <div style={styles.content}>
        {/* Fund Search */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>חיפוש סעיף</h2>
          <div style={fundSearchStyles.card} ref={fundSearchRef}>
            <div style={fundSearchStyles.inputContainer}>
              <input
                type="text"
                value={fundSearchQuery}
                onChange={(e) => {
                  setFundSearchQuery(e.target.value);
                  setShowDropdown(true);
                  if (selectedFund && e.target.value !== selectedFund.name) {
                    setSelectedFund(null);
                    setFundMonthlyData(null);
                  }
                }}
                onFocus={() => {
                  if (fundSearchQuery.trim().length > 0 && !selectedFund) {
                    setShowDropdown(true);
                  }
                }}
                placeholder="הקלד שם סעיף לחיפוש..."
                style={fundSearchStyles.input}
              />
              {fundSearchQuery && (
                <button
                  onClick={clearFundSelection}
                  style={fundSearchStyles.clearButton}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && fundSearchQuery.trim().length > 0 && !selectedFund && (
              <div style={fundSearchStyles.dropdown}>
                {filteredFunds.length === 0 ? (
                  <div style={fundSearchStyles.dropdownEmpty}>לא נמצאו סעיפים תואמים</div>
                ) : (
                  filteredFunds.map(fund => (
                    <div
                      key={fund.id}
                      style={fundSearchStyles.dropdownItem}
                      onClick={() => handleFundSelect(fund, fund.budgetName)}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#edf2f7';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'white';
                      }}
                    >
                      <span style={fundSearchStyles.dropdownItemName}>{fund.name}</span>
                      <span style={fundSearchStyles.dropdownItemBudget}>
                        {fund.budgetGroupName ? `${fund.budgetGroupName} - ${fund.budgetName}` : fund.budgetName}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Selected Fund Status - Monthly */}
            {selectedFund && (
              <div style={fundSearchStyles.fundStatus}>
                {fundSearchLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>טוען נתונים...</div>
                ) : fundMonthlyData ? (
                  <>
                    <div style={fundSearchStyles.fundHeader}>
                      <h3 style={fundSearchStyles.fundName}>{selectedFund.name}</h3>
                      <span style={fundSearchStyles.fundBudgetLabel}>{selectedFundBudgetName}</span>
                    </div>
                    {/* Month navigation */}
                    <div style={fundSearchStyles.monthNav}>
                      <button onClick={() => handleFundMonthChange(-1)} style={fundSearchStyles.monthNavBtn}>
                        הקודם
                      </button>
                      <span style={fundSearchStyles.monthNavLabel}>
                        {getHebrewMonth(fundMonthYear.month)} {fundMonthYear.year}
                      </span>
                      <button onClick={() => handleFundMonthChange(1)} style={fundSearchStyles.monthNavBtn}>
                        הבא
                      </button>
                    </div>
                    <div style={fundSearchStyles.amountsGrid}>
                      <div style={fundSearchStyles.amountBox}>
                        <span style={fundSearchStyles.amountLabel}>מוקצה לחודש</span>
                        <span style={fundSearchStyles.amountValue}>
                          {formatCurrency(fundMonthlyData.allocated)}
                        </span>
                      </div>
                      <div style={fundSearchStyles.amountBox}>
                        <span style={fundSearchStyles.amountLabel}>הוצא</span>
                        <span style={{ ...fundSearchStyles.amountValue, color: '#e53e3e' }}>
                          {formatCurrency(fundMonthlyData.spent)}
                        </span>
                      </div>
                      <div style={fundSearchStyles.amountBox}>
                        <span style={fundSearchStyles.amountLabel}>מתוכנן</span>
                        <span style={{ ...fundSearchStyles.amountValue, color: '#dd6b20' }}>
                          {formatCurrency(fundMonthlyData.planned)}
                        </span>
                      </div>
                      <div style={{ ...fundSearchStyles.amountBox, borderTop: '2px solid #e2e8f0', paddingTop: '12px' }}>
                        <span style={fundSearchStyles.amountLabel}>נותר</span>
                        <span style={{ ...fundSearchStyles.amountValue, color: '#38a169', fontSize: '20px' }}>
                          {formatCurrency(fundMonthlyData.remaining)}
                        </span>
                      </div>
                    </div>
                    {(() => {
                      const allocated = Number(fundMonthlyData.allocated || 0);
                      const spent = Number(fundMonthlyData.spent || 0);
                      const usagePercent = allocated > 0 ? (spent / allocated) * 100 : 0;
                      const progressColor = usagePercent > 90 ? '#e53e3e' : usagePercent > 75 ? '#dd6b20' : '#38a169';
                      return (
                        <div style={styles.progressContainer}>
                          <div style={{ ...styles.progressBar, width: `${Math.min(usagePercent, 100)}%`, backgroundColor: progressColor }} />
                          <span style={styles.progressText}>{usagePercent.toFixed(0)}% בשימוש</span>
                        </div>
                      );
                    })()}
                    <div style={fundSearchStyles.quickActions}>
                      <Button variant="primary" size="sm" onClick={() => navigate(`/reimbursements/new?fundId=${selectedFund.id}`)}>
                        הגש החזר
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/funds/${selectedFund.id}/monthly`)}>
                        פרטים
                      </Button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
                    אין הקצאה חודשית לסעיף זה ב{getHebrewMonth(fundMonthYear.month)} {fundMonthYear.year}
                    <div style={fundSearchStyles.monthNav}>
                      <button onClick={() => handleFundMonthChange(-1)} style={fundSearchStyles.monthNavBtn}>
                        הקודם
                      </button>
                      <span style={fundSearchStyles.monthNavLabel}>
                        {getHebrewMonth(fundMonthYear.month)} {fundMonthYear.year}
                      </span>
                      <button onClick={() => handleFundMonthChange(1)} style={fundSearchStyles.monthNavBtn}>
                        הבא
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Pending Reimbursements (for treasurers) */}
        {dashboard.pendingReimbursements && dashboard.pendingReimbursements.length > 0 && (
          <section style={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isPendingCollapsed ? '0' : '20px' }}>
              <button
                onClick={() => setIsPendingCollapsed(p => !p)}
                style={styles.collapsibleHeader}
              >
                <span style={styles.collapseIcon}>{isPendingCollapsed ? '▶' : '▼'}</span>
                <h2 style={styles.sectionTitle}>בקשות החזר ממתינות ({dashboard.pendingReimbursements.length})</h2>
              </button>
              <Button variant="primary" size="sm" onClick={() => navigate('/payments')}>
                אשר החזרים
              </Button>
            </div>
            {!isPendingCollapsed && (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>מגיש</th>
                      <th style={styles.th}>סעיף</th>
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
            )}
          </section>
        )}

        {/* My Recent Reimbursements */}
        <section style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMyReimbursementsCollapsed ? '0' : '20px' }}>
            <button
              onClick={() => setIsMyReimbursementsCollapsed(p => !p)}
              style={styles.collapsibleHeader}
            >
              <span style={styles.collapseIcon}>{isMyReimbursementsCollapsed ? '▶' : '▼'}</span>
              <h2 style={styles.sectionTitle}>ההחזרים שלי</h2>
            </button>
            <Button variant="primary" size="sm" onClick={() => navigate('/reimbursements/new')}>
              + הגש בקשת החזר
            </Button>
          </div>
          {!isMyReimbursementsCollapsed && (
            dashboard.myReimbursements.length === 0 ? (
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
                      <th style={styles.th}>סעיף</th>
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
            )
          )}
        </section>

        {/* My Planned Expenses - Current Month */}
        <section style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isPlannedCollapsed ? '0' : '20px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
              <button
                onClick={() => setIsPlannedCollapsed(p => !p)}
                style={styles.collapsibleHeader}
              >
                <span style={styles.collapseIcon}>{isPlannedCollapsed ? '▶' : '▼'}</span>
                <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                  התכנונים שלי - {selectedMonthLabel} ({selectedMonthExpenses.length})
                </h2>
              </button>
              {!isPlannedCollapsed && (
                <div style={styles.monthControls}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleMonthChange(-1)}
                    style={styles.monthNavButton}
                  >
                    החודש הקודם
                  </Button>
                  <span style={styles.monthLabel}>{selectedMonthLabel}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleMonthChange(1)}
                    style={styles.monthNavButton}
                  >
                    החודש הבא
                  </Button>
                  {!isCurrentMonthSelected && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={resetToCurrentMonth}
                      style={{ ...styles.monthNavButton, background: '#e2e8f0', color: '#2d3748' }}
                    >
                      חזרה לחודש הנוכחי
                    </Button>
                  )}
                </div>
              )}
            </div>
            <Button variant="primary" size="sm" onClick={() => navigate('/planned-expenses/new')}>
              + תכנון חדש
            </Button>
          </div>
          {!isPlannedCollapsed && (
            selectedMonthExpenses.length === 0 ? (
              <div style={styles.emptyState}>
                <p>אין לך תכנונים לחודש {selectedMonthLabel}</p>
                <Button variant="primary" onClick={() => navigate('/planned-expenses/new')}>
                  צור תכנון חדש
                </Button>
              </div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>סעיף</th>
                      <th style={styles.th}>תיאור</th>
                      <th style={styles.th}>סכום</th>
                      <th style={styles.th}>תאריך מתוכנן</th>
                      <th style={styles.th}>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMonthExpenses.map(expense => (
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
            )
          )}
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
  progressContainer: {
    position: 'relative',
    width: '100%',
    height: '24px',
    background: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '16px',
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
  monthControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  monthLabel: {
    padding: '6px 12px',
    background: '#edf2f7',
    borderRadius: '9999px',
    fontSize: '14px',
    color: '#2d3748',
    fontWeight: 600,
  },
  monthNavButton: {
    minWidth: 'auto',
  },
  collapsibleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    textAlign: 'right' as const,
  },
  collapseIcon: {
    fontSize: '14px',
    color: '#718096',
    flexShrink: 0,
  },
};

const fundSearchStyles: Record<string, React.CSSProperties> = {
  card: {
    background: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'relative',
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    paddingLeft: '40px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    direction: 'rtl',
    transition: 'border-color 0.2s',
  },
  clearButton: {
    position: 'absolute',
    left: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#a0aec0',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    maxHeight: '240px',
    overflowY: 'auto',
    zIndex: 10,
  },
  dropdownEmpty: {
    padding: '16px',
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: '14px',
  },
  dropdownItem: {
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f7fafc',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background-color 0.15s',
  },
  dropdownItemName: {
    fontWeight: 600,
    color: '#2d3748',
    fontSize: '14px',
  },
  dropdownItemBudget: {
    fontSize: '12px',
    color: '#718096',
  },
  fundStatus: {
    marginTop: '20px',
    padding: '20px',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  fundHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e2e8f0',
  },
  fundName: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#2d3748',
    margin: 0,
  },
  fundBudgetLabel: {
    fontSize: '13px',
    color: '#718096',
    background: '#edf2f7',
    padding: '4px 12px',
    borderRadius: '12px',
  },
  amountsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  },
  amountBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  amountLabel: {
    fontSize: '13px',
    color: '#718096',
  },
  amountValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#2d3748',
  },
  quickActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-start',
  },
  monthNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  monthNavBtn: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#4a5568',
    transition: 'all 0.15s',
  },
  monthNavLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#2d3748',
    minWidth: '120px',
    textAlign: 'center' as const,
  },
};
