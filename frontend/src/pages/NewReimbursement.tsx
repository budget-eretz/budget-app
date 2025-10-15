import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fundsAPI, reimbursementsAPI, usersAPI } from '../services/api';
import { BudgetWithFunds, BasicUser } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Navigation from '../components/Navigation';
import '../styles/NewReimbursement.css';

export default function NewReimbursement() {
  const [budgets, setBudgets] = useState<BudgetWithFunds[]>([]);
  const [users, setUsers] = useState<BasicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    fundId: '',
    amount: '',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0],
    recipientUserId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Handle pre-selected fund from navigation (query param or state)
    const params = new URLSearchParams(location.search);
    const fundIdFromQuery = params.get('fundId');
    const fundIdFromState = (location.state as any)?.fundId;
    
    const preSelectedFundId = fundIdFromQuery || fundIdFromState;
    if (preSelectedFundId) {
      setFormData(prev => ({ ...prev, fundId: preSelectedFundId }));
    }
  }, [location, budgets]);

  const loadData = async () => {
    try {
      const [fundsResponse, usersResponse] = await Promise.all([
        fundsAPI.getAccessible(),
        usersAPI.getBasic(),
      ]);
      
      setBudgets(fundsResponse.data.budgets || []);
      setUsers(usersResponse.data || []);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בטעינת הנתונים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fundId) {
      showToast('יש לבחור קופה', 'error');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('יש להזין סכום חיובי', 'error');
      return;
    }

    if (!formData.description.trim()) {
      showToast('יש להזין תיאור', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await reimbursementsAPI.create({
        fundId: parseInt(formData.fundId),
        amount: parseFloat(formData.amount),
        description: formData.description,
        expenseDate: formData.expenseDate,
        recipientUserId: formData.recipientUserId ? parseInt(formData.recipientUserId) : undefined,
      });

      showToast('בקשת ההחזר הוגשה בהצלחה', 'success');
      navigate('/my-reimbursements');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בהגשת הבקשה', 'error');
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

      <div className="reimbursement-content" style={styles.content}>
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>הגשת בקשת החזר</h1>
        </div>
        <div style={styles.formCard}>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>
                בחר קופה <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <select
                value={formData.fundId}
                onChange={(e) => setFormData({ ...formData, fundId: e.target.value })}
                required
                style={styles.select}
              >
                <option value="">-- בחר קופה --</option>
                {budgets.length === 0 ? (
                  <option disabled>אין קופות זמינות</option>
                ) : (
                  budgets.map((budget) => (
                    <optgroup 
                      key={budget.id} 
                      label={`${budget.name} (${budget.type === 'circle' ? 'מעגלי' : 'קבוצתי'}${budget.groupName ? ' - ' + budget.groupName : ''})`}
                    >
                      {budget.funds.map((fund) => (
                        <option key={fund.id} value={fund.id}>
                          {fund.name} - זמין: {formatCurrency(fund.available_amount || 0)}
                        </option>
                      ))}
                    </optgroup>
                  ))
                )}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                שלח תשלום ל (אופציונלי)
              </label>
              <select
                value={formData.recipientUserId}
                onChange={(e) => setFormData({ ...formData, recipientUserId: e.target.value })}
                style={styles.select}
              >
                <option value="">-- אני (ברירת מחדל) --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
              <small style={{ color: '#718096', fontSize: '13px' }}>
                אם ההחזר מיועד למישהו אחר, בחר את שמו כאן
              </small>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                סכום <span style={{ color: '#e53e3e' }}>*</span>
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
                placeholder="תאר את ההוצאה..."
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                תאריך הוצאה <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <input
                type="date"
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                required
                style={styles.input}
                max={new Date().toISOString().split('T')[0]}
              />
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
                הגש בקשה
              </Button>
            </div>
          </form>
        </div>

        {budgets.length > 0 && (
          <div className="reimbursement-sidebar" style={styles.sidebar}>
            <h3 style={styles.sidebarTitle}>קופות זמינות</h3>
            <div style={styles.fundsList}>
              {budgets.map((budget) => (
                <div key={budget.id} style={styles.budgetSection}>
                  <h4 style={styles.budgetHeader}>
                    {budget.name} ({budget.type === 'circle' ? 'מעגלי' : 'קבוצתי'})
                    {budget.groupName && ` - ${budget.groupName}`}
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
    gap: '24px',
  },
  budgetSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  budgetHeader: {
    fontSize: '15px',
    fontWeight: 'bold',
    margin: 0,
    color: '#2d3748',
    paddingBottom: '8px',
    borderBottom: '2px solid #e2e8f0',
  },
  fundCard: {
    background: 'white',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginLeft: '12px',
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
