import { useEffect, useState, useMemo, useCallback } from 'react';
import { incomesAPI, incomeCategoriesAPI, expectedIncomesAPI, incomeComparisonAPI, usersAPI, budgetsAPI } from '../services/api';
import { Income, IncomeCategory, ExpectedIncome, MonthlyIncomeSummary } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Navigation from '../components/Navigation';
import Button from '../components/Button';
import MonthNavigator from '../components/MonthNavigator';
import IncomeTable from '../components/IncomeTable';
import IncomeFormModal from '../components/IncomeFormModal';
import CategoryManager from '../components/CategoryManager';
import ExpectedIncomeTable from '../components/ExpectedIncomeTable';
import ExpectedIncomeFormModal from '../components/ExpectedIncomeFormModal';
import ComparisonTable from '../components/ComparisonTable';

// Debounce hook for performance optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Incomes() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // State management - Task 8.1
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Actual incomes state
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [actualFilters, setActualFilters] = useState({
    startDate: '',
    endDate: '',
    source: '',
    categoryId: null as number | null,
    status: '' as '' | 'pending' | 'confirmed',
  });
  
  // Debounced filter values for performance
  const debouncedActualFilters = useDebounce(actualFilters, 500);

  // Expected incomes state
  const [expectedIncomes, setExpectedIncomes] = useState<ExpectedIncome[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [planningMonth, setPlanningMonth] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  // Comparison state
  const [comparisonMonth, setComparisonMonth] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [comparison, setComparison] = useState<MonthlyIncomeSummary | null>(null);
  const [comparisonFilters, setComparisonFilters] = useState({
    categoryId: null as number | null,
    source: '',
  });
  
  // Debounced comparison filters for performance
  const debouncedComparisonFilters = useDebounce(comparisonFilters, 500);

  // Categories and users state
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [circleBudgetId, setCircleBudgetId] = useState<number | null>(null);

  // Modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpectedIncomeModal, setShowExpectedIncomeModal] = useState(false);
  const [expectedIncomeMode, setExpectedIncomeMode] = useState<'annual' | 'monthly'>('monthly');
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editingExpectedIncome, setEditingExpectedIncome] = useState<ExpectedIncome | null>(null);

  // Data refresh functions
  const refreshIncomes = useCallback(async () => {
    try {
      const params: any = {};
      if (debouncedActualFilters.startDate) params.startDate = debouncedActualFilters.startDate;
      if (debouncedActualFilters.endDate) params.endDate = debouncedActualFilters.endDate;
      if (debouncedActualFilters.source) params.source = debouncedActualFilters.source;
      if (debouncedActualFilters.categoryId) params.categoryId = debouncedActualFilters.categoryId;
      if (debouncedActualFilters.status) params.status = debouncedActualFilters.status;

      const response = await incomesAPI.getAll(params);
      setIncomes(response.data);
    } catch (error: any) {
      console.error('Error refreshing incomes:', error);
    }
  }, [debouncedActualFilters]);

  const refreshExpectedIncomes = useCallback(async () => {
    try {
      const response = await expectedIncomesAPI.getAll({ year: selectedYear });
      setExpectedIncomes(response.data);
    } catch (error: any) {
      console.error('Error refreshing expected incomes:', error);
    }
  }, [selectedYear]);

  const refreshMonthlyExpectedIncomes = useCallback(async () => {
    try {
      const response = await expectedIncomesAPI.getAll({
        year: planningMonth.year,
        month: planningMonth.month,
      });
      setExpectedIncomes(response.data);
    } catch (error: any) {
      console.error('Error refreshing monthly expected incomes:', error);
    }
  }, [planningMonth.year, planningMonth.month]);

  const refreshComparison = useCallback(async () => {
    try {
      const response = await incomeComparisonAPI.getMonthlyComparison(
        comparisonMonth.year,
        comparisonMonth.month
      );
      setComparison(response.data);
    } catch (error: any) {
      console.error('Error refreshing comparison:', error);
    }
  }, [comparisonMonth.year, comparisonMonth.month]);

  const handleConfirmIncome = async (id: number) => {
    if (!window.confirm('האם אתה בטוח שברצונך לאשר הכנסה זו? הסכום יתווסף לתקציב המעגלי.')) {
      return;
    }

    try {
      await incomesAPI.confirm(id);
      showToast('הכנסה אושרה בהצלחה', 'success');
      await refreshIncomes();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה באישור הכנסה', 'error');
    }
  };

  // Helper functions
  const isCircleTreasurer = user?.isCircleTreasurer || false;

  const formatCurrency = useCallback((amount: number) => {
    return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, []);

  // Memoized filtered comparison data
  const filteredComparisons = useMemo(() => {
    if (!comparison || !comparison.by_source) return [];
    
    return comparison.by_source.filter(comp => {
      if (debouncedComparisonFilters.categoryId && comp.categories) {
        const hasCategory = comp.categories.some(cat => cat.id === debouncedComparisonFilters.categoryId);
        if (!hasCategory) return false;
      }
      if (debouncedComparisonFilters.source) {
        if (!comp.source_name.toLowerCase().includes(debouncedComparisonFilters.source.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [comparison, debouncedComparisonFilters]);

  // Memoized filtered expected incomes for annual view
  const annualExpectedIncomes = useMemo(() => {
    return expectedIncomes.filter(ei => ei.year === selectedYear && ei.parent_annual_id === null);
  }, [expectedIncomes, selectedYear]);

  // Memoized filtered expected incomes for monthly view
  const monthlyExpectedIncomes = useMemo(() => {
    return expectedIncomes.filter(ei => 
      ei.year === planningMonth.year && ei.month === planningMonth.month
    );
  }, [expectedIncomes, planningMonth.year, planningMonth.month]);

  // Load initial data - Task 8.1
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts
    
    const loadInitialData = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      
      try {
        // Load basic data first
        const [categoriesRes, usersRes, budgetsRes] = await Promise.all([
          incomeCategoriesAPI.getAll(),
          usersAPI.getBasic(),
          budgetsAPI.getAll(),
        ]);
        
        if (!isMounted) return;
        
        setCategories(categoriesRes.data);
        setUsers(usersRes.data);
        
        // Find circle budget
        const budgets = budgetsRes.data || [];
        const circleBudget =
          budgets.find((b: any) => b.type === 'circle') ||
          budgets.find((b: any) => b.group_id === null || b.group_id === undefined) ||
          budgets.find((b: any) => b.groupId === null || b.groupId === undefined);
        
        if (circleBudget?.id) {
          setCircleBudgetId(circleBudget.id);
        } else {
          console.error('Circle budget not found in budgets list', budgets);
          showToast('לא נמצא תקציב מעגל ראשי - לא ניתן להוסיף הכנסות', 'error');
        }
        
        // Load data that depends on current state
        const [incomesRes, expectedRes, comparisonRes] = await Promise.all([
          incomesAPI.getAll({}),
          expectedIncomesAPI.getAll({ year: new Date().getFullYear() }),
          incomeComparisonAPI.getMonthlyComparison(
            new Date().getFullYear(),
            new Date().getMonth() + 1
          ),
        ]);
        
        if (!isMounted) return;
        
        setIncomes(incomesRes.data);
        setExpectedIncomes(expectedRes.data);
        setComparison(comparisonRes.data);
        
      } catch (error: any) {
        if (!isMounted) return;
        const errorMessage = error.response?.data?.error || 'שגיאה בטעינת נתונים';
        setError(errorMessage);
        showToast(errorMessage, 'error');
        console.error('Error loading initial data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();
    
    return () => {
      isMounted = false; // Cleanup function
    };
  }, []); // Empty dependency array - only run once on mount

  // Separate effect for reloading data when filters change (with debouncing)
  useEffect(() => {
    if (loading) return; // Don't reload while initial loading
    refreshIncomes();
  }, [refreshIncomes, loading]);

  // Separate effect for year changes
  useEffect(() => {
    if (loading) return; // Don't reload while initial loading
    refreshExpectedIncomes();
  }, [refreshExpectedIncomes, loading]);

  // Separate effect for planning month changes
  useEffect(() => {
    if (loading) return; // Don't reload while initial loading
    refreshMonthlyExpectedIncomes();
  }, [refreshMonthlyExpectedIncomes, loading]);

  // Separate effect for comparison month changes
  useEffect(() => {
    if (loading) return; // Don't reload while initial loading
    refreshComparison();
  }, [refreshComparison, loading]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <div className="loading-spinner"></div>
        <p style={styles.loadingText}>טוען נתונים...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.content}>
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>⚠️</div>
            <h2 style={styles.errorTitle}>שגיאה בטעינת הנתונים</h2>
            <p style={styles.errorMessage}>{error}</p>
            <Button
              onClick={() => {
                setError(null);
                window.location.reload(); // Simple page reload instead of calling undefined function
              }}
              style={styles.retryButton}
            >
              נסה שוב
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Navigation />

      <div style={styles.content}>
        {/* Page Header - Task 8.1 */}
        <div style={styles.pageHeader}>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>הכנסות</h1>
            <div style={styles.headerButtons}>
              {isCircleTreasurer && (
                <Button
                  onClick={() => setShowCategoryModal(true)}
                  style={styles.secondaryButton}
                >
                  נהל קטגוריות
                </Button>
              )}
              <Button
                onClick={() => {
                  setEditingIncome(null);
                  setShowIncomeModal(true);
                }}
                style={styles.primaryButton}
              >
                הוסף הכנסה
              </Button>
            </div>
          </div>
        </div>

        {/* Status Summary Card - Only for Circle Treasurer */}
        {isCircleTreasurer && (
          <div style={styles.summaryCard}>
            <div style={styles.summaryRow}>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>הכנסות ממתינות</div>
                <div style={{ ...styles.summaryValue, color: '#f59e0b' }}>
                  {formatCurrency(incomes
                    .filter(i => i.status === 'pending')
                    .reduce((sum, i) => sum + Number(i.amount), 0))}
                </div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>הכנסות מאושרות</div>
                <div style={{ ...styles.summaryValue, color: '#10b981' }}>
                  {formatCurrency(incomes
                    .filter(i => i.status === 'confirmed')
                    .reduce((sum, i) => sum + Number(i.amount), 0))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task 8.2: Actual Incomes Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>הכנסות בפועל</h2>
          </div>

          {/* Filters */}
          <div style={styles.filtersContainer}>
            <div style={styles.filterRow}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>מתאריך:</label>
                <input
                  type="date"
                  value={actualFilters.startDate}
                  onChange={(e) => setActualFilters({ ...actualFilters, startDate: e.target.value })}
                  style={styles.filterInput}
                />
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>עד תאריך:</label>
                <input
                  type="date"
                  value={actualFilters.endDate}
                  onChange={(e) => setActualFilters({ ...actualFilters, endDate: e.target.value })}
                  style={styles.filterInput}
                />
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>מקור:</label>
                <input
                  type="text"
                  value={actualFilters.source}
                  onChange={(e) => setActualFilters({ ...actualFilters, source: e.target.value })}
                  placeholder="חפש לפי מקור..."
                  style={styles.filterInput}
                />
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>קטגוריה:</label>
                <select
                  value={actualFilters.categoryId || ''}
                  onChange={(e) => setActualFilters({
                    ...actualFilters,
                    categoryId: e.target.value ? parseInt(e.target.value) : null
                  })}
                  style={styles.filterSelect}
                >
                  <option value="">כל הקטגוריות</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>סטטוס:</label>
                <select
                  value={actualFilters.status}
                  onChange={(e) => setActualFilters({
                    ...actualFilters,
                    status: e.target.value as '' | 'pending' | 'confirmed'
                  })}
                  style={styles.filterSelect}
                >
                  <option value="">הכל</option>
                  <option value="pending">ממתין לאישור</option>
                  <option value="confirmed">אושר</option>
                </select>
              </div>

              <Button
                onClick={() => {
                  // Trigger filter reload by calling refresh function
                  refreshIncomes();
                }}
                style={styles.filterButton}
              >
                סנן
              </Button>

              <Button
                onClick={() => {
                  setActualFilters({
                    startDate: '',
                    endDate: '',
                    source: '',
                    categoryId: null,
                    status: '',
                  });
                }}
                style={styles.clearButton}
              >
                נקה
              </Button>
            </div>
          </div>

          {/* Incomes Table */}
          {incomes.length === 0 ? (
            <div style={styles.emptyMessage}>אין הכנסות להצגה</div>
          ) : (
            <IncomeTable
              incomes={incomes}
              onEdit={(id) => {
                const income = incomes.find(i => i.id === id);
                if (income) {
                  // Allow users to edit their own incomes or treasurers to edit any income
                  if (income.user_id === user?.id || isCircleTreasurer) {
                    setEditingIncome(income);
                    setShowIncomeModal(true);
                  } else {
                    showToast('אין לך הרשאה לערוך הכנסה זו', 'error');
                  }
                }
              }}
              onDelete={async (id) => {
                const income = incomes.find(i => i.id === id);
                if (!income) return;

                // Allow users to delete their own incomes or treasurers to delete any income
                if (income.user_id !== user?.id && !isCircleTreasurer) {
                  showToast('אין לך הרשאה למחוק הכנסה זו', 'error');
                  return;
                }

                if (window.confirm('האם אתה בטוח שברצונך למחוק הכנסה זו?')) {
                  try {
                    await incomesAPI.delete(id);
                    showToast('הכנסה נמחקה בהצלחה', 'success');
                    // Refresh incomes data
                    await refreshIncomes();
                  } catch (error: any) {
                    showToast(error.response?.data?.error || 'שגיאה במחיקת הכנסה', 'error');
                  }
                }
              }}
              onConfirm={handleConfirmIncome}
              canEdit={true}
              canConfirm={isCircleTreasurer}
            />
          )}
        </div>

        {/* Task 8.3: Annual Planning Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>תכנון הכנסות שנתי</h2>
            {isCircleTreasurer && (
              <Button
                onClick={() => {
                  setExpectedIncomeMode('annual');
                  setEditingExpectedIncome(null);
                  setShowExpectedIncomeModal(true);
                }}
                style={styles.primaryButton}
              >
                הוסף הכנסה צפויה שנתית
              </Button>
            )}
          </div>

          {/* Year selector */}
          <div style={styles.yearSelectorContainer}>
            <label style={styles.filterLabel}>שנה:</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value));
              }}
              style={styles.yearSelect}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Expected Incomes Table for selected year */}
          {annualExpectedIncomes.length === 0 ? (
            <div style={styles.emptyMessage}>אין הכנסות צפויות שנתיות לשנה זו</div>
          ) : (
            <ExpectedIncomeTable
              expectedIncomes={annualExpectedIncomes}
              onEdit={(id) => {
                const expectedIncome = expectedIncomes.find(ei => ei.id === id);
                if (expectedIncome) {
                  setEditingExpectedIncome(expectedIncome);
                  setExpectedIncomeMode('annual');
                  setShowExpectedIncomeModal(true);
                }
              }}
              onDelete={async (id) => {
                if (window.confirm('האם אתה בטוח שברצונך למחוק הכנסה צפויה זו? פעולה זו תמחק גם את כל ההכנסות החודשיות הקשורות.')) {
                  try {
                    await expectedIncomesAPI.delete(id);
                    showToast('הכנסה צפויה נמחקה בהצלחה', 'success');
                    // Refresh expected incomes data
                    await refreshExpectedIncomes();
                  } catch (error: any) {
                    showToast(error.response?.data?.error || 'שגיאה במחיקת הכנסה צפויה', 'error');
                  }
                }
              }}
              canEdit={isCircleTreasurer}
            />
          )}
        </div>

        {/* Task 8.4: Monthly Planning Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>תכנון הכנסות חודשי</h2>
            <Button
              onClick={() => {
                setExpectedIncomeMode('monthly');
                setEditingExpectedIncome(null);
                setShowExpectedIncomeModal(true);
              }}
              style={styles.primaryButton}
            >
              הוסף הכנסה צפויה לחודש זה
            </Button>
          </div>

          {/* Month Navigator */}
          <div style={styles.monthNavigatorContainer}>
            <MonthNavigator
              year={planningMonth.year}
              month={planningMonth.month}
              onChange={(year: number, month: number) => {
                setPlanningMonth({ year, month });
              }}
            />
          </div>

          {/* Monthly Expected Incomes Table */}
          {monthlyExpectedIncomes.length === 0 ? (
            <div style={styles.emptyMessage}>אין הכנסות צפויות לחודש זה</div>
          ) : (
            <ExpectedIncomeTable
              expectedIncomes={monthlyExpectedIncomes}
              onEdit={(id) => {
                const expectedIncome = expectedIncomes.find(ei => ei.id === id);
                if (expectedIncome) {
                  // Allow users to edit their own expected incomes or treasurers to edit any
                  if (expectedIncome.user_id === user?.id || isCircleTreasurer) {
                    setEditingExpectedIncome(expectedIncome);
                    setExpectedIncomeMode(expectedIncome.is_manual ? 'monthly' : 'annual');
                    setShowExpectedIncomeModal(true);
                  } else {
                    showToast('אין לך הרשאה לערוך הכנסה צפויה זו', 'error');
                  }
                }
              }}
              onDelete={async (id) => {
                const expectedIncome = expectedIncomes.find(ei => ei.id === id);
                if (!expectedIncome) return;
                
                // Allow users to delete their own expected incomes or treasurers to delete any
                if (expectedIncome.user_id !== user?.id && !isCircleTreasurer) {
                  showToast('אין לך הרשאה למחוק הכנסה צפויה זו', 'error');
                  return;
                }
                
                const isManual = expectedIncome?.is_manual;
                const confirmMessage = isManual
                  ? 'האם אתה בטוח שברצונך למחוק הכנסה צפויה זו?'
                  : 'הכנסה זו נוצרה מתכנון שנתי. המחיקה תשפיע רק על החודש הנוכחי. האם להמשיך?';
                
                if (window.confirm(confirmMessage)) {
                  try {
                    await expectedIncomesAPI.delete(id);
                    showToast('הכנסה צפויה נמחקה בהצלחה', 'success');
                    // Refresh monthly expected incomes data
                    await refreshMonthlyExpectedIncomes();
                  } catch (error: any) {
                    showToast(error.response?.data?.error || 'שגיאה במחיקת הכנסה צפויה', 'error');
                  }
                }
              }}
              canEdit={true}
            />
          )}
        </div>

        {/* Task 8.5: Comparison Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>השוואה - צפוי מול בפועל</h2>
          </div>

          {/* Month Navigator */}
          <div style={styles.monthNavigatorContainer}>
            <MonthNavigator
              year={comparisonMonth.year}
              month={comparisonMonth.month}
              onChange={(year: number, month: number) => {
                setComparisonMonth({ year, month });
              }}
            />
          </div>

          {/* Summary Card */}
          {comparison && (
            <div style={styles.summaryCard}>
              <div style={styles.summaryRow}>
                <div style={styles.summaryItem}>
                  <div style={styles.summaryLabel}>סך הכנסות צפויות</div>
                  <div style={styles.summaryValue}>{formatCurrency(comparison.total_expected)}</div>
                </div>
                <div style={styles.summaryItem}>
                  <div style={styles.summaryLabel}>סך הכנסות בפועל</div>
                  <div style={styles.summaryValue}>{formatCurrency(comparison.total_actual)}</div>
                </div>
                <div style={styles.summaryItem}>
                  <div style={styles.summaryLabel}>פער</div>
                  <div style={{
                    ...styles.summaryValue,
                    color: comparison.difference >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {formatCurrency(comparison.difference)}
                  </div>
                </div>
                <div style={styles.summaryItem}>
                  <div style={styles.summaryLabel}>אחוז התממשות</div>
                  <div style={{
                    ...styles.summaryValue,
                    color: comparison.fulfillment_percentage >= 100 ? '#10b981' : 
                           comparison.fulfillment_percentage >= 50 ? '#f59e0b' : '#ef4444'
                  }}>
                    {comparison.fulfillment_percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={styles.filtersContainer}>
            <div style={styles.filterRow}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>קטגוריה:</label>
                <select
                  value={comparisonFilters.categoryId || ''}
                  onChange={(e) => setComparisonFilters({ 
                    ...comparisonFilters, 
                    categoryId: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  style={styles.filterSelect}
                >
                  <option value="">כל הקטגוריות</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>מקור:</label>
                <input
                  type="text"
                  value={comparisonFilters.source}
                  onChange={(e) => setComparisonFilters({ ...comparisonFilters, source: e.target.value })}
                  placeholder="חפש לפי מקור..."
                  style={styles.filterInput}
                />
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          {filteredComparisons.length > 0 ? (
            <ComparisonTable
              comparisons={filteredComparisons}
            />
          ) : (
            <div style={styles.emptyMessage}>אין נתוני השוואה לחודש זה</div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCategoryModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCategoryModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>ניהול קטגוריות הכנסות</h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                style={styles.modalCloseBtn}
                title="סגור"
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <CategoryManager
                categories={categories}
                onCreateCategory={async (data) => {
                  try {
                    await incomeCategoriesAPI.create(data);
                    showToast('קטגוריה נוצרה בהצלחה', 'success');
                    // Reload categories
                    const response = await incomeCategoriesAPI.getAll();
                    setCategories(response.data);
                  } catch (error: any) {
                    showToast(error.response?.data?.error || 'שגיאה ביצירת קטגוריה', 'error');
                    throw error;
                  }
                }}
                onUpdateCategory={async (id, data) => {
                  try {
                    await incomeCategoriesAPI.update(id, data);
                    showToast('קטגוריה עודכנה בהצלחה', 'success');
                    // Reload categories
                    const response = await incomeCategoriesAPI.getAll();
                    setCategories(response.data);
                  } catch (error: any) {
                    showToast(error.response?.data?.error || 'שגיאה בעדכון קטגוריה', 'error');
                    throw error;
                  }
                }}
                onDeleteCategory={async (id) => {
                  try {
                    await incomeCategoriesAPI.delete(id);
                    showToast('קטגוריה נמחקה בהצלחה', 'success');
                    // Reload categories
                    const response = await incomeCategoriesAPI.getAll();
                    setCategories(response.data);
                  } catch (error: any) {
                    showToast(error.response?.data?.error || 'שגיאה במחיקת קטגוריה', 'error');
                    throw error;
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showIncomeModal && circleBudgetId && (
        <IncomeFormModal
          isOpen={showIncomeModal}
          onClose={() => {
            setShowIncomeModal(false);
            setEditingIncome(null);
          }}
          onSubmit={async (data) => {
            try {
              const apiData = {
                amount: data.amount,
                source: data.source,
                description: data.description,
                incomeDate: data.income_date,
                categoryIds: data.categoryIds,
                status: data.status,
              };

              if (editingIncome) {
                await incomesAPI.update(editingIncome.id, {
                  amount: data.amount,
                  source: data.source,
                  description: data.description,
                  incomeDate: data.income_date,
                  status: data.status,
                });
                if (data.categoryIds.length > 0) {
                  await incomesAPI.assignCategories(editingIncome.id, data.categoryIds);
                }
                showToast('הכנסה עודכנה בהצלחה', 'success');
              } else {
                await incomesAPI.create(apiData);
                showToast('הכנסה נוצרה בהצלחה', 'success');
              }

              // Refresh incomes data
              await refreshIncomes();

              // Close modal and reset state
              setShowIncomeModal(false);
              setEditingIncome(null);
            } catch (error: any) {
              showToast(error.response?.data?.error || 'שגיאה בשמירת הכנסה', 'error');
              throw error;
            }
          }}
          income={editingIncome}
          categories={categories}
          users={users}
        />
      )}

      {showExpectedIncomeModal && circleBudgetId && (
        <ExpectedIncomeFormModal
          isOpen={showExpectedIncomeModal}
          onClose={() => {
            setShowExpectedIncomeModal(false);
            setEditingExpectedIncome(null);
          }}
          onSubmit={async (data) => {
            try {
              if (editingExpectedIncome) {
                await expectedIncomesAPI.update(editingExpectedIncome.id, {
                  amount: data.amount,
                  description: data.description,
                  sourceName: data.source_name,
                });
                showToast('הכנסה צפויה עודכנה בהצלחה', 'success');
              } else {
                const apiData = {
                  budgetId: circleBudgetId,
                  userId: data.user_id,
                  sourceName: data.source_name,
                  amount: data.amount,
                  description: data.description,
                  year: data.year,
                  categoryIds: data.categoryIds,
                };
                
                if (expectedIncomeMode === 'annual') {
                  await expectedIncomesAPI.createAnnual({
                    ...apiData,
                    frequency: data.frequency!,
                    month: data.month,
                  });
                } else {
                  await expectedIncomesAPI.createMonthly({
                    ...apiData,
                    month: data.month!,
                  });
                }
                showToast('הכנסה צפויה נוצרה בהצלחה', 'success');
              }
              
              // Refresh expected incomes data
              if (expectedIncomeMode === 'annual') {
                await refreshExpectedIncomes();
              } else {
                await refreshMonthlyExpectedIncomes();
              }
              
              // Close modal and reset state
              setShowExpectedIncomeModal(false);
              setEditingExpectedIncome(null);
            } catch (error: any) {
              showToast(error.response?.data?.error || 'שגיאה בשמירת הכנסה צפויה', 'error');
              throw error;
            }
          }}
          mode={expectedIncomeMode}
          expectedIncome={editingExpectedIncome}
          categories={categories}
          users={users}
          defaultYear={expectedIncomeMode === 'annual' ? selectedYear : planningMonth.year}
          defaultMonth={expectedIncomeMode === 'monthly' ? planningMonth.month : undefined}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '20px',
  },
  loadingText: {
    fontSize: '18px',
    color: '#4a5568',
    fontWeight: '500',
  },
  container: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  content: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  pageHeader: {
    marginBottom: '32px',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: 0,
    color: '#2d3748',
  },
  headerButtons: {
    display: 'flex',
    gap: '12px',
  },
  primaryButton: {
    fontSize: '16px',
    fontWeight: '600',
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    fontSize: '16px',
    fontWeight: '600',
    padding: '12px 24px',
    background: 'white',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  placeholder: {
    background: 'white',
    padding: '60px 40px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    color: '#718096',
    fontSize: '16px',
  },
  section: {
    marginBottom: '48px',
  },
  sectionHeader: {
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  filtersContainer: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  filterRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '180px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
  },
  filterInput: {
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  filterSelect: {
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: 'white',
  },
  filterButton: {
    padding: '10px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  clearButton: {
    padding: '10px 24px',
    background: 'white',
    color: '#718096',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  emptyMessage: {
    background: 'white',
    padding: '40px',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#718096',
    fontSize: '16px',
    border: '1px solid #e2e8f0',
  },
  yearSelectorContainer: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  yearSelect: {
    padding: '10px 16px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    outline: 'none',
    background: 'white',
    minWidth: '120px',
  },
  monthNavigatorContainer: {
    background: 'white',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  summaryCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#718096',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2d3748',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '20px',
    background: 'white',
    borderRadius: '12px',
    padding: '60px 40px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  errorIcon: {
    fontSize: '64px',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  errorMessage: {
    fontSize: '16px',
    color: '#718096',
    textAlign: 'center',
    maxWidth: '500px',
    margin: 0,
  },
  retryButton: {
    marginTop: '20px',
    padding: '12px 32px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e2e8f0',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#718096',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'all 0.2s',
    lineHeight: 1,
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
};
