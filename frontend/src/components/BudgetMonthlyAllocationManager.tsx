import React, { useState, useEffect } from 'react';
import { monthlyAllocationsAPI } from '../services/api';
import { Fund, FundAllocationSummary, FundMonthlyAllocation } from '../types';
import './BudgetMonthlyAllocationManager.css';

interface BudgetMonthlyAllocationManagerProps {
  budgetId: number;
  budgetName: string;
  funds: Fund[];
  onClose: () => void;
  onSuccess: () => void;
}

interface FundAllocationData {
  fundId: number;
  fundName: string;
  totalFundAllocation: number;
  allocationType: 'fixed' | 'variable';
  fixedAmount: string;
  variableAllocations: MonthlyAllocation[];
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

const BudgetMonthlyAllocationManager: React.FC<BudgetMonthlyAllocationManagerProps> = ({
  budgetId,
  budgetName,
  funds,
  onClose,
  onSuccess,
}) => {
  const [fundsData, setFundsData] = useState<FundAllocationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [expandedFunds, setExpandedFunds] = useState<Set<number>>(new Set());

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  useEffect(() => {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
      modalOverlay.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    if (!initialLoadDone) {
      loadAllFundsAllocations();
    }
  }, [funds, initialLoadDone]);

  const loadAllFundsAllocations = async () => {
    try {
      const fundsDataPromises = funds.map(async (fund) => {
        try {
          const response = await monthlyAllocationsAPI.getAllocations(fund.id);
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

          const emptyAllocations: MonthlyAllocation[] = [];
          for (let month = 1; month <= 12; month++) {
            emptyAllocations.push({ year: currentYear, month, amount: 0 });
          }

          if (allocationData.monthlyAllocations.length > 0) {
            const firstAllocation = allocationData.monthlyAllocations[0];
            if (firstAllocation.allocationType === 'fixed') {
              return {
                fundId: fund.id,
                fundName: fund.name,
                totalFundAllocation: fund.allocated_amount,
                allocationType: 'fixed' as const,
                fixedAmount: firstAllocation.allocatedAmount.toString(),
                variableAllocations: emptyAllocations,
              };
            } else {
              const allocations = allocationData.monthlyAllocations.map((a: FundMonthlyAllocation) => ({
                year: a.year,
                month: a.month,
                amount: a.allocatedAmount,
              }));
              return {
                fundId: fund.id,
                fundName: fund.name,
                totalFundAllocation: fund.allocated_amount,
                allocationType: 'variable' as const,
                fixedAmount: '',
                variableAllocations: allocations,
              };
            }
          } else {
            return {
              fundId: fund.id,
              fundName: fund.name,
              totalFundAllocation: fund.allocated_amount,
              allocationType: 'fixed' as const,
              fixedAmount: '',
              variableAllocations: emptyAllocations,
            };
          }
        } catch (err) {
          console.error(`Failed to load allocations for fund ${fund.id}:`, err);
          const emptyAllocations: MonthlyAllocation[] = [];
          for (let month = 1; month <= 12; month++) {
            emptyAllocations.push({ year: currentYear, month, amount: 0 });
          }
          return {
            fundId: fund.id,
            fundName: fund.name,
            totalFundAllocation: fund.allocated_amount,
            allocationType: 'fixed' as const,
            fixedAmount: '',
            variableAllocations: emptyAllocations,
          };
        }
      });

      const loadedFundsData = await Promise.all(fundsDataPromises);
      setFundsData(loadedFundsData);
      setInitialLoadDone(true);
    } catch (err: any) {
      console.error('Failed to load funds allocations:', err);
      setInitialLoadDone(true);
    }
  };

  const toggleFundExpanded = (fundId: number) => {
    setExpandedFunds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fundId)) {
        newSet.delete(fundId);
      } else {
        newSet.add(fundId);
      }
      return newSet;
    });
  };

  const handleAllocationTypeChange = (fundId: number, type: 'fixed' | 'variable') => {
    setFundsData(prev =>
      prev.map(fund =>
        fund.fundId === fundId
          ? { ...fund, allocationType: type }
          : fund
      )
    );
  };

  const handleFixedAmountChange = (fundId: number, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFundsData(prev =>
        prev.map(fund =>
          fund.fundId === fundId
            ? { ...fund, fixedAmount: value }
            : fund
        )
      );
      setError(null);
    }
  };

  const handleVariableAmountChange = (fundId: number, month: number, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const amount = value === '' ? 0 : parseFloat(value);
      setFundsData(prev =>
        prev.map(fund =>
          fund.fundId === fundId
            ? {
                ...fund,
                variableAllocations: fund.variableAllocations.map(alloc =>
                  alloc.month === month ? { ...alloc, amount } : alloc
                )
              }
            : fund
        )
      );
      setError(null);
    }
  };

  const calculateFundTotalAllocated = (fund: FundAllocationData): number => {
    if (fund.allocationType === 'fixed') {
      const amount = parseFloat(fund.fixedAmount) || 0;
      return amount * 12;
    } else {
      return fund.variableAllocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    }
  };

  const getFundRemainingUnallocated = (fund: FundAllocationData): number => {
    return fund.totalFundAllocation - calculateFundTotalAllocated(fund);
  };

  const isFundOverAllocated = (fund: FundAllocationData): boolean => {
    return getFundRemainingUnallocated(fund) < 0;
  };

  const validateAllFunds = (): string | null => {
    for (const fund of fundsData) {
      if (fund.allocationType === 'fixed') {
        const amount = parseFloat(fund.fixedAmount);
        if (amount && amount < 0) {
          return `סעיף "${fund.fundName}": סכום לא יכול להיות שלילי`;
        }
      }

      if (isFundOverAllocated(fund)) {
        return `סעיף "${fund.fundName}": סכום ההקצאות עולה על תקציב הסעיף`;
      }
    }
    return null;
  };

  const handleSaveAll = async () => {
    setError(null);
    setSuccess(null);

    const validationError = validateAllFunds();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const savePromises = fundsData.map(async (fund) => {
        if (fund.allocationType === 'fixed') {
          const amount = parseFloat(fund.fixedAmount);
          if (amount && amount > 0) {
            await monthlyAllocationsAPI.setFixedAllocation(fund.fundId, {
              amount,
              startYear: currentYear,
              startMonth: currentMonth,
            });
          }
        } else {
          const nonZeroAllocations = fund.variableAllocations
            .filter(alloc => alloc.amount > 0)
            .map(alloc => ({
              year: alloc.year,
              month: alloc.month,
              amount: alloc.amount,
            }));

          if (nonZeroAllocations.length > 0) {
            await monthlyAllocationsAPI.setVariableAllocations(fund.fundId, {
              allocations: nonZeroAllocations,
            });
          }
        }
      });

      await Promise.all(savePromises);
      setSuccess('כל ההקצאות נשמרו בהצלחה');

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

  return (
    <div className="modal-overlay">
      <div className="modal-content budget-monthly-allocation-manager">
        <div className="modal-header">
          <h2>ניהול הקצאות חודשיות - {budgetName}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="description">
            נהל את ההקצאות החודשיות לכל הסעיפים בתקציב במקום אחד
          </p>

          <div className="funds-list">
            {fundsData.map(fund => {
              const isExpanded = expandedFunds.has(fund.fundId);
              const totalAllocated = calculateFundTotalAllocated(fund);
              const remainingUnallocated = getFundRemainingUnallocated(fund);
              const overAllocated = isFundOverAllocated(fund);

              return (
                <div key={fund.fundId} className="fund-section">
                  <div
                    className="fund-header"
                    onClick={() => toggleFundExpanded(fund.fundId)}
                  >
                    <div className="fund-header-content">
                      <h3>{fund.fundName}</h3>
                      <div className="fund-summary">
                        <span className="fund-budget">
                          תקציב: ₪{fund.totalFundAllocation.toFixed(2)}
                        </span>
                        <span className={`fund-allocated ${overAllocated ? 'error' : ''}`}>
                          הוקצה: ₪{totalAllocated.toFixed(2)}
                        </span>
                        <span className={`fund-remaining ${overAllocated ? 'error' : remainingUnallocated > 0 ? 'success' : ''}`}>
                          יתרה: ₪{remainingUnallocated.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <button className="expand-button">
                      {isExpanded ? '▼' : '◀'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="fund-content">
                      <div className="allocation-type-toggle">
                        <button
                          className={`toggle-button ${fund.allocationType === 'fixed' ? 'active' : ''}`}
                          onClick={() => handleAllocationTypeChange(fund.fundId, 'fixed')}
                        >
                          הקצאה קבועה
                        </button>
                        <button
                          className={`toggle-button ${fund.allocationType === 'variable' ? 'active' : ''}`}
                          onClick={() => handleAllocationTypeChange(fund.fundId, 'variable')}
                        >
                          הקצאה משתנה
                        </button>
                      </div>

                      {fund.allocationType === 'fixed' ? (
                        <div className="fixed-allocation-section">
                          <div className="input-group">
                            <label htmlFor={`fixed-amount-${fund.fundId}`}>סכום חודשי:</label>
                            <input
                              id={`fixed-amount-${fund.fundId}`}
                              type="text"
                              inputMode="decimal"
                              value={fund.fixedAmount}
                              onChange={(e) => handleFixedAmountChange(fund.fundId, e.target.value)}
                              placeholder="0.00"
                              className="amount-input"
                            />
                            <span className="currency">₪</span>
                          </div>
                          <div className="calculation-info">
                            <span>סה"כ שנתי (12 חודשים): ₪{(parseFloat(fund.fixedAmount) * 12 || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="variable-allocation-section">
                          <div className="months-grid">
                            {fund.variableAllocations.map((alloc) => (
                              <div key={alloc.month} className="month-input-group">
                                <label htmlFor={`month-${fund.fundId}-${alloc.month}`}>
                                  {HEBREW_MONTHS[alloc.month - 1]}
                                </label>
                                <div className="input-wrapper">
                                  <input
                                    id={`month-${fund.fundId}-${alloc.month}`}
                                    type="text"
                                    inputMode="decimal"
                                    value={alloc.amount === 0 ? '' : alloc.amount}
                                    onChange={(e) => handleVariableAmountChange(fund.fundId, alloc.month, e.target.value)}
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>

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
            onClick={handleSaveAll}
            disabled={loading}
          >
            {loading ? 'שומר...' : 'שמור הכל'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetMonthlyAllocationManager;
