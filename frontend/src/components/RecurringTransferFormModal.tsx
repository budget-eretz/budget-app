import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { RecurringTransfer, BudgetWithFunds, BasicUser } from '../types';
import { fundsAPI, usersAPI, groupsAPI } from '../services/api';
import SearchableSelect, { SearchableSelectGroup } from './SearchableSelect';

interface RecurringTransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    recipientUserId?: number;
    recipientGroupId?: number;
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
  const [recipientType, setRecipientType] = useState<'member' | 'group'>('member');
  const [recipientUserId, setRecipientUserId] = useState<number>(0);
  const [recipientGroupId, setRecipientGroupId] = useState<number>(0);
  const [fundId, setFundId] = useState<number>(0);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [budgetsWithFunds, setBudgetsWithFunds] = useState<BudgetWithFunds[]>([]);
  const [users, setUsers] = useState<BasicUser[]>([]);
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (transfer) {
      setRecipientType(transfer.recipientGroupId ? 'group' : 'member');
      setRecipientUserId(transfer.recipientUserId || 0);
      setRecipientGroupId(transfer.recipientGroupId || 0);
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
    setLoadingData(true);
    try {
      const [fundsRes, usersRes, groupsRes] = await Promise.all([
        fundsAPI.getAccessible(),
        usersAPI.getBasic().catch((error) => {
          console.error('Error loading users list:', error);
          return { data: [] as BasicUser[] };
        }),
        groupsAPI.getAll().catch(() => ({ data: [] })),
      ]);

      const budgetsData = fundsRes.data?.budgets || fundsRes.data;
      setBudgetsWithFunds(Array.isArray(budgetsData) ? budgetsData : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
    } catch (error) {
      console.error('Error loading funds data:', error);
      setBudgetsWithFunds([]);
      setUsers([]);
      setGroups([]);
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setRecipientType('member');
    setRecipientUserId(0);
    setRecipientGroupId(0);
    setFundId(0);
    setAmount('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setFrequency('monthly');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (recipientType === 'member' && !recipientUserId) {
      alert('נא לבחור מקבל תשלום');
      return;
    }
    if (recipientType === 'group' && !recipientGroupId) {
      alert('נא לבחור קבוצה');
      return;
    }

    if (!fundId || !amount || !description || !startDate) {
      alert('נא למלא את כל השדות החובה');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('נא להזין סכום תקין');
      return;
    }

    onSubmit({
      ...(recipientType === 'member' ? { recipientUserId } : { recipientGroupId }),
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

  const userSelectGroups: SearchableSelectGroup[] = useMemo(() => [{
    label: 'חברים',
    options: users.map((user) => ({
      value: user.id.toString(),
      label: user.fullName,
    })),
  }], [users]);

  const groupSelectGroups: SearchableSelectGroup[] = useMemo(() => [{
    label: 'קבוצות',
    options: groups.map((g) => ({
      value: g.id.toString(),
      label: g.name,
    })),
  }], [groups]);

  const fundSelectGroups: SearchableSelectGroup[] = useMemo(() => {
    const bwf = Array.isArray(budgetsWithFunds) ? budgetsWithFunds : [];
    return bwf.map((budget) => ({
      label: `${budget.name} (${budget.type === 'circle' ? 'מעגלי' : 'קבוצתי'})`,
      options: (Array.isArray(budget.funds) ? budget.funds : []).map((fund) => ({
        value: fund.id.toString(),
        label: fund.name,
      })),
    }));
  }, [budgetsWithFunds]);

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
            {/* Recipient type toggle */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                סוג נמען
              </label>
              <div style={{ display: 'flex', gap: '0', border: '1px solid #d1d5db', borderRadius: '0.375rem', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setRecipientType('member')}
                  style={{
                    flex: 1, padding: '0.5rem', border: 'none',
                    background: recipientType === 'member' ? '#2563eb' : 'white',
                    color: recipientType === 'member' ? 'white' : '#6b7280',
                    fontWeight: recipientType === 'member' ? '600' : '400',
                    cursor: !!transfer ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    borderLeft: '1px solid #d1d5db',
                  }}
                  disabled={!!transfer}
                >
                  חבר
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientType('group')}
                  style={{
                    flex: 1, padding: '0.5rem', border: 'none',
                    background: recipientType === 'group' ? '#2563eb' : 'white',
                    color: recipientType === 'group' ? 'white' : '#6b7280',
                    fontWeight: recipientType === 'group' ? '600' : '400',
                    cursor: !!transfer ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                  }}
                  disabled={!!transfer}
                >
                  קבוצה
                </button>
              </div>
            </div>

            {/* Recipient selector */}
            {recipientType === 'member' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  מקבל התשלום <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <SearchableSelect
                  value={recipientUserId ? recipientUserId.toString() : ''}
                  onChange={(val) => setRecipientUserId(val ? Number(val) : 0)}
                  groups={userSelectGroups}
                  placeholder="בחר חבר"
                  required
                  disabled={!!transfer}
                />
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  קבוצה <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <SearchableSelect
                  value={recipientGroupId ? recipientGroupId.toString() : ''}
                  onChange={(val) => setRecipientGroupId(val ? Number(val) : 0)}
                  groups={groupSelectGroups}
                  placeholder="בחר קבוצה"
                  required
                  disabled={!!transfer}
                />
              </div>
            )}

            {/* Fund */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                סעיף <span style={{ color: '#ef4444' }}>*</span>
                {transfer?.isBudgetActive === false && (
                  <span style={{ color: '#c53030', fontWeight: 'normal', marginRight: '0.5rem' }}>
                    (התקציב הנוכחי לא פעיל - יש לבחור סעיף חדש)
                  </span>
                )}
              </label>
              <SearchableSelect
                value={fundId ? fundId.toString() : ''}
                onChange={(val) => setFundId(val ? Number(val) : 0)}
                groups={fundSelectGroups}
                placeholder="בחר סעיף"
                required
              />
              {transfer && (
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  ניתן לשנות את הסעיף להעברה קבועה קיימת
                </p>
              )}
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
