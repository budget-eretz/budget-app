import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { budgetsAPI } from '../services/api';
import { Budget } from '../types';
import { useToast } from '../components/Toast';
import BudgetCard from '../components/BudgetCard';
import Button from '../components/Button';
import Navigation from '../components/Navigation';
import BudgetForm, { BudgetFormData } from '../components/BudgetForm';

export default function Budgets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // All authenticated users can view budgets
    loadBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const response = await budgetsAPI.getAll();
      setBudgets(response.data);
    } catch (error: any) {
      console.error('Failed to load budgets:', error);

      // Handle specific error cases
      if (error.response?.status === 403) {
        showToast('אין לך הרשאה לצפות בתקציבים', 'error');
        navigate('/dashboard');
      } else if (error.response?.status === 401) {
        showToast('נדרשת התחברות מחדש', 'error');
        navigate('/login');
      } else if (!error.response) {
        showToast('שגיאת רשת - אנא בדוק את החיבור לאינטרנט', 'error');
      } else {
        showToast(error.response?.data?.error || 'שגיאה בטעינת התקציבים', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetClick = (budgetId: number) => {
    navigate(`/budgets/${budgetId}`);
  };

  const handleCreateBudget = async (data: BudgetFormData) => {
    try {
      setSubmitting(true);
      await budgetsAPI.create({
        name: data.name,
        totalAmount: data.totalAmount,
        fiscalYear: data.fiscalYear,
        groupId: data.groupId,
        isActive: data.isActive,
        budgetType: data.budgetType,
      });
      showToast('התקציב נוצר בהצלחה', 'success');
      setShowCreateModal(false);
      await loadBudgets(); // Refresh the list
    } catch (error: any) {
      console.error('Failed to create budget:', error);

      // Handle specific error cases
      if (error.response?.status === 403) {
        showToast('אין לך הרשאה ליצור תקציבים', 'error');
        setShowCreateModal(false);
        navigate('/dashboard');
      } else if (error.response?.status === 400) {
        showToast(error.response?.data?.error || 'נתונים לא תקינים', 'error');
      } else if (error.response?.status === 401) {
        showToast('נדרשת התחברות מחדש', 'error');
        navigate('/login');
      } else if (!error.response) {
        showToast('שגיאת רשת - אנא בדוק את החיבור לאינטרנט', 'error');
      } else {
        showToast(error.response?.data?.error || 'שגיאה ביצירת התקציב', 'error');
      }
      throw error; // Re-throw to prevent modal from closing
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBudget = async (data: BudgetFormData) => {
    if (!editingBudget) return;

    try {
      setSubmitting(true);
      await budgetsAPI.update(editingBudget.id, {
        name: data.name,
        totalAmount: data.totalAmount,
        fiscalYear: data.fiscalYear,
        isActive: data.isActive,
        budgetType: data.budgetType,
      });
      showToast('התקציב עודכן בהצלחה', 'success');
      setShowEditModal(false);
      setEditingBudget(null);
      await loadBudgets(); // Refresh the list
    } catch (error: any) {
      console.error('Failed to update budget:', error);

      // Handle specific error cases
      if (error.response?.status === 403) {
        showToast('אין לך הרשאה לערוך תקציב זה', 'error');
        setShowEditModal(false);
      } else if (error.response?.status === 404) {
        showToast('התקציב לא נמצא', 'error');
        setShowEditModal(false);
        await loadBudgets();
      } else if (error.response?.status === 400) {
        showToast(error.response?.data?.error || 'נתונים לא תקינים', 'error');
      } else if (error.response?.status === 401) {
        showToast('נדרשת התחברות מחדש', 'error');
        navigate('/login');
      } else if (!error.response) {
        showToast('שגיאת רשת - אנא בדוק את החיבור לאינטרנט', 'error');
      } else {
        showToast(error.response?.data?.error || 'שגיאה בעדכון התקציב', 'error');
      }
      throw error; // Re-throw to prevent modal from closing
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingBudget(null);
  };

  if (loading) {
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

      <div className="budgets-content" style={styles.content}>
        <div className="budgets-header" style={styles.header}>
          <h1 className="budgets-title" style={styles.title}>תקציבים</h1>
          {(user?.isCircleTreasurer || user?.isGroupTreasurer) && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => navigate('/movements/transfer')}>
                העברת תנועות
              </Button>
              {user?.isCircleTreasurer && (
                <Button variant="primary" onClick={openCreateModal}>
                  + צור תקציב
                </Button>
              )}
            </div>
          )}
        </div>

        {budgets.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>אין תקציבים במערכת</p>
            {user?.isCircleTreasurer && (
              <Button variant="primary" onClick={openCreateModal}>
                צור תקציב ראשון
              </Button>
            )}
          </div>
        ) : (
          <div className="budgets-grid" style={styles.grid}>
            {budgets.map(budget => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onClick={() => handleBudgetClick(budget.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Budget Modal */}
      {showCreateModal && (
        <BudgetForm
          onSubmit={handleCreateBudget}
          onCancel={closeCreateModal}
          isLoading={submitting}
        />
      )}

      {/* Edit Budget Modal */}
      {showEditModal && editingBudget && (
        <BudgetForm
          budget={editingBudget}
          onSubmit={handleEditBudget}
          onCancel={closeEditModal}
          isLoading={submitting}
        />
      )}
    </div>
  );
}

// Add responsive styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @media (max-width: 768px) {
    .budgets-grid {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }
    .budgets-content {
      padding: 20px !important;
    }
    .budgets-header {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 16px !important;
    }
    .budgets-header button {
      width: 100%;
      min-height: 48px;
      font-size: 16px;
    }
    .budgets-title {
      font-size: 24px !important;
    }
  }
  @media (min-width: 769px) and (max-width: 1024px) {
    .budgets-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .budgets-content {
      padding: 32px !important;
    }
  }
`;
if (!document.head.querySelector('style[data-budgets-responsive]')) {
  styleSheet.setAttribute('data-budgets-responsive', 'true');
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
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  grid: {
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
};
