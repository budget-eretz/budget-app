import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { fundsAPI, directExpensesAPI } from '../services/api';
import { BudgetWithFunds, DirectExpense } from '../types';
import { useToast } from './Toast';

interface DirectExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedFundId?: number;
  expense?: DirectExpense;
}

const DirectExpenseFormModal: React.FC<DirectExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedFundId,
  expense,
}) => {
  const [budgets, setBudgets] = useState<BudgetWithFunds[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payee, setPayee] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAccessibleFunds();
      if (expense) {
        // Editing mode
        setSelectedFundId(expense.fundId.toString());
        setAmount(expense.amount.toString());
        setDescription(expense.description);
        setPayee(expense.payee);
        setExpenseDate(expense.expenseDate.split('T')[0]);
        setReceiptUrl(expense.receiptUrl || '');
      } else if (preselectedFundId) {
        setSelectedFundId(preselectedFundId.toString());
      }
    }
  }, [isOpen, preselectedFundId, expense]);

  const fetchAccessibleFunds = async () => {
    try {
      const response = await fundsAPI.getAccessible();
      setBudgets(response.data.budgets);
    } catch (error) {
      console.error('Error fetching funds:', error);
      showToast('שגיאה בטעינת סעיפים', 'error');
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
      if (expense) {
        // Update existing expense
        await directExpensesAPI.update(expense.id, {
          amount: parseFloat(amount),
          description,
          payee,
          expenseDate,
          receiptUrl: receiptUrl || undefined,
        });
        showToast('הוצאה ישירה עודכנה בהצלחה', 'success');
      } else {
        // Create new expense
        await directExpensesAPI.create({
          fundId: parseInt(selectedFundId),
          amount: parseFloat(amount),
          description,
          payee,
          expenseDate,
          receiptUrl: receiptUrl || undefined,
        });
        showToast('הוצאה ישירה נוצרה בהצלחה', 'success');
      }

      resetForm();
      onClose();
      // Call onSuccess after closing to refresh data
      await onSuccess();
    } catch (error: any) {
      console.error('Error saving direct expense:', error);
      showToast(error.response?.data?.error || 'שגיאה בשמירת הוצאה ישירה', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFundId(preselectedFundId?.toString() || '');
    setAmount('');
    setDescription('');
    setPayee('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setReceiptUrl('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={expense ? "עריכת הוצאה ישירה" : "הוצאה ישירה חדשה"}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="fund">סעיף *</label>
          <select
            id="fund"
            value={selectedFundId}
            onChange={(e) => setSelectedFundId(e.target.value)}
            required
            disabled={!!preselectedFundId || !!expense}
            style={styles.select}
          >
            <option value="">בחר סעיף</option>
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

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="payee">למי שולם *</label>
          <input
            type="text"
            id="payee"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder="לדוגמה: חברת חשמל, פולוס, ספק ציוד"
            required
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="amount">סכום (₪) *</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0.01"
            required
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="description">תיאור *</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            required
            style={styles.textarea}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="expenseDate">תאריך הוצאה *</label>
          <input
            type="date"
            id="expenseDate"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="receiptUrl">קישור לקבלה/חשבונית</label>
          <input
            type="url"
            id="receiptUrl"
            value={receiptUrl}
            onChange={(e) => setReceiptUrl(e.target.value)}
            placeholder="https://..."
            style={styles.input}
          />
        </div>

        <div style={styles.formActions}>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'שומר...' : (expense ? 'עדכן הוצאה' : 'שמור הוצאה')}
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose}>
            ביטול
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: 'white',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '10px',
  },
};

export default DirectExpenseFormModal;
