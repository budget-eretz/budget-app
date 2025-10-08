import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fundsAPI, directExpensesAPI } from '../services/api';
import { BudgetWithFunds } from '../types';
import { useToast } from '../components/Toast';
import '../styles/NewReimbursement.css';

const NewDirectExpense: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedFundId = searchParams.get('fundId');

  const [budgets, setBudgets] = useState<BudgetWithFunds[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string>(preselectedFundId || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payee, setPayee] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchAccessibleFunds();
  }, []);

  const fetchAccessibleFunds = async () => {
    try {
      const response = await fundsAPI.getAccessible();
      setBudgets(response.data.budgets);
    } catch (error) {
      console.error('Error fetching funds:', error);
      showToast('שגיאה בטעינת קופות', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFundId || !amount || !description || !payee || !expenseDate) {
      showToast('נא למלא את כל השדות הנדרשים', 'error');
      return;
    }

    setLoading(true);
    try {
      await directExpensesAPI.create({
        fundId: parseInt(selectedFundId),
        amount: parseFloat(amount),
        description,
        payee,
        expenseDate,
        receiptUrl: receiptUrl || undefined,
      });

      showToast('הוצאה ישירה נוצרה בהצלחה', 'success');
      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (error: any) {
      console.error('Error creating direct expense:', error);
      showToast(error.response?.data?.error || 'שגיאה ביצירת הוצאה ישירה', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-reimbursement-page">
      <div className="page-header">
        <h1>הוצאה ישירה חדשה</h1>
        <button onClick={() => navigate(-1)} className="back-button">
          חזרה
        </button>
      </div>

      <form onSubmit={handleSubmit} className="reimbursement-form">
        <div className="form-group">
          <label htmlFor="fund">קופה *</label>
          <select
            id="fund"
            value={selectedFundId}
            onChange={(e) => setSelectedFundId(e.target.value)}
            required
            disabled={!!preselectedFundId}
          >
            <option value="">בחר קופה</option>
            {budgets.map((budget) => (
              <optgroup key={budget.id} label={`${budget.name} (${budget.type === 'circle' ? 'מעגלי' : 'קבוצתי'})`}>
                {budget.funds.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {fund.name} (זמין: ₪{fund.available_amount?.toFixed(2)})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="payee">למי שולם *</label>
          <input
            type="text"
            id="payee"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder="לדוגמה: חברת חשמל, פולוס, ספק ציוד"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">סכום (₪) *</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0.01"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">תיאור *</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="expenseDate">תאריך הוצאה *</label>
          <input
            type="date"
            id="expenseDate"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="receiptUrl">קישור לקבלה/חשבונית</label>
          <input
            type="url"
            id="receiptUrl"
            value={receiptUrl}
            onChange={(e) => setReceiptUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'שומר...' : 'שמור הוצאה'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="cancel-button">
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewDirectExpense;
