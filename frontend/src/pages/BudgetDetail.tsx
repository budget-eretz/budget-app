import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { budgetsAPI, fundsAPI, incomesAPI } from '../services/api';
import { Budget, Fund, Income } from '../types';
import { useToast } from '../components/Toast';
import Navigation from '../components/Navigation';
import FundCard from '../components/FundCard';
import FundForm, { FundFormData } from '../components/FundForm';
import Button from '../components/Button';
import Modal from '../components/Modal';

export default function BudgetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateFundModal, setShowCreateFundModal] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [showEditFundModal, setShowEditFundModal] = useState(false);
  const [showDeleteFundConfirm, setShowDeleteFundConfirm] = useState(false);
  const [deletingFund, setDeletingFund] = useState<Fund | null>(null);
  const [showDeleteBudgetConfirm, setShowDeleteBudgetConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check permissions on mount
    if (!user?.isCircleTreasurer && !user?.isGroupTreasurer) {
      showToast('אין לך הרשאה לצפות בדף זה', 'error');
      navigate('/dashboard');
      return;
    }
    
    if (id) {
      loadBudgetData();
    }
  }, [id, user, navigate]);

  const loadBudgetData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const budgetId = parseInt(id);
      
      // Validate budget ID
      if (isNaN(budgetId) || budgetId <= 0) {
        showToast('מזהה תקציב לא תקין', 'error');
        navigate('/budgets');
        return;
      }
      
      // Fetch budget details, funds, and incomes in parallel
      const [budgetRes, fundsRes, incomesRes] = await Promise.all([
        budgetsAPI.getById(budgetId),
        fundsAPI.getAll(budgetId),
        incomesAPI.getAll(budgetId),
      ]);
      
      setBudget(budgetRes.data);
      setFunds(fundsRes.data);
      setIncomes(incomesRes.data);
      
      // Additional permission check for group treasurers
      if (user?.isGroupTreasurer && !user?.isCircleTreasurer) {
        const loadedBudget = budgetRes.data;
        // Group treasurer can only view their group's budget or circle budgets
        if (loadedBudget.group_id && loadedBudget.group_id !== user.groupId) {
          showToast('אין לך הרשאה לצפות בתקציב של קבוצה אחרת', 'error');
          navigate('/budgets');
          return;
        }
      }
    } catch (error: any) {
      console.error('Failed to load budget data:', error);
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        showToast('התקציב לא נמצא', 'error');
        navigate('/budgets');
      } else if (error.response?.status === 403) {
        showToast('אין לך הרשאה לצפות בתקציב זה', 'error');
        navigate('/budgets');
      } else if (error.response?.status === 401) {
        showToast('נדרשת התחברות מחדש', 'error');
        navigate('/login');
      } else if (!error.response) {
        showToast('שגיאת רשת - אנא בדוק את החיבור לאינטרנט', 'error');
      } else {
        showToast(error.response?.data?.error || 'שגיאה בטעינת נתוני התקציב', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFund = async (data: FundFormData) => {
    if (!budget) return;
    
    try {
      setSubmitting(true);
      await fundsAPI.create({
        budgetId: budget.id,
        name: data.name,
        allocatedAmount: data.allocatedAmount,
        description: data.description,
      });
      showToast('הקופה נוצרה בהצלחה', 'success');
      setShowCreateFundModal(false);
      await loadBudgetData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to create fund:', error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        showToast('אין לך הרשאה ליצור קופות בתקציב זה', 'error');
        setShowCreateFundModal(false);
      } else if (error.response?.status === 400) {
        showToast(error.response?.data?.error || 'נתונים לא תקינים - בדוק את הסכום והשדות', 'error');
      } else if (error.response?.status === 404) {
        showToast('התקציב לא נמצא', 'error');
        setShowCreateFundModal(false);
        navigate('/budgets');
      } else if (error.response?.status === 401) {
        showToast('נדרשת התחברות מחדש', 'error');
        navigate('/login');
      } else if (!error.response) {
        showToast('שגיאת רשת - אנא בדוק את החיבור לאינטרנט', 'error');
      } else {
        showToast(error.response?.data?.error || 'שגיאה ביצירת הקופה', 'error');
      }
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditFund = async (data: FundFormData) => {
    if (!editingFund) return;
    
    try {
      setSubmitting(true);
      await fundsAPI.update(editingFund.id, {
        name: data.name,
        allocatedAmount: data.allocatedAmount,
        description: data.description,
      });
      showToast('הקופה עודכנה בהצלחה', 'success');
      setShowEditFundModal(false);
      setEditingFund(null);
      await loadBudgetData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to update fund:', error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        showToast('אין לך הרשאה לערוך קופה זו', 'error');
        setShowEditFundModal(false);
      } else if (error.response?.status === 404) {
        showToast('הקופה לא נמצאה', 'error');
        setShowEditFundModal(false);
        await loadBudgetData();
      } else if (error.response?.status === 400) {
        showToast(error.response?.data?.error || 'נתונים לא תקינים - בדוק את הסכום והשדות', 'error');
      } else if (error.response?.status === 401) {
        showToast('נדרשת התחברות מחדש', 'error');
        navigate('/login');
      } else if (!error.response) {
        showToast('שגיאת רשת - אנא בדוק את החיבור לאינטרנט', 'error');
      } else {
        showToast(error.response?.data?.error || 'שגיאה בעדכון הקופה', 'error');
      }
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFund = async () => {
    if (!deletingFund) return;
    
    try {
      setSubmitting(true);
      await fundsAPI.delete(deletingFund.id);
      showToast('הקופה נמחקה בהצלחה', 'success');
      setShowDeleteFundConfirm(false);
      setDeletingFund(null);
      await loadBudgetData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to delete fund:', error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        showToast('אין לך הרשאה למחוק קופה זו', 'error');
      } else if (error.response?.status === 404) {
        showToast('הקופה לא נמצאה', 'error');
        await loadBudgetData();
      } else if (error.response?.status === 400) {
        showToast(error.response?.data?.error || 'לא ניתן למחוק קופה עם הוצאות או תכנון קיימים', 'error');
      } else if (error.response?.status === 401) {
        showToast('נדרשת התחברות מחדש', 'error');
        navigate('/login');
      } else if (!error.response) {
        showToast('שגיאת רשת - אנא בדוק את החיבור לאינטרנט', 'error');
      } else {
        showToast(error.response?.data?.error || 'שגיאה במחיקת הקופה', 'error');
      }
    } finally {
      setSubmitting(false);
      setShowDeleteFundConfirm(false);
      setDeletingFund(null);
    }
  };

  const handleDeleteBudget = async () => {
    if (!budget) return;
    
    try {
      setSubmitting(true);
      await budgetsAPI.delete(budget.id);
      showToast('התקציב נמחק בהצלחה', 'success');
      navigate('/budgets');
    } catch (error: any) {
      console.error('Failed to delete budget:', error);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        showToast('אין לך הרשאה למחוק תקציב זה', 'error');
      } else if (error.response?.status === 404) {
        showToast('התקציב לא נמצא', 'error');
        navigate('/budgets');
      } else if (error.response?.status === 400) {
        if (error.response?.data?.fundsCount) {
          showToast(`לא ניתן למחוק תקציב עם ${error.response.data.fundsCount} קופות קיימות`, 'error');
        } else {
          showToast(error.response?.data?.error || 'לא ניתן למחוק תקציב זה', 'error');
        }
      } else if (error.response?.status === 401) {
        showToast('נדרשת התחברות מחדש', 'error');
        navigate('/login');
      } else if (!error.response) {
        showToast('שגיאת רשת - אנא בדוק את החיבור לאינטרנט', 'error');
      } else {
        showToast(error.response?.data?.error || 'שגיאה במחיקת התקציב', 'error');
      }
    } finally {
      setSubmitting(false);
      setShowDeleteBudgetConfirm(false);
    }
  };

  const openCreateFundModal = () => {
    setShowCreateFundModal(true);
  };

  const closeCreateFundModal = () => {
    setShowCreateFundModal(false);
  };

  const openEditFundModal = (fund: Fund) => {
    setEditingFund(fund);
    setShowEditFundModal(true);
  };

  const closeEditFundModal = () => {
    setShowEditFundModal(false);
    setEditingFund(null);
  };

  const openDeleteFundConfirm = (fund: Fund) => {
    setDeletingFund(fund);
    setShowDeleteFundConfirm(true);
  };

  const closeDeleteFundConfirm = () => {
    setShowDeleteFundConfirm(false);
    setDeletingFund(null);
  };

  const openDeleteBudgetConfirm = () => {
    setShowDeleteBudgetConfirm(true);
  };

  const closeDeleteBudgetConfirm = () => {
    setShowDeleteBudgetConfirm(false);
  };

  // Check if user has permission to manage this budget
  const canManageBudget = () => {
    if (!user || !budget) return false;
    
    // Circle treasurer can manage all budgets
    if (user.isCircleTreasurer) return true;
    
    // Group treasurer can only manage their group's budget
    if (user.isGroupTreasurer && budget.group_id === user.groupId) return true;
    
    return false;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateBudgetSummary = () => {
    const totalAllocated = funds.reduce((sum, fund) => sum + fund.allocated_amount, 0);
    const totalSpent = funds.reduce((sum, fund) => sum + (fund.spent_amount || 0), 0);
    const totalPlanned = funds.reduce((sum, fund) => sum + (fund.planned_amount || 0), 0);
    const totalIncome = budget?.total_income || 0;
    const available = (budget?.total_amount || 0) + totalIncome - totalAllocated;
    
    return {
      totalAllocated,
      totalSpent,
      totalPlanned,
      totalIncome,
      available,
    };
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.loading}>טוען...</div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.error}>
          <p>תקציב לא נמצא</p>
          <Button variant="secondary" onClick={() => navigate('/budgets')}>
            חזור לרשימת התקציבים
          </Button>
        </div>
      </div>
    );
  }

  const summary = calculateBudgetSummary();
  const hasPermission = canManageBudget();

  return (
    <div style={styles.container}>
      <Navigation />
      
      <div className="budget-detail-content" style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <Button 
              variant="secondary" 
              onClick={() => navigate('/budgets')}
              style={styles.backButton}
            >
              ← חזור
            </Button>
            <h1 style={styles.title}>{budget.name}</h1>
          </div>
          {hasPermission && (
            <div style={styles.headerActions}>
              <Button variant="secondary" onClick={() => {}}>
                ✏️ ערוך תקציב
              </Button>
              <Button variant="danger" onClick={openDeleteBudgetConfirm}>
                🗑️ מחק תקציב
              </Button>
            </div>
          )}
        </div>

        {/* Budget Summary */}
        <div className="budget-summary" style={styles.summaryCard}>
          <div style={styles.summaryHeader}>
            <h2 style={styles.summaryTitle}>סיכום תקציב</h2>
            <div style={styles.budgetMeta}>
              {budget.group_name && (
                <span style={styles.metaItem}>קבוצה: {budget.group_name}</span>
              )}
              {!budget.group_name && (
                <span style={styles.metaItem}>תקציב מעגלי</span>
              )}
              {budget.fiscal_year && (
                <span style={styles.metaItem}>שנה: {budget.fiscal_year}</span>
              )}
            </div>
          </div>
          
          <div className="summary-grid" style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>סה"כ תקציב</span>
              <span style={{...styles.summaryValue, color: '#667eea'}}>
                {formatAmount(budget.total_amount)}
              </span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>הכנסות</span>
              <span style={{...styles.summaryValue, color: '#38a169'}}>
                {formatAmount(summary.totalIncome)}
              </span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>מוקצה לקופות</span>
              <span style={{...styles.summaryValue, color: '#718096'}}>
                {formatAmount(summary.totalAllocated)}
              </span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>הוצא</span>
              <span style={{...styles.summaryValue, color: '#e53e3e'}}>
                {formatAmount(summary.totalSpent)}
              </span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>מתוכנן</span>
              <span style={{...styles.summaryValue, color: '#dd6b20'}}>
                {formatAmount(summary.totalPlanned)}
              </span>
            </div>
            <div style={{...styles.summaryItem, ...styles.availableItem}}>
              <span style={styles.summaryLabel}>זמין</span>
              <span style={{...styles.summaryValue, ...styles.availableValue}}>
                {formatAmount(summary.available)}
              </span>
            </div>
          </div>
        </div>

        {/* Funds Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>קופות</h2>
            {hasPermission && (
              <Button variant="primary" onClick={openCreateFundModal}>
                + צור קופה
              </Button>
            )}
          </div>
          
          {funds.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>אין קופות בתקציב זה</p>
              {hasPermission && (
                <Button variant="primary" onClick={openCreateFundModal}>
                  צור קופה ראשונה
                </Button>
              )}
            </div>
          ) : (
            <div className="funds-grid" style={styles.fundsGrid}>
              {funds.map(fund => (
                <FundCard
                  key={fund.id}
                  fund={fund}
                  onEdit={() => openEditFundModal(fund)}
                  onDelete={() => openDeleteFundConfirm(fund)}
                  showActions={hasPermission}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Incomes Section */}
        {incomes.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>הכנסות אחרונות</h2>
            <div style={styles.incomesTable}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>תאריך</th>
                    <th style={styles.th}>מקור</th>
                    <th style={styles.th}>תיאור</th>
                    <th style={styles.th}>סכום</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.slice(0, 5).map(income => (
                    <tr key={income.id}>
                      <td style={styles.td}>
                        {new Date(income.income_date).toLocaleDateString('he-IL')}
                      </td>
                      <td style={styles.td}>{income.source}</td>
                      <td style={styles.td}>{income.description || '-'}</td>
                      <td style={{...styles.td, fontWeight: 600, color: '#38a169'}}>
                        {formatAmount(income.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Fund Modal */}
      {showCreateFundModal && budget && (
        <FundForm
          budgetId={budget.id}
          availableBudgetAmount={summary.available}
          onSubmit={handleCreateFund}
          onCancel={closeCreateFundModal}
          isLoading={submitting}
        />
      )}

      {/* Edit Fund Modal */}
      {showEditFundModal && editingFund && budget && (
        <FundForm
          fund={editingFund}
          budgetId={budget.id}
          availableBudgetAmount={summary.available + editingFund.allocated_amount}
          onSubmit={handleEditFund}
          onCancel={closeEditFundModal}
          isLoading={submitting}
        />
      )}

      {/* Delete Fund Confirmation Modal */}
      {showDeleteFundConfirm && deletingFund && (
        <Modal 
          isOpen={showDeleteFundConfirm}
          onClose={closeDeleteFundConfirm}
          title="מחיקת קופה"
          size="sm"
        >
          <div style={styles.deleteModal}>
            <p style={styles.deleteText}>
              האם אתה בטוח שברצונך למחוק את הקופה "{deletingFund.name}"?
            </p>
            {(deletingFund.spent_amount || deletingFund.planned_amount) && (
              <div style={styles.deleteWarning}>
                <p style={styles.warningText}>⚠️ אזהרה:</p>
                <p style={styles.warningDetails}>
                  לקופה זו יש הוצאות או תכנון קיימים. מחיקתה עלולה להשפיע על נתונים אחרים במערכת.
                </p>
              </div>
            )}
            <div style={styles.deleteActions}>
              <Button 
                variant="danger" 
                onClick={handleDeleteFund}
                disabled={submitting}
              >
                {submitting ? 'מוחק...' : 'מחק'}
              </Button>
              <Button 
                variant="secondary" 
                onClick={closeDeleteFundConfirm}
                disabled={submitting}
              >
                ביטול
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Budget Confirmation Modal */}
      {showDeleteBudgetConfirm && budget && (
        <Modal 
          isOpen={showDeleteBudgetConfirm}
          onClose={closeDeleteBudgetConfirm}
          title="מחיקת תקציב"
          size="sm"
        >
          <div style={styles.deleteModal}>
            <p style={styles.deleteText}>
              האם אתה בטוח שברצונך למחוק את התקציב "{budget.name}"?
            </p>
            {funds.length > 0 && (
              <div style={styles.deleteWarning}>
                <p style={styles.warningText}>⚠️ אזהרה:</p>
                <p style={styles.warningDetails}>
                  לתקציב זה יש {funds.length} קופות קיימות. לא ניתן למחוק תקציב עם קופות. יש למחוק תחילה את כל הקופות.
                </p>
              </div>
            )}
            <div style={styles.deleteActions}>
              <Button 
                variant="danger" 
                onClick={handleDeleteBudget}
                disabled={submitting || funds.length > 0}
              >
                {submitting ? 'מוחק...' : 'מחק'}
              </Button>
              <Button 
                variant="secondary" 
                onClick={closeDeleteBudgetConfirm}
                disabled={submitting}
              >
                ביטול
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Add responsive styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @media (max-width: 768px) {
    .budget-detail-content {
      padding: 20px !important;
    }
    .budget-summary {
      padding: 16px !important;
    }
    .summary-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 16px !important;
    }
    .funds-grid {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .budget-detail-content h1 {
      font-size: 24px !important;
    }
    .budget-detail-content h2 {
      font-size: 20px !important;
    }
    .budget-detail-content button {
      min-height: 48px !important;
      font-size: 16px !important;
    }
  }
  @media (min-width: 769px) and (max-width: 1024px) {
    .budget-detail-content {
      padding: 32px !important;
    }
    .summary-grid {
      grid-template-columns: repeat(3, 1fr) !important;
    }
    .funds-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
  }
`;
if (!document.head.querySelector('style[data-budget-detail-responsive]')) {
  styleSheet.setAttribute('data-budget-detail-responsive', 'true');
  document.head.appendChild(styleSheet);
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
    minHeight: 'calc(100vh - 80px)',
    fontSize: '20px',
    color: '#718096',
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 80px)',
    gap: '20px',
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
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backButton: {
    minWidth: 'auto',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  summaryCard: {
    background: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '32px',
  },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  summaryTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  budgetMeta: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: '14px',
    color: '#718096',
    padding: '4px 12px',
    background: '#f7fafc',
    borderRadius: '12px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#718096',
  },
  summaryValue: {
    fontSize: '20px',
    fontWeight: 'bold',
  },
  availableItem: {
    padding: '12px',
    background: '#f0fff4',
    borderRadius: '6px',
  },
  availableValue: {
    fontSize: '24px',
    color: '#38a169',
  },
  section: {
    marginBottom: '32px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  fundsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  },
  emptyState: {
    background: 'white',
    padding: '60px 40px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  emptyText: {
    fontSize: '18px',
    color: '#718096',
    margin: 0,
  },
  incomesTable: {
    background: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflowX: 'auto',
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
  },
  td: {
    textAlign: 'right',
    padding: '12px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#2d3748',
  },
  deleteModal: {
    padding: '0',
  },
  deleteText: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '20px',
  },
  deleteWarning: {
    background: '#fff5f5',
    border: '1px solid #feb2b2',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '20px',
  },
  warningText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#c53030',
    margin: '0 0 8px 0',
  },
  warningDetails: {
    fontSize: '14px',
    color: '#742a2a',
    margin: 0,
  },
  deleteActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
};
