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
      setAmount(transfer.amount.toString());
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
      setBudgetsWithFunds(fundsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {loadingData ? (
          <div className="text-center py-4">טוען נתונים...</div>
        ) : (
          <>
            {/* Recipient User */}
            <div>
              <label className="block text-sm font-medium mb-1">
                מקבל התשלום <span className="text-red-500">*</span>
              </label>
              <select
                value={recipientUserId}
                onChange={(e) => setRecipientUserId(Number(e.target.value))}
                className="w-full p-2 border rounded"
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
              <label className="block text-sm font-medium mb-1">
                קופה <span className="text-red-500">*</span>
              </label>
              <select
                value={fundId}
                onChange={(e) => setFundId(Number(e.target.value))}
                className="w-full p-2 border rounded"
                required
                disabled={!!transfer}
              >
                <option value={0}>בחר קופה</option>
                {budgetsWithFunds.map((budget) => (
                  <optgroup key={budget.id} label={`${budget.name} (${budget.type === 'circle' ? 'מעגלי' : 'קבוצתי'})`}>
                    {budget.funds.map((fund) => (
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
              <label className="block text-sm font-medium mb-1">
                סכום <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="0.00"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">
                תיאור <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="למשל: דמי קופת חולים, תשלום טלפון"
                required
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium mb-1">
                תדירות <span className="text-red-500">*</span>
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'monthly' | 'quarterly' | 'annual')}
                className="w-full p-2 border rounded"
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
              <label className="block text-sm font-medium mb-1">
                תאריך התחלה <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded"
                required
                disabled={!!transfer}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium mb-1">
                תאריך סיום (אופציונלי)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded"
                min={startDate}
              />
              <p className="text-xs text-gray-500 mt-1">השאר ריק אם ההעברה ממשיכה ללא הגבלת זמן</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border rounded hover:bg-gray-50"
                disabled={isLoading}
              >
                ביטול
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                disabled={isLoading}
              >
                {isLoading ? 'שומר...' : transfer ? 'עדכן' : 'הוסף'}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};

export default RecurringTransferFormModal;
