import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { BudgetWithFunds, BasicUser, Group } from '../types';
import { fundsAPI, usersAPI, groupsAPI } from '../services/api';
import SearchableSelect, { SearchableSelectGroup } from './SearchableSelect';

type TransferType = 'group' | 'member' | 'direct';

interface OneTimeTransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitGroup: (data: { groupId: number; amount: number; description?: string; budgetId?: number }) => void;
  onSubmitMember: (data: { fundId: number; amount: number; description: string; expenseDate: string; payee: string }) => void;
  isLoading?: boolean;
}

const OneTimeTransferFormModal: React.FC<OneTimeTransferFormModalProps> = ({
  isOpen,
  onClose,
  onSubmitGroup,
  onSubmitMember,
  isLoading = false,
}) => {
  const [transferType, setTransferType] = useState<TransferType>('group');

  // Group type fields
  const [groupId, setGroupId] = useState<number>(0);
  const [groupBudgetId, setGroupBudgetId] = useState<number>(0);

  // Member/Direct type fields
  const [fundId, setFundId] = useState<number>(0);
  const [payee, setPayee] = useState<string>('');

  // Common fields
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>('');

  // Data
  const [groups, setGroups] = useState<Group[]>([]);
  const [budgetsWithFunds, setBudgetsWithFunds] = useState<BudgetWithFunds[]>([]);
  const [users, setUsers] = useState<BasicUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [groupsRes, fundsRes, usersRes] = await Promise.all([
        groupsAPI.getAll().catch((error) => {
          console.error('Error loading groups:', error);
          return { data: [] as Group[] };
        }),
        fundsAPI.getAccessible(),
        usersAPI.getBasic().catch((error) => {
          console.error('Error loading users list:', error);
          return { data: [] as BasicUser[] };
        }),
      ]);

      setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);

      const budgetsData = fundsRes.data?.budgets || fundsRes.data;
      setBudgetsWithFunds(Array.isArray(budgetsData) ? budgetsData : []);

      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
      setGroups([]);
      setBudgetsWithFunds([]);
      setUsers([]);
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setTransferType('group');
    setGroupId(0);
    setGroupBudgetId(0);
    setFundId(0);
    setPayee('');
    setAmount('');
    setDescription('');
    setExpenseDate('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('נא להזין סכום תקין');
      return;
    }

    if (transferType === 'group') {
      if (!groupId) {
        alert('נא לבחור קבוצה');
        return;
      }
      onSubmitGroup({
        groupId,
        amount: amountNum,
        description: description || undefined,
        budgetId: groupBudgetId || undefined,
      });
    } else {
      if (!fundId) {
        alert('נא לבחור סעיף');
        return;
      }
      if (!description) {
        alert('נא להזין תיאור');
        return;
      }
      if (!expenseDate) {
        alert('נא להזין תאריך');
        return;
      }
      if (transferType === 'direct' && !payee) {
        alert('נא להזין שם מקבל התשלום');
        return;
      }
      onSubmitMember({
        fundId,
        amount: amountNum,
        description,
        expenseDate,
        payee: transferType === 'direct' ? payee : '',
      });
    }
  };

  const groupSelectGroups: SearchableSelectGroup[] = useMemo(() => [{
    label: 'קבוצות',
    options: groups.map((group) => ({
      value: group.id.toString(),
      label: group.name,
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

  const budgetSelectGroups: SearchableSelectGroup[] = useMemo(() => [{
    label: 'תקציבים',
    options: (Array.isArray(budgetsWithFunds) ? budgetsWithFunds : []).map((budget) => ({
      value: budget.id.toString(),
      label: `${budget.name} (${budget.type === 'circle' ? 'מעגלי' : 'קבוצתי'})`,
    })),
  }], [budgetsWithFunds]);

  const typeToggleOptions: { value: TransferType; label: string }[] = [
    { value: 'group', label: 'לקבוצה' },
    { value: 'member', label: 'לחבר' },
    { value: 'direct', label: 'הוצאה ישירה' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="העברה חד-פעמית חדשה">
      <form onSubmit={handleSubmit} style={{ maxHeight: '80vh', overflowY: 'auto', padding: '1rem' }}>
        {loadingData ? (
          <div className="text-center py-4">טוען נתונים...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Type Toggle */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                סוג העברה
              </label>
              <div style={{ display: 'flex', borderRadius: '0.375rem', overflow: 'hidden', border: '1px solid #d1d5db' }}>
                {typeToggleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTransferType(option.value)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: transferType === option.value ? '600' : '400',
                      backgroundColor: transferType === option.value ? '#2563eb' : 'white',
                      color: transferType === option.value ? 'white' : '#374151',
                      border: 'none',
                      borderRight: '1px solid #d1d5db',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Group type fields */}
            {transferType === 'group' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    קבוצה <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <SearchableSelect
                    value={groupId ? groupId.toString() : ''}
                    onChange={(val) => setGroupId(val ? Number(val) : 0)}
                    groups={groupSelectGroups}
                    placeholder="בחר קבוצה"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    קישור לתקציב (אופציונלי)
                  </label>
                  <SearchableSelect
                    value={groupBudgetId ? groupBudgetId.toString() : ''}
                    onChange={(val) => setGroupBudgetId(val ? Number(val) : 0)}
                    groups={budgetSelectGroups}
                    placeholder="בחר תקציב (אופציונלי)"
                  />
                </div>
              </>
            )}

            {/* Member/Direct type fields */}
            {(transferType === 'member' || transferType === 'direct') && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                    סעיף <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <SearchableSelect
                    value={fundId ? fundId.toString() : ''}
                    onChange={(val) => setFundId(val ? Number(val) : 0)}
                    groups={fundSelectGroups}
                    placeholder="בחר סעיף"
                    required
                  />
                </div>

                {transferType === 'direct' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                      מקבל התשלום <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={payee}
                      onChange={(e) => setPayee(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '1rem',
                      }}
                      placeholder="שם ספק או מקבל תשלום"
                      required
                    />
                  </div>
                )}
              </>
            )}

            {/* Amount - common */}
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
                  fontSize: '1rem',
                }}
                placeholder="0.00"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                תיאור{transferType !== 'group' && <span style={{ color: '#ef4444' }}> *</span>}
                {transferType === 'group' && <span style={{ color: '#6b7280', fontWeight: 'normal' }}> (אופציונלי)</span>}
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
                  fontSize: '1rem',
                }}
                placeholder={transferType === 'group' ? 'תיאור העברה לקבוצה' : 'תיאור ההוצאה'}
                required={transferType !== 'group'}
              />
            </div>

            {/* Expense Date - member/direct only */}
            {(transferType === 'member' || transferType === 'direct') && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  תאריך הוצאה <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                  }}
                  required
                />
              </div>
            )}

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
                  opacity: isLoading ? 0.5 : 1,
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
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
                disabled={isLoading}
              >
                {isLoading ? 'שומר...' : 'צור העברה'}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default OneTimeTransferFormModal;
