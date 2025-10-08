import React, { useState, useEffect } from 'react';
import { monthlyAllocationsAPI } from '../services/api';
import { FundAllocationSummary, FundMonthlyAllocation } from '../types';
import './MonthlyAllocationManager.css';

interface MonthlyAllocationManagerProps {
  fundId: number;
  fundName: string;
  totalFundAllocation: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface MonthlyAllocation {
  year: number;
  month: number;
  amount: number;
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const MonthlyAllocationManager: React.FC<MonthlyAllocationManagerProps> = ({
  fundId,
  fundName,
  totalFundAllocation,
  onClose,
  onSuccess,
}) => {
  const [allocationType, setAllocationType] = useState<'fixed' | 'variable'>('fixed');
  const [fixedAmount, setFixedAmount] = useState<string>('');
  const [variableAllocations, setVariableAllocations] = useState<MonthlyAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Auto-scroll to modal when it opens
  useEffect(() => {
    // Scroll to top of the modal overlay
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
      modalOverlay.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    loadExistingAllocations();
  }, [fundId]);

  const loadExistingAllocations = async () => {
    try {
      const response = await monthlyAllocationsAPI.getAllocations(fundId);
      
      // Transform snake_case to camelCase
      const rawData = response.data;
      const allocationData: FundAllocationSummary = {
        fundId: rawData.fund_id,
        totalFundAllocation: rawData.total_fund_allocation,
        totalMonthlyAllocations: rawData.total_monthly_allocations,
        remainingUnallocated: rawData.remaining_unallocated,
        monthlyAllocations: rawData.monthly_allocations.map((item: any) => ({
          id: item.id,
          fundId: item.fund_id,
          year: item.year,
          month: item.month,
          allocatedAmount: item.allocated_amount,
          allocationType: item.allocation_type,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }))
      };
      
      // Initialize variable allocations with existing data
      if (allocationData.monthlyAllocations.length > 0) {
        const firstAllocation = allocationData.monthlyAllocations[0];
        if (firstAllocation.allocationType === 'fixed') {
          setAllocationType('fixed');
          setFixedAmount(firstAllocation.allocatedAmount.toString());
        } else {
          setAllocationType('variable');
          const allocations = allocationData.monthlyAllocations.map((a: FundMonthlyAllocation) => ({
            year: a.year,
            month: a.month,
            amount: a.allocatedAmount,
          }));
          setVariableAllocations(allocations);
        }
      } else {
        // Initialize empty variable allocations for current year
        const emptyAllocations: MonthlyAllocation[] = [];
        for (let month = 1; month <= 12; month++) {
          emptyAllocations.push({ year: currentYear, month, amount: 0 });
        }
        setVariableAllocations(emptyAllocations);
      }
    } catch (err: any) {
      console.error('Failed to load allocations:', err);
      // Initialize empty allocations on error
      const emptyAllocations: MonthlyAllocation[] = [];
      for (let month = 1; month <= 12; month++) {
        emptyAllocations.push({ year: currentYear, month, amount: 0 });
      }
      setVariableAllocations(emptyAllocations);
    }
  };

  const calculateTotalAllocated = (): number => {
    if (allocationType === 'fixed') {
      const amount = parseFloat(fixedAmount) || 0;
      return amount * 12;
    } else {
      return variableAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    }
  };

  const getRemainingUnallocated = (): number => {
    return totalFundAllocation - calculateTotalAllocated();
  };

  const isOverAllocated = (): boolean => {
    return getRemainingUnallocated() < 0;
  };

  const handleFixedAmountChange = (value: string) => {
    // Allow empty string or valid numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFixedAmount(value);
      setError(null);
    }
  };

  const handleVariableAmountChange = (month: number, value: string) => {
    // Allow empty string or valid numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const amount = value === '' ? 0 : parseFloat(value);
      setVariableAllocations(prev =>
        prev.map(alloc =>
          alloc.month === month ? { ...alloc, amount } : alloc
        )
      );
      setError(null);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    // Validation
    if (allocationType === 'fixed') {
      const amount = parseFloat(fixedAmount);
      if (!amount || amount <= 0) {
        setError('יש להזין סכום חיובי');
        return;
      }
    }

    if (isOverAllocated()) {
      setError(`סכום ההקצאות עולה על תקציב הקופה. יתרה זמינה: ₪${getRemainingUnallocated().toFixed(2)}`);
      return;
    }

    setLoading(true);

    try {
      if (allocationType === 'fixed') {
        await monthlyAllocationsAPI.setFixedAllocation(fundId, {
          amount: parseFloat(fixedAmount),
          startYear: currentYear,
          startMonth: currentMonth,
        });
        setSuccess('הקצאה קבועה נשמרה בהצלחה');
      } else {
        // Filter out zero allocations for variable mode
        const nonZeroAllocations = variableAllocations
          .filter(alloc => alloc.amount > 0)
          .map(alloc => ({
            year: alloc.year,
            month: alloc.month,
            amount: alloc.amount,
          }));

        if (nonZeroAllocations.length === 0) {
          setError('יש להזין לפחות הקצאה אחת');
          setLoading(false);
          return;
        }

        await monthlyAllocationsAPI.setVariableAllocations(fundId, {
          allocations: nonZeroAllocations,
        });
        setSuccess('הקצאות משתנות נשמרו בהצלחה');
      }

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בשמירת ההקצאות');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const totalAllocated = calculateTotalAllocated();
  const remainingUnallocated = getRemainingUnallocated();
  const overAllocated = isOverAllocated();

  return (
    <div className="modal-overlay">
      <div className="modal-content monthly-allocation-manager">
        <div className="modal-header">
          <h2>ניהול הקצאות חודשיות</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="fund-info">
            <h3>{fundName}</h3>
            <div className="allocation-summary">
              <div className="summary-item">
                <span className="label">תקציב כולל:</span>
                <span className="value">₪{totalFundAllocation.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="label">סה"כ הוקצה:</span>
                <span className={`value ${overAllocated ? 'error' : ''}`}>
                  ₪{totalAllocated.toFixed(2)}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">יתרה לא מוקצית:</span>
                <span className={`value ${overAllocated ? 'error' : remainingUnallocated > 0 ? 'success' : ''}`}>
                  ₪{remainingUnallocated.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="allocation-type-toggle">
            <button
              className={`toggle-button ${allocationType === 'fixed' ? 'active' : ''}`}
              onClick={() => setAllocationType('fixed')}
            >
              הקצאה קבועה
            </button>
            <button
              className={`toggle-button ${allocationType === 'variable' ? 'active' : ''}`}
              onClick={() => setAllocationType('variable')}
            >
              הקצאה משתנה
            </button>
          </div>

          {allocationType === 'fixed' ? (
            <div className="fixed-allocation-section">
              <p className="section-description">
                הזן סכום קבוע שיוקצה לכל חודש החל מהחודש הנוכחי
              </p>
              <div className="input-group">
                <label htmlFor="fixed-amount">סכום חודשי:</label>
                <input
                  id="fixed-amount"
                  type="text"
                  inputMode="decimal"
                  value={fixedAmount}
                  onChange={(e) => handleFixedAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="amount-input"
                />
                <span className="currency">₪</span>
              </div>
              <div className="calculation-info">
                <span>סה"כ שנתי (12 חודשים): ₪{(parseFloat(fixedAmount) * 12 || 0).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="variable-allocation-section">
              <p className="section-description">
                הזן סכומים שונים לכל חודש לפי הצורך
              </p>
              <div className="months-grid">
                {variableAllocations.map((alloc) => (
                  <div key={alloc.month} className="month-input-group">
                    <label htmlFor={`month-${alloc.month}`}>
                      {HEBREW_MONTHS[alloc.month - 1]}
                    </label>
                    <div className="input-wrapper">
                      <input
                        id={`month-${alloc.month}`}
                        type="text"
                        inputMode="decimal"
                        value={alloc.amount === 0 ? '' : alloc.amount}
                        onChange={(e) => handleVariableAmountChange(alloc.month, e.target.value)}
                        placeholder="0"
                        className="amount-input"
                      />
                      <span className="currency-small">₪</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="message error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="message success-message">
              {success}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="button button-secondary"
            onClick={handleCancel}
            disabled={loading}
          >
            ביטול
          </button>
          <button
            className="button button-primary"
            onClick={handleSave}
            disabled={loading || overAllocated}
          >
            {loading ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthlyAllocationManager;
