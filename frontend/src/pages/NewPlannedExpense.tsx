import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { fundsAPI, plannedExpensesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Navigation from '../components/Navigation';

interface Budget {
  id: number;
  name: string;
  type: 'circle' | 'group';
  groupName?: string;
  funds: {
    id: number;
    name: string;
    allocated_amount: number;
    available_amount: number;
    description?: string;
  }[];
}

export default function NewPlannedExpense() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    fundId: '',
    amount: '',
    description: '',
    plannedDate: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Pre-select fund if passed via navigation state
    const state = location.state as { fundId?: number } | null;
    if (state?.fundId !== undefined) {
      setFormData(prev => ({ ...prev, fundId: state.fundId!.toString() }));
    }
  }, [location.state]);

  const loadData = async () => {
    try {
      const fundsResponse = await fundsAPI.getAccessible();
      setBudgets(fundsResponse.data.budgets || []);

      // If in edit mode, load the planned expense data
      if (isEditMode && id) {
        const expenseResponse = await plannedExpensesAPI.getById(parseInt(id));
        const expense = expenseResponse.data;
        setFormData({
          fundId: expense.fund_id.toString(),
          amount: expense.amount.toString(),
          description: expense.description,
          plannedDate: expense.planned_date.split('T')[0],
        });
      }
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בטעינת הנתונים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fundId) {
      showToast('יש לבחור סעיף', 'error');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('יש להזין סכום חיובי', 'error');
      return;
    }

    if (!formData.plannedDate) {
      showToast('יש לבחור תאריך מתוכנן', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode && id) {
        // Update existing planned expense
        await plannedExpensesAPI.update(parseInt(id), {
          fundId: parseInt(formData.fundId),
          amount: parseFloat(formData.amount),
          description: formData.description,
          plannedDate: formData.plannedDate,
        });
        showToast('התכנון עודכן בהצלחה', 'success');
        navigate('/dashboard');
      } else {
        // Create new planned expense
        await plannedExpensesAPI.create({
          fundId: parseInt(formData.fundId),
          amount: parseFloat(formData.amount),
          description: formData.description,
          plannedDate: formData.plannedDate,
        });
        showToast('התכנון נוצר בהצלחה', 'success');
        
        // Reset form for next entry instead of navigating away
        setFormData({
          fundId: '',
          amount: '',
          description: '',
          plannedDate: '',
        });
      }
    } catch (error: any) {
      showToast(error.response?.data?.error || `שגיאה ב${isEditMode ? 'עדכון' : 'יצירת'} התכנון`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
  };

  if (loading) {
    return <div style={styles.loading}>טוען...</div>;
  }

  return (
    <div style={styles.container}>
      <Navigation />

      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>{isEditMode ? 'עריכת תכנון הוצאה' : 'יצירת תכנון הוצאה'}</h1>
        </div>
        <div style={styles.formCard}>
          <p style={{ color: '#718096', marginBottom: '24px' }}>
            {isEditMode 
              ? 'ערוך את פרטי התכנון שלך. שים לב שהשינויים ישפיעו על החישובים החודשיים.'
              : 'תכנון הוצאה מאפשר לך לתכנן הוצאות עתידיות ולעקוב אחר ביצוען מול התכנון.'
            }
          </p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>
                בחר סעיף <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <select
                value={formData.fundId}
                onChange={(e) => setFormData({ ...formData, fundId: e.target.value })}
                required
                style={styles.select}
              >
                <option value="">-- בחר סעיף --</option>
                {budgets.map((budget) => (
                  <optgroup key={budget.id} label={`${budget.name} (${budget.type === 'circle' ? 'מעגלי' : 'קבוצתי'})`}>
                    {budget.funds.map((fund) => (
                      <option key={fund.id} value={fund.id}>
                        {fund.name} - זמין: {formatCurrency(fund.available_amount || 0)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                סכום מתוכנן <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                style={styles.input}
                placeholder="0.00"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                תיאור <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={4}
                style={styles.textarea}
                placeholder="למה אתה מתכנן להוציא את הכסף?"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                תאריך מתוכנן <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <input
                type="date"
                value={formData.plannedDate}
                onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                required
                style={styles.input}
              />
              <small style={{ color: '#718096', fontSize: '13px' }}>
                מתי אתה מתכנן לבצע את ההוצאה?
              </small>
            </div>

            <div style={styles.actions}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/dashboard')}
                disabled={submitting}
              >
                ביטול
              </Button>
              <Button type="submit" variant="primary" isLoading={submitting}>
                {isEditMode ? 'עדכן תכנון' : 'צור תכנון'}
              </Button>
            </div>
          </form>
        </div>

        {budgets.length > 0 && (
          <div style={styles.sidebar}>
            <h3 style={styles.sidebarTitle}>סעיפים זמינים</h3>
            <div style={styles.fundsList}>
              {budgets.map((budget) => (
                <div key={budget.id}>
                  <h4 style={styles.budgetTitle}>
                    {budget.name} ({budget.type === 'circle' ? 'מעגלי' : 'קבוצתי'})
                  </h4>
                  {budget.funds.map((fund) => (
                    <div key={fund.id} style={styles.fundCard}>
                      <h5 style={styles.fundName}>{fund.name}</h5>
                      <div style={styles.fundDetails}>
                        <div style={styles.fundRow}>
                          <span>מקורי:</span>
                          <span>{formatCurrency(fund.allocated_amount)}</span>
                        </div>
                        <div style={{ ...styles.fundRow, ...styles.fundRowTotal }}>
                          <span>
                            <strong>זמין:</strong>
                          </span>
                          <span style={{ color: '#38a169' }}>
                            <strong>{formatCurrency(fund.available_amount || 0)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '20px',
  },
  container: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  pageHeader: {
    gridColumn: '1 / -1',
    marginBottom: '8px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  content: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '40px',
  },
  formCard: {
    background: 'white',
    padding: '32px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  input: {
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: 'white',
  },
  textarea: {
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '16px',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },
  fundsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  budgetTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 12px 0',
    color: '#2d3748',
  },
  fundCard: {
    background: 'white',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '12px',
  },
  fundName: {
    fontSize: '15px',
    fontWeight: '600',
    margin: '0 0 10px 0',
  },
  fundDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fundRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
  },
  fundRowTotal: {
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px solid #e2e8f0',
  },
};
