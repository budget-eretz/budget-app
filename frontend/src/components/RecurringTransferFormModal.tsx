import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { RecurringTransfer, BudgetWithFunds, BasicUser } from '../types';
import { fundsAPI, usersAPI } from '../services/api';

interface RecurringTransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    recipientUserId: number;
    fundId: number;
    amount: number;
    description: string;
    startDate: string;
    endDate?: string;
    frequency: 'monthly' | 'quarterly' | 'annual';
  }) => void;
  transfer?: RecurringTransfer;
  isLoading?: boolean;
}

const RecurringTransferFormModal: React.FC<RecurringTransferFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  transfer,
  isLoading = false,
}) => {
  const [recipientUserId, setRecipientUserId] = useState<number>(0);
  const [fundId, setFundId] = useState<number>(0);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [budgetsWithFunds, setBudgetsWithFunds] = useState<BudgetWithFunds[]>([]);
  const [users, setUsers] = useState<BasicUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (transfer) {
      setRecipientUserId(transfer.recipientUserId);
      setFundId(transfer.fundId);
      setAmount(String(transfer.amount));
      setDescription(transfer.description);
      setStartDate(transfer.startDate.split('T')[0]);
      setEndDate(transfer.endDate ? transfer.endDate.split('T')[0] : '');
      setFrequency(transfer.frequency);
    } else {
      resetForm();
    }
  }, [transfer]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [fundsRes, usersRes] = await Promise.all([
        fundsAPI.getAccessible(),
        usersAPI.getAll(),
      ]);
      
      console.log('Funds API response:', fundsRes.data);
      console.log('Users API response:', usersRes.data);
      
      // Handle both array and object with budgets property
      const budgetsData = fundsRes.data?.budgets || fundsRes.data;
      console.log('Budgets data after processing:', budgetsData);
      console.log('Is budgets data an array?', Array.isArray(budgetsData));
      setBudgetsWithFunds(Array.isArray(budgetsData) ? budgetsData : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setBudgetsWithFunds([]);
      setUsers([]);
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setRecipientUserId(0);
    setFundId(0);
    setAmount('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setFrequency('monthly');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientUserId || !fundId || !amount || !description || !startDate) {
      alert('נא למלא את כל השדות החובה');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('נא להזין סכום תקין');
      return;
    }

    onSubmit({
      recipientUserId,
      fundId,
      amount: amountNum,
      description,
      startDate,
      endDate: endDate || undefined,
      frequency,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const frequencyOptions = [
    { value: 'monthly', label: 'חודשי' },
    { value: 'quarterly', label: 'רבעוני' },
    { value: 'annual', label: 'שנתי' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={transfer ? 'עריכת העברה קבועה' : 'הוספת העברה קבועה חדשה'}>
      <form onSubmit={handleSubmit} style={{ maxHeight: '80vh', overflowY: 'auto', padding: '1rem' }}>
        {loadingData ? (
          <div className="text-center py-4">טוען נתונים...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Recipient User */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                מקבל התשלום <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={recipientUserId}
                onChange={(e) => setRecipientUserId(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  backgroundColor: !!transfer ? '#f3f4f6' : 'white'
                }}
                required
                disabled={!!transfer}
              >
                <option value={0}>בחר חבר</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Fund */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                סעיף <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={fundId}
                onChange={(e) => {
                  console.log('Fund selected:', e.target.value);
                  setFundId(Number(e.target.value));
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  backgroundColor: !!transfer ? '#f3f4f6' : 'white'
                }}
                required
                disabled={!!transfer}
              >
                <option value={0}>בחר סעיף</option>
                {Array.isArray(budgetsWithFunds) && budgetsWithFunds.map((budget) => (
                  <optgroup key={budget.id} label={`${budget.name} (${budget.type === 'circle' ? 'מעגלי' : 'קבוצתי'})`}>
                    {Array.isArray(budget.funds) && budget.funds.map((fund) => (
                      <option key={fund.id} value={fund.id}>
                        {fund.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                סכום <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem'
                }}
                placeholder="0.00"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                תיאור <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem'
                }}
                placeholder="למשל: דמי קופת חולים, תשלום טלפון"
                required
              />
            </div>

            {/* Frequency */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                תדירות <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'monthly' | 'quarterly' | 'annual')}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem'
                }}
                required
              >
                {frequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                תאריך התחלה <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  backgroundColor: !!transfer ? '#f3f4f6' : 'white'
                }}
                required
                disabled={!!transfer}
              />
            </div>

            {/* End Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                תאריך סיום (אופציונלי)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem'
                }}
                min={startDate}
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                השאר ריק אם ההעברה ממשיכה ללא הגבלת זמן
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.5 : 1
                }}
                disabled={isLoading}
              >
                ביטול
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
                disabled={isLoading}
              >
                {isLoading ? 'שומר...' : transfer ? 'עדכן' : 'הוסף'}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default RecurringTransferFormModal;
