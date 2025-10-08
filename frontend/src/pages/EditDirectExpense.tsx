import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { directExpensesAPI } from '../services/api';
import { DirectExpense } from '../types';
import { useToast } from '../components/Toast';
import '../styles/NewReimbursement.css';

const EditDirectExpense: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [expense, setExpense] = useState<DirectExpense | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payee, setPayee] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (id) {
      fetchExpense();
    }
  }, [id]);

  const fetchExpense = async () => {
    try {
      const response = await directExpensesAPI.getById(parseInt(id!));
      const exp = response.data;
      setExpense(exp);
      setAmount(exp.amount.toString());
      setDescription(exp.description);
      setPayee(exp.payee);
      setExpenseDate(exp.expense_date.split('T')[0]);
      setReceiptUrl(exp.receipt_url || '');
    } catch (error: any) {
      console.error('Error fetching expense:', error);
      showToast(error.response?.data?.error || 'שגיאה בטעינת הוצאה', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !description || !payee || !expenseDate) {
      showToast('נא למלא את כל השדות הנדרשים', 'error');
      return;
    }

    setLoading(true);
    try {
      await directExpensesAPI.update(parseInt(id!), {
        amount: parseFloat(amount),
        description,
        payee,
        expenseDate,
        receiptUrl: receiptUrl || undefined,
      });

      showToast('הוצאה עודכנה בהצלחה', 'success');
      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (error: any) {
      console.error('Error updating direct expense:', error);
      showToast(error.response?.data?.error || 'שגיאה בעדכון הוצאה', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!expense) {
    return <div className="loading">טוען...</div>;
  }

  return (
    <div className="new-reimbursement-page">
      <div className="page-header">
        <h1>עריכת הוצאה ישירה</h1>
        <button onClick={() => navigate(-1)} className="back-button">
          חזרה
        </button>
      </div>

      <form onSubmit={handleSubmit} className="reimbursement-form">
        <div className="form-group">
          <label>קופה</label>
          <input
            type="text"
            value={expense.fundName || ''}
            disabled
            className="disabled-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="payee">למי שולם *</label>
          <input
            type="text"
            id="payee"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
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
            {loading ? 'שומר...' : 'שמור שינויים'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="cancel-button">
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditDirectExpense;
