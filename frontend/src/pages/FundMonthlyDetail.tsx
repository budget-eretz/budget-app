import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { monthlyAllocationsAPI, fundsAPI } from '../services/api';
import { MonthlyFundStatus, MonthlyExpense, MonthlyPlannedExpenseDetail, Fund } from '../types';
import { useToast } from '../components/Toast';
import Navigation from '../components/Navigation';
import MonthNavigator from '../components/MonthNavigator';
import MonthlyExpenseTable from '../components/MonthlyExpenseTable';
import MonthlyPlannedExpenseTable from '../components/MonthlyPlannedExpenseTable';
import MonthlyAllocationManager from '../components/MonthlyAllocationManager';
import AllocationHistoryModal from '../components/AllocationHistoryModal';

export default function FundMonthlyDetail() {
  const { fundId } = useParams<{ fundId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [fund, setFund] = useState<Fund | null>(null);
  const [monthlyStatus, setMonthlyStatus] = useState<MonthlyFundStatus | null>(null);
  const [expenses, setExpenses] = useState<MonthlyExpense[]>([]);
  const [plannedExpenses, setPlannedExpenses] = useState<MonthlyPlannedExpenseDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllocationManager, setShowAllocationManager] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Month navigation state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);

  useEffect(() => {
    if (fundId) {
      loadFundData();
      loadMonthlyData();
    }
  }, [fundId, selectedYear, selectedMonth]);

  const loadFundData = async () => {
    try {
      const response = await fundsAPI.getById(Number(fundId));
      setFund(response.data);
    } catch (error: any) {
      console.error('Failed to load fund:', error);
      showToast(error.response?.data?.error || 'שגיאה בטעינת נתוני הסעיף', 'error');
    }
  };

  const loadMonthlyData = async () => {
    setLoading(true);
    try {
      const [statusRes, expensesRes, plannedRes] = await Promise.all([
        monthlyAllocationsAPI.getMonthlyStatus(Number(fundId), selectedYear, selectedMonth),
        monthlyAllocationsAPI.getMonthlyExpenses(Number(fundId), selectedYear, selectedMonth),
        monthlyAllocationsAPI.getMonthlyPlannedExpenses(Number(fundId), selectedYear, selectedMonth),
      ]);

      // Transform snake_case to camelCase for monthly status
      const transformedStatus = {
        fundId: statusRes.data.fund_id,
        fundName: statusRes.data.fund_name,
        year: statusRes.data.year,
        month: statusRes.data.month,
        allocated: statusRes.data.allocated,
        actual: {
          spent: statusRes.data.actual.spent,
          remaining: statusRes.data.actual.remaining
        },
        planning: {
          planned: statusRes.data.planning.planned,
          unplanned: statusRes.data.planning.unplanned
        },
        variance: {
          planned: statusRes.data.variance.planned,
          actual: statusRes.data.variance.actual,
          difference: statusRes.data.variance.difference,
          percentage: statusRes.data.variance.percentage
        },
        allocationType: statusRes.data.allocation_type
      };

      // Transform expenses from API response
      const transformedExpenses = expensesRes.data.expenses || [];

      // Transform snake_case to camelCase for planned expenses
      const transformedPlanned = plannedRes.data.map((item: any) => ({
        id: item.id,
        fundId: item.fund_id,
        fundName: item.fund_name,
        userId: item.user_id,
        userName: item.user_name,
        amount: item.amount,
        description: item.description,
        plannedDate: item.planned_date,
        status: item.status,
        createdAt: item.created_at
      }));

      setMonthlyStatus(transformedStatus);
      setExpenses(transformedExpenses);
      setPlannedExpenses(transformedPlanned);
    } catch (error: any) {
      console.error('Failed to load monthly data:', error);
      showToast(error.response?.data?.error || 'שגיאה בטעינת נתוני החודש', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const handleAllocationSuccess = () => {
    loadMonthlyData();
    showToast('ההקצאות עודכנו בהצלחה', 'success');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isTreasurer = user?.isCircleTreasurer || user?.isGroupTreasurer;

  if (loading && !monthlyStatus) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.loading}>טוען...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Navigation />

      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <button onClick={() => navigate(-1)} style={styles.backButton}>
              ← חזור
            </button>
            <h1 style={styles.title}>{fund?.name || 'סעיף'}</h1>
          </div>
          {isTreasurer && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowAllocationManager(true)}
                style={styles.manageButton}
                className="manage-allocation-btn"
              >
                ניהול הקצאות חודשיות
              </button>
              <button
                onClick={() => setShowHistoryModal(true)}
                style={styles.historyButton}
                className="history-btn"
              >
                היסטוריית הקצאות
              </button>
            </div>
          )}
        </div>

        {/* Month Navigator */}
        <MonthNavigator
          year={selectedYear}
          month={selectedMonth}
          onChange={handleMonthChange}
          showMonthPicker={true}
        />

        {/* Monthly Status Summary - Three Tables */}
        {monthlyStatus && (
          <div style={styles.statusContainer}>
            {/* Table 1: Actual Execution */}
            <div style={styles.statusTable}>
              <h2 style={styles.tableTitle}>מצב חודשי - ביצוע</h2>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.headerRow}>
                    <th style={styles.th}>קטגוריה</th>
                    <th style={styles.th}>סכום</th>
                    <th style={styles.th}>% שימוש</th>
                    <th style={styles.th}>פעילות</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.dataRow}>
                    <td style={styles.td}>מוקצה</td>
                    <td style={styles.td}>{formatCurrency(monthlyStatus.allocated)}</td>
                    <td style={styles.td}>-</td>
                    <td style={styles.td}>
                      <div style={styles.progressBarSmall}>
                        <div style={{ ...styles.progressFillSmall, width: '100%', backgroundColor: '#cbd5e0' }} />
                      </div>
                    </td>
                  </tr>
                  <tr style={styles.dataRow}>
                    <td style={styles.td}>יצא</td>
                    <td style={{ ...styles.td, color: '#e53e3e', fontWeight: 600 }}>
                      {formatCurrency(monthlyStatus.actual.spent)}
                    </td>
                    <td style={styles.td}>
                      {monthlyStatus.allocated > 0 
                        ? `${((monthlyStatus.actual.spent / monthlyStatus.allocated) * 100).toFixed(0)}%`
                        : '-'}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.progressBarSmall}>
                        <div 
                          style={{ 
                            ...styles.progressFillSmall, 
                            width: `${Math.min((monthlyStatus.actual.spent / monthlyStatus.allocated) * 100, 100)}%`,
                            backgroundColor: 
                              (monthlyStatus.actual.spent / monthlyStatus.allocated) >= 0.9 ? '#e53e3e' :
                              (monthlyStatus.actual.spent / monthlyStatus.allocated) >= 0.7 ? '#dd6b20' : '#38a169'
                          }} 
                        />
                      </div>
                    </td>
                  </tr>
                  <tr style={{ ...styles.dataRow, backgroundColor: '#f7fafc' }}>
                    <td style={{ ...styles.td, fontWeight: 700 }}>נשאר</td>
                    <td style={{ 
                      ...styles.td, 
                      fontWeight: 700,
                      color: monthlyStatus.actual.remaining < 0 ? '#e53e3e' : '#38a169'
                    }}>
                      {formatCurrency(monthlyStatus.actual.remaining)}
                    </td>
                    <td style={styles.td}>
                      {monthlyStatus.allocated > 0 
                        ? `${((monthlyStatus.actual.remaining / monthlyStatus.allocated) * 100).toFixed(0)}%`
                        : '-'}
                    </td>
                    <td style={styles.td}>-</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table 2: Planning */}
            <div style={styles.statusTable}>
              <h2 style={styles.tableTitle}>מצב חודשי - תכנון</h2>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.headerRow}>
                    <th style={styles.th}>קטגוריה</th>
                    <th style={styles.th}>סכום</th>
                    <th style={styles.th}>% שימוש</th>
                    <th style={styles.th}>פעילות</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.dataRow}>
                    <td style={styles.td}>מוקצה</td>
                    <td style={styles.td}>{formatCurrency(monthlyStatus.allocated)}</td>
                    <td style={styles.td}>-</td>
                    <td style={styles.td}>
                      <div style={styles.progressBarSmall}>
                        <div style={{ ...styles.progressFillSmall, width: '100%', backgroundColor: '#cbd5e0' }} />
                      </div>
                    </td>
                  </tr>
                  <tr style={styles.dataRow}>
                    <td style={styles.td}>מתוכנן</td>
                    <td style={{ ...styles.td, color: '#3182ce', fontWeight: 600 }}>
                      {formatCurrency(monthlyStatus.planning.planned)}
                    </td>
                    <td style={styles.td}>
                      {monthlyStatus.allocated > 0 
                        ? `${((monthlyStatus.planning.planned / monthlyStatus.allocated) * 100).toFixed(0)}%`
                        : '-'}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.progressBarSmall}>
                        <div 
                          style={{ 
                            ...styles.progressFillSmall, 
                            width: `${Math.min((monthlyStatus.planning.planned / monthlyStatus.allocated) * 100, 100)}%`,
                            backgroundColor: '#3182ce'
                          }} 
                        />
                      </div>
                    </td>
                  </tr>
                  <tr style={{ ...styles.dataRow, backgroundColor: '#f7fafc' }}>
                    <td style={{ ...styles.td, fontWeight: 700 }}>לא מתוכנן</td>
                    <td style={{ 
                      ...styles.td, 
                      fontWeight: 700,
                      color: monthlyStatus.planning.unplanned < 0 ? '#e53e3e' : '#718096'
                    }}>
                      {formatCurrency(monthlyStatus.planning.unplanned)}
                    </td>
                    <td style={styles.td}>
                      {monthlyStatus.allocated > 0 
                        ? `${((monthlyStatus.planning.unplanned / monthlyStatus.allocated) * 100).toFixed(0)}%`
                        : '-'}
                    </td>
                    <td style={styles.td}>-</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table 3: Variance (Planning vs Actual) */}
            <div style={styles.statusTable}>
              <h2 style={styles.tableTitle}>תכנון מול ביצוע</h2>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.headerRow}>
                    <th style={styles.th}>קטגוריה</th>
                    <th style={styles.th}>סכום</th>
                    <th style={styles.th}>סטייה</th>
                    <th style={styles.th}>אינדיקטור</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.dataRow}>
                    <td style={styles.td}>תוכנן</td>
                    <td style={{ ...styles.td, color: '#3182ce' }}>
                      {formatCurrency(monthlyStatus.variance.planned)}
                    </td>
                    <td style={styles.td}>-</td>
                    <td style={styles.td}>-</td>
                  </tr>
                  <tr style={styles.dataRow}>
                    <td style={styles.td}>בוצע</td>
                    <td style={{ ...styles.td, color: '#e53e3e' }}>
                      {formatCurrency(monthlyStatus.variance.actual)}
                    </td>
                    <td style={styles.td}>-</td>
                    <td style={styles.td}>-</td>
                  </tr>
                  <tr style={{ ...styles.dataRow, backgroundColor: '#f7fafc' }}>
                    <td style={{ ...styles.td, fontWeight: 700 }}>סטייה</td>
                    <td style={{ 
                      ...styles.td, 
                      fontWeight: 700,
                      color: monthlyStatus.variance.difference > 0 ? '#e53e3e' : 
                             monthlyStatus.variance.difference < 0 ? '#38a169' : '#718096'
                    }}>
                      {monthlyStatus.variance.difference > 0 ? '+' : ''}
                      {formatCurrency(monthlyStatus.variance.difference)}
                    </td>
                    <td style={{ 
                      ...styles.td, 
                      fontWeight: 700,
                      color: monthlyStatus.variance.percentage > 110 ? '#e53e3e' : 
                             monthlyStatus.variance.percentage < 90 ? '#38a169' : '#dd6b20'
                    }}>
                      {monthlyStatus.variance.planned > 0 
                        ? `${monthlyStatus.variance.percentage.toFixed(0)}%`
                        : '-'}
                    </td>
                    <td style={styles.td}>
                      {monthlyStatus.variance.planned > 0 && (
                        <span style={{
                          ...styles.badge,
                          backgroundColor: 
                            monthlyStatus.variance.percentage > 110 ? '#fed7d7' :
                            monthlyStatus.variance.percentage < 90 ? '#c6f6d5' : '#feebc8',
                          color:
                            monthlyStatus.variance.percentage > 110 ? '#c53030' :
                            monthlyStatus.variance.percentage < 90 ? '#2f855a' : '#c05621'
                        }}>
                          {monthlyStatus.variance.percentage > 110 ? '⚠️ חריגה' :
                           monthlyStatus.variance.percentage < 90 ? '✓ חיסכון' : '~ קרוב'}
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Monthly Expenses Table */}
        <div style={styles.tableSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>הוצאות החודש ({expenses.length})</h2>
            {isTreasurer && (
              <button
                onClick={() => navigate(`/direct-expenses/new?fundId=${fundId}`)}
                style={styles.addButton}
                className="add-direct-expense-btn"
              >
                + הוסף הוצאה ישירה
              </button>
            )}
          </div>
          <MonthlyExpenseTable expenses={expenses} onRefresh={loadMonthlyData} />
        </div>

        {/* Monthly Planned Expenses Table */}
        <div style={styles.tableSection}>
          <h2 style={styles.sectionTitle}>הוצאות מתוכננות ({plannedExpenses.length})</h2>
          <MonthlyPlannedExpenseTable plannedExpenses={plannedExpenses} />
        </div>
      </div>

      {/* Allocation Manager Modal */}
      {showAllocationManager && fund && (
        <MonthlyAllocationManager
          fundId={fund.id}
          fundName={fund.name}
          totalFundAllocation={Number(fund.allocated_amount)}
          onClose={() => setShowAllocationManager(false)}
          onSuccess={handleAllocationSuccess}
        />
      )}

      {/* Allocation History Modal */}
      {showHistoryModal && fund && (
        <AllocationHistoryModal
          fundId={fund.id}
          fundName={fund.name}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
}

// Add hover styles
const hoverStyle = document.createElement('style');
hoverStyle.textContent = `
  .manage-allocation-btn:hover {
    background: #5568d3 !important;
    transform: translateY(-1px);
  }
  .add-direct-expense-btn:hover {
    background: #38a169 !important;
    transform: translateY(-1px);
  }
`;
if (!document.head.querySelector('style[data-fund-monthly-detail]')) {
  hoverStyle.setAttribute('data-fund-monthly-detail', 'true');
  document.head.appendChild(hoverStyle);
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    fontSize: '18px',
    color: '#718096',
  },
  content: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    gap: '20px',
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
  },
  backButton: {
    background: 'transparent',
    border: 'none',
    color: '#667eea',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    fontWeight: '600',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  manageButton: {
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  historyButton: {
    background: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  statusContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statusTable: {
    background: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  tableTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: '16px',
    margin: '0 0 16px 0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  headerRow: {
    backgroundColor: '#f7fafc',
    borderBottom: '2px solid #e2e8f0',
  },
  th: {
    padding: '12px',
    textAlign: 'right',
    fontWeight: '600',
    color: '#4a5568',
    fontSize: '13px',
  },
  dataRow: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '12px',
    textAlign: 'right',
    color: '#2d3748',
  },
  progressBarSmall: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFillSmall: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease',
    borderRadius: '4px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  tableSection: {
    marginBottom: '30px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#2d3748',
    margin: 0,
  },
  addButton: {
    background: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
};
