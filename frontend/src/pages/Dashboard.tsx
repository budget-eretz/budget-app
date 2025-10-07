import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reportsAPI, reimbursementsAPI, plannedExpensesAPI, monthlyAllocationsAPI } from '../services/api';
import { Dashboard as DashboardType, Reimbursement, MonthlyFundStatus } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Navigation from '../components/Navigation';
import FundCard from '../components/FundCard';
import MonthlyFundStatusCard from '../components/MonthlyFundStatusCard';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardType | null>(null);
  const [monthlyStatus, setMonthlyStatus] = useState<MonthlyFundStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyStatusLoading, setMonthlyStatusLoading] = useState(true);
  const [monthlyStatusError, setMonthlyStatusError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; reimbursement: Reimbursement | null }>({ isOpen: false, reimbursement: null });
  const [rejectNotes, setRejectNotes] = useState('');
  const [hoveredBudgetId, setHoveredBudgetId] = useState<number | null>(null);
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
    setMonthlyStatusLoading(true);
    setMonthlyStatusError(null);
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
      setMonthlyStatusError(error.response?.data?.error || 'שגיאה בטעינת מצב חודשי');
    } finally {
      setMonthlyStatusLoading(false);
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

  return (
    <div style={styles.container}>
      <Navigation />

      <div style={styles.content}>
        {/* Budgets Overview */}
        <section style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={styles.sectionTitle}>תקציבים</h2>
            {(user?.isCircleTreasurer || user?.isGroupTreasurer) && (
              <Button variant="primary" size="sm" onClick={() => navigate('/budgets')}>
                ניהול תקציבים
              </Button>
            )}
          </div>
          <div style={styles.grid}>
            {dashboard.budgets.map(budget => (
              <div 
                key={budget.id} 
                style={{
                  ...styles.budgetCard,
                  ...(hoveredBudgetId === budget.id ? styles.budgetCardHover : {})
                }}
                onClick={() => navigate(`/budgets/${budget.id}`)}
                onMouseEnter={() => setHoveredBudgetId(budget.id)}
                onMouseLeave={() => setHoveredBudgetId(null)}
              >
                <h3 style={styles.cardTitle}>{budget.name}</h3>
                <p style={styles.cardSubtitle}>
                  {budget.group_name || 'תקציב מעגלי'}
                </p>
                <div style={styles.amount}>{formatCurrency(budget.total_amount)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Funds Overview */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>קופות</h2>
          <div style={styles.grid}>
            {dashboard.funds.map(fund => (
              <FundCard
                key={fund.id}
                fund={fund}
                showActions={false}
                showQuickActions={true}
              />
            ))}
          </div>
        </section>

        {/* Monthly Fund Status */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>מצב קופות חודשי</h2>
          {monthlyStatusLoading ? (
            <div style={styles.loadingState}>טוען מצב חודשי...</div>
          ) : monthlyStatusError ? (
            <div style={styles.errorState}>
              <p>{monthlyStatusError}</p>
              <Button variant="primary" size="sm" onClick={loadMonthlyStatus}>
                נסה שוב
              </Button>
            </div>
          ) : monthlyStatus.length === 0 ? (
            <div style={styles.emptyState}>
              <p>אין הקצאות חודשיות מוגדרות לקופות</p>
            </div>
          ) : (
            <div style={styles.grid}>
              {monthlyStatus.map(status => (
                <MonthlyFundStatusCard key={status.fundId} status={status} />
              ))}
            </div>
          )}
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
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#2d3748',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  budgetCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  budgetCardHover: {
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transform: 'translateY(-2px)',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
  },
  cardSubtitle: {
    fontSize: '14px',
    color: '#718096',
    margin: '0 0 16px 0',
  },
  amount: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#667eea',
  },
  fundDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fundRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  fundRowTotal: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #e2e8f0',
  },
  table: {
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 3fr 1fr 1fr',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    gap: '16px',
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
  statusPending: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#fef5e7',
    color: '#d68910',
    display: 'inline-block',
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
