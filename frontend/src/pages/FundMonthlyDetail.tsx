import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { monthlyAllocationsAPI, fundsAPI } from '../services/api';
import { MonthlyFundStatus, MonthlyExpenseDetail, MonthlyPlannedExpenseDetail, Fund } from '../types';
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
  const [expenses, setExpenses] = useState<MonthlyExpenseDetail[]>([]);
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
      showToast(error.response?.data?.error || 'שגיאה בטעינת נתוני הקופה', 'error');
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
        allocatedAmount: statusRes.data.allocated_amount,
        spentAmount: statusRes.data.spent_amount,
        plannedAmount: statusRes.data.planned_amount,
        remainingAmount: statusRes.data.remaining_amount,
        allocationType: statusRes.data.allocation_type
      };

      // Transform snake_case to camelCase for expenses
      const transformedExpenses = expensesRes.data.map((item: any) => ({
        id: item.id,
        fundId: item.fund_id,
        submitterId: item.submitter_id,
        submitterName: item.submitter_name,
        recipientId: item.recipient_user_id,
        recipientName: item.recipient_user_name,
        amount: item.amount,
        description: item.description,
        expenseDate: item.expense_date,
        receiptUrl: item.receipt_url,
        status: item.status,
        createdAt: item.created_at
      }));

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
            <h1 style={styles.title}>{fund?.name || 'קופה'}</h1>
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

        {/* Monthly Status Summary */}
        {monthlyStatus && (
          <div style={styles.statusCard}>
            <h2 style={styles.statusTitle}>סיכום חודשי</h2>
            <div style={styles.statusGrid}>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>מוקצה לחודש:</span>
                <span style={styles.statusValue}>{formatCurrency(monthlyStatus.allocatedAmount)}</span>
              </div>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>הוצא:</span>
                <span style={{ ...styles.statusValue, color: '#e53e3e' }}>
                  {formatCurrency(monthlyStatus.spentAmount)}
                </span>
              </div>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>מתוכנן:</span>
                <span style={{ ...styles.statusValue, color: '#dd6b20' }}>
                  {formatCurrency(monthlyStatus.plannedAmount)}
                </span>
              </div>
              <div style={styles.statusItem}>
                <span style={styles.statusLabel}>נותר:</span>
                <span
                  style={{
                    ...styles.statusValue,
                    ...styles.remainingValue,
                    color: monthlyStatus.remainingAmount < 0 ? '#e53e3e' : '#38a169',
                  }}
                >
                  {formatCurrency(monthlyStatus.remainingAmount)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={styles.progressContainer}>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${Math.min((monthlyStatus.spentAmount / monthlyStatus.allocatedAmount) * 100, 100)}%`,
                    backgroundColor:
                      monthlyStatus.spentAmount / monthlyStatus.allocatedAmount >= 0.9
                        ? '#e53e3e'
                        : monthlyStatus.spentAmount / monthlyStatus.allocatedAmount >= 0.7
                        ? '#dd6b20'
                        : '#38a169',
                  }}
                />
              </div>
              <span style={styles.progressText}>
                {monthlyStatus.allocatedAmount > 0
                  ? `${((monthlyStatus.spentAmount / monthlyStatus.allocatedAmount) * 100).toFixed(0)}% בשימוש`
                  : 'אין הקצאה'}
              </span>
            </div>
          </div>
        )}

        {/* Monthly Expenses Table */}
        <div style={styles.tableSection}>
          <h2 style={styles.sectionTitle}>הוצאות החודש ({expenses.length})</h2>
          <MonthlyExpenseTable expenses={expenses} />
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
          totalFundAllocation={fund.allocated_amount}
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
  statusCard: {
    background: 'white',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '30px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  statusTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: '20px',
    margin: 0,
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  statusItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statusLabel: {
    fontSize: '14px',
    color: '#718096',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2d3748',
  },
  remainingValue: {
    fontSize: '24px',
  },
  progressContainer: {
    marginTop: '24px',
  },
  progressBar: {
    width: '100%',
    height: '12px',
    backgroundColor: '#e2e8f0',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease',
    borderRadius: '6px',
  },
  progressText: {
    fontSize: '13px',
    color: '#a0aec0',
    fontWeight: '500',
  },
  tableSection: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: '16px',
  },
};
