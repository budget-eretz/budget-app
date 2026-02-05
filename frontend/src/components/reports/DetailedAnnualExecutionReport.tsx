import React, { useEffect, useState } from 'react';
import { reportsAPI } from '../../services/api';
import { DetailedAnnualExecutionData } from '../../types';
import { LineChart, BarChart } from '../charts';
import type { LineChartData, BarChartData } from '../charts';

interface DetailedAnnualExecutionReportProps {
  year: number;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onError?: (error: string) => void;
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const DetailedAnnualExecutionReport: React.FC<DetailedAnnualExecutionReportProps> = ({
  year,
  isLoading,
  setIsLoading,
  onError
}) => {
  const [reportData, setReportData] = useState<DetailedAnnualExecutionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportData();
  }, [year]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await reportsAPI.getDetailedAnnualExecutionReport(year);
      setReportData(response.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'שגיאה בטעינת הדוח';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await reportsAPI.exportDetailedAnnualExecutionReportExcel(year);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `detailed-annual-execution-${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'שגיאה בייצוא הדוח';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate yearly totals
  const calculateYearlyTotals = () => {
    if (!reportData) return { income: 0, expenses: 0, balance: 0 };

    const totalIncome = reportData.incomeExecution.totals.annual;
    const totalExpenses = reportData.expenseExecution.totals.annual;
    const balance = totalIncome - totalExpenses;

    return { income: totalIncome, expenses: totalExpenses, balance };
  };

  // Prepare trend chart data
  const prepareTrendChartData = (): LineChartData => {
    if (!reportData) {
      return { labels: [], datasets: [] };
    }

    const labels = HEBREW_MONTHS;
    const incomeData = reportData.incomeExecution.totals.monthly;
    const expenseData = reportData.expenseExecution.totals.monthly;
    const balanceData = reportData.monthlyBalance;

    return {
      labels,
      datasets: [
        {
          label: 'הכנסות',
          data: incomeData,
          borderColor: '#48bb78',
          backgroundColor: '#48bb7820',
          fill: false,
          tension: 0.4,
          borderWidth: 3,
        },
        {
          label: 'הוצאות',
          data: expenseData,
          borderColor: '#F56565',
          backgroundColor: '#F5656520',
          fill: false,
          tension: 0.4,
          borderWidth: 3,
        },
        {
          label: 'יתרה',
          data: balanceData,
          borderColor: '#4299e1',
          backgroundColor: '#4299e120',
          fill: false,
          tension: 0.4,
          borderWidth: 3,
        },
      ],
    };
  };

  // Prepare monthly comparison data
  const prepareMonthlyComparisonData = (): BarChartData => {
    if (!reportData) {
      return { labels: [], datasets: [] };
    }

    const labels = HEBREW_MONTHS;
    const incomeData = reportData.incomeExecution.totals.monthly;
    const expenseData = reportData.expenseExecution.totals.monthly;

    return {
      labels,
      datasets: [
        {
          label: 'הכנסות',
          data: incomeData,
          backgroundColor: '#48bb7880',
          borderColor: '#48bb78',
          borderWidth: 2,
        },
        {
          label: 'הוצאות',
          data: expenseData,
          backgroundColor: '#F5656580',
          borderColor: '#F56565',
          borderWidth: 2,
        },
      ],
    };
  };

  const yearlyTotals = calculateYearlyTotals();
  const trendChartData = prepareTrendChartData();
  const comparisonChartData = prepareMonthlyComparisonData();

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loader}>טוען דוח...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorMessage}>
          <strong>שגיאה:</strong> {error}
        </div>
        <button onClick={fetchReportData} style={styles.retryButton}>
          נסה שוב
        </button>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>דוח ביצוע שנתי מפורט</h2>
          <p style={styles.subtitle}>שנת {year}</p>
        </div>
        <button onClick={handleExport} style={styles.exportButton}>
          ייצא לאקסל
        </button>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryCards}>
        <div style={styles.summaryCard}>
          <h3 style={styles.summaryTitle}>סך הכנסות שנתי</h3>
          <p style={styles.summaryAmount}>{formatCurrency(yearlyTotals.income)}</p>
        </div>
        <div style={styles.summaryCard}>
          <h3 style={styles.summaryTitle}>סך הוצאות שנתי</h3>
          <p style={styles.summaryAmount}>{formatCurrency(yearlyTotals.expenses)}</p>
        </div>
        <div style={{
          ...styles.summaryCard,
          ...(yearlyTotals.balance >= 0 ? styles.positiveBalance : styles.negativeBalance)
        }}>
          <h3 style={styles.summaryTitle}>יתרה שנתית</h3>
          <p style={styles.summaryAmount}>{formatCurrency(yearlyTotals.balance)}</p>
        </div>
      </div>

      {/* Section 1: Income Table */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>הכנסות</h3>
        <p style={styles.sectionDescription}>
          פירוט הכנסות שנתיות לפי קטגוריה עם השוואה לצפי התקציבי
        </p>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.stickyColumn}>קטגוריה</th>
                {HEBREW_MONTHS.map((month) => (
                  <th key={month} style={styles.monthColumn}>{month}</th>
                ))}
                <th style={styles.totalColumn}>סה"כ שנתי</th>
                <th style={styles.totalColumn}>כמה חסר</th>
                <th style={styles.totalColumn}>צפי שנתי</th>
              </tr>
            </thead>
            <tbody>
              {reportData.incomeExecution.byCategory.map((category) => (
                <tr key={category.categoryId} style={styles.dataRow}>
                  <td style={styles.stickyColumn}>
                    <div style={styles.categoryName}>
                      {category.categoryColor && (
                        <span
                          style={{
                            ...styles.colorIndicator,
                            backgroundColor: category.categoryColor
                          }}
                        />
                      )}
                      {category.categoryName}
                    </div>
                  </td>
                  {category.monthlyActual.map((amount, index) => (
                    <td key={index} style={styles.numberCell}>
                      {amount > 0 ? formatCurrency(amount) : '-'}
                    </td>
                  ))}
                  <td style={{ ...styles.numberCell, ...styles.totalCell }}>
                    {formatCurrency(category.annualActual)}
                  </td>
                  <td
                    style={{
                      ...styles.numberCell,
                      ...styles.totalCell,
                      color: category.missingAmount > 0 ? '#d32f2f' : '#388e3c'
                    }}
                  >
                    {formatCurrency(category.missingAmount)}
                  </td>
                  <td style={{ ...styles.numberCell, ...styles.totalCell }}>
                    {formatCurrency(category.annualExpected)}
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr style={styles.totalRow}>
                <td style={styles.stickyColumn}>סה"כ הכנסות</td>
                {reportData.incomeExecution.totals.monthly.map((amount, index) => (
                  <td key={index} style={styles.numberCell}>
                    {formatCurrency(amount)}
                  </td>
                ))}
                <td style={{ ...styles.numberCell, ...styles.totalCell }}>
                  {formatCurrency(reportData.incomeExecution.totals.annual)}
                </td>
                <td style={{
                  ...styles.numberCell,
                  ...styles.totalCell,
                  color: reportData.incomeExecution.byCategory.reduce((sum, cat) => sum + cat.missingAmount, 0) > 0 ? '#d32f2f' : '#388e3c'
                }}>
                  {formatCurrency(reportData.incomeExecution.byCategory.reduce((sum, cat) => sum + cat.missingAmount, 0))}
                </td>
                <td style={{ ...styles.numberCell, ...styles.totalCell }}>
                  {formatCurrency(reportData.incomeExecution.byCategory.reduce((sum, cat) => sum + cat.annualExpected, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Separator */}
      <div style={styles.separator} />

      {/* Section 2: Expense Table */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>תקציב</h3>
        <p style={styles.sectionDescription}>
          פירוט הוצאות שנתיות לפי תקציבים וסעיפים עם מעקב אחר הקצאות ויתרות
        </p>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.stickyColumn}>תקציב</th>
                <th style={styles.fundColumn}>סעיף</th>
                {HEBREW_MONTHS.map((month) => (
                  <th key={month} style={styles.monthColumn}>{month}</th>
                ))}
                <th style={styles.totalColumn}>סה"כ שנתי</th>
                <th style={styles.totalColumn}>כמה נשאר</th>
                <th style={styles.totalColumn}>הקצאה שנתית</th>
              </tr>
            </thead>
            <tbody>
              {reportData.expenseExecution.byBudget.map((budget) => (
                <React.Fragment key={budget.budgetId}>
                  {budget.funds.map((fund, fundIndex) => (
                    <tr key={fund.fundId} style={styles.dataRow}>
                      {fundIndex === 0 ? (
                        <td
                          style={{ ...styles.stickyColumn, ...styles.budgetName }}
                          rowSpan={budget.funds.length}
                        >
                          <div>
                            <strong>{budget.budgetName}</strong>
                            {budget.groupName && (
                              <div style={styles.groupName}>({budget.groupName})</div>
                            )}
                          </div>
                        </td>
                      ) : null}
                      <td style={styles.stickyFundColumn}>{fund.fundName}</td>
                      {fund.monthlySpent.map((amount, index) => (
                        <td key={index} style={styles.numberCell}>
                          {amount > 0 ? formatCurrency(amount) : '-'}
                        </td>
                      ))}
                      <td style={{ ...styles.numberCell, ...styles.totalCell }}>
                        {formatCurrency(fund.annualSpent)}
                      </td>
                      <td
                        style={{
                          ...styles.numberCell,
                          ...styles.totalCell,
                          color: fund.remainingAmount < 0 ? '#d32f2f' : '#388e3c'
                        }}
                      >
                        {formatCurrency(fund.remainingAmount)}
                      </td>
                      <td style={{ ...styles.numberCell, ...styles.totalCell }}>
                        {formatCurrency(fund.allocatedAmount)}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {/* Total Row */}
              <tr style={styles.totalRow}>
                <td style={styles.stickyColumn}>סה"כ הוצאות</td>
                <td style={styles.stickyFundColumn}>-</td>
                {reportData.expenseExecution.totals.monthly.map((amount, index) => (
                  <td key={index} style={styles.numberCell}>
                    {formatCurrency(amount)}
                  </td>
                ))}
                <td style={{ ...styles.numberCell, ...styles.totalCell }}>
                  {formatCurrency(reportData.expenseExecution.totals.annual)}
                </td>
                <td style={{
                  ...styles.numberCell,
                  ...styles.totalCell,
                  color: reportData.expenseExecution.byBudget.reduce((sum, budget) =>
                    sum + budget.funds.reduce((fSum, fund) => fSum + fund.remainingAmount, 0), 0) < 0 ? '#d32f2f' : '#388e3c'
                }}>
                  {formatCurrency(reportData.expenseExecution.byBudget.reduce((sum, budget) =>
                    sum + budget.funds.reduce((fSum, fund) => fSum + fund.remainingAmount, 0), 0))}
                </td>
                <td style={{ ...styles.numberCell, ...styles.totalCell }}>
                  {formatCurrency(reportData.expenseExecution.byBudget.reduce((sum, budget) =>
                    sum + budget.funds.reduce((fSum, fund) => fSum + fund.allocatedAmount, 0), 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Separator */}
      <div style={styles.separator} />

      {/* Section 3: Monthly Balance */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>מאזן חודשי (הכנסות - הוצאות)</h3>
        <p style={styles.sectionDescription}>
          יתרה חודשית המתקבלת מהפרש בין הכנסות להוצאות בכל חודש
        </p>
        <div style={styles.balanceContainer}>
          <table style={styles.balanceTable}>
            <thead>
              <tr style={styles.headerRow}>
                {HEBREW_MONTHS.map((month) => (
                  <th key={month} style={styles.balanceHeader}>{month}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={styles.balanceRow}>
                {reportData.monthlyBalance.map((balance, index) => (
                  <td
                    key={index}
                    style={{
                      ...styles.balanceCell,
                      backgroundColor: balance >= 0 ? '#e8f5e9' : '#ffebee',
                      color: balance >= 0 ? '#2e7d32' : '#c62828'
                    }}
                  >
                    {formatCurrency(balance)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Charts */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>מגמות ותרשימים</h3>
        <p style={styles.sectionDescription}>
          ייצוג גרפי של הכנסות והוצאות לאורך השנה
        </p>
        <div style={styles.chartsRow}>
          <div style={styles.chartContainer}>
            <LineChart
              data={trendChartData}
              height={350}
              title="מגמות חודשיות - הכנסות, הוצאות ויתרה"
              showLegend={true}
              showGrid={true}
              smooth={true}
            />
          </div>
          <div style={styles.chartContainer}>
            <BarChart
              data={comparisonChartData}
              height={350}
              title="השוואה חודשית - הכנסות מול הוצאות"
              showLegend={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    direction: 'rtl',
    fontFamily: 'Assistant, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: '0 0 4px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#718096',
    margin: 0
  },
  exportButton: {
    padding: '10px 20px',
    backgroundColor: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px'
  },
  summaryCard: {
    padding: '20px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    textAlign: 'center',
    border: '2px solid #e2e8f0'
  },
  positiveBalance: {
    backgroundColor: '#f0fff4',
    borderColor: '#48bb78'
  },
  negativeBalance: {
    backgroundColor: '#fed7d7',
    borderColor: '#f56565'
  },
  summaryTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    margin: '0 0 8px 0'
  },
  summaryAmount: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0
  },
  section: {
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: '0 0 8px 0'
  },
  sectionDescription: {
    fontSize: '13px',
    color: '#718096',
    margin: '0 0 16px 0',
    fontStyle: 'italic'
  },
  tableContainer: {
    overflowX: 'auto',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    fontSize: '13px'
  },
  headerRow: {
    backgroundColor: '#edf2f7',
    borderBottom: '2px solid #cbd5e0'
  },
  stickyColumn: {
    padding: '12px',
    textAlign: 'right',
    borderBottom: '1px solid #e2e8f0',
    fontWeight: 'bold',
    minWidth: '150px',
    maxWidth: '200px',
    position: 'sticky',
    right: 0,
    backgroundColor: '#fff',
    zIndex: 2,
    boxShadow: '-2px 0 4px rgba(0,0,0,0.05)'
  },
  stickyFundColumn: {
    padding: '10px 12px',
    textAlign: 'right',
    fontSize: '13px',
    paddingRight: '20px',
    borderBottom: '1px solid #e2e8f0',
    minWidth: '120px',
    position: 'sticky',
    right: '150px',
    backgroundColor: '#fff',
    zIndex: 1,
    boxShadow: '-2px 0 4px rgba(0,0,0,0.05)'
  },
  fundColumn: {
    padding: '12px',
    textAlign: 'right',
    fontWeight: 'bold',
    minWidth: '120px'
  },
  monthColumn: {
    padding: '12px',
    textAlign: 'center',
    fontWeight: 'bold',
    minWidth: '80px'
  },
  totalColumn: {
    padding: '12px',
    textAlign: 'center',
    fontWeight: 'bold',
    minWidth: '100px'
  },
  dataRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s'
  },
  numberCell: {
    padding: '10px',
    textAlign: 'center',
    fontSize: '13px',
    borderBottom: '1px solid #e2e8f0'
  },
  totalCell: {
    fontWeight: 'bold',
    backgroundColor: '#f7fafc'
  },
  totalRow: {
    backgroundColor: '#e6fffa',
    fontWeight: 'bold',
    borderTop: '2px solid #38b2ac'
  },
  categoryName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  colorIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0
  },
  budgetName: {
    verticalAlign: 'top',
    backgroundColor: '#f7fafc',
    borderBottom: '1px solid #e2e8f0'
  },
  groupName: {
    fontSize: '11px',
    color: '#718096',
    fontWeight: 'normal',
    marginTop: '2px'
  },
  fundCell: {
    padding: '10px 12px',
    textAlign: 'right',
    fontSize: '13px',
    paddingRight: '20px',
    borderBottom: '1px solid #e2e8f0'
  },
  separator: {
    height: '2px',
    backgroundColor: '#e2e8f0',
    margin: '30px 0',
    borderRadius: '1px'
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  balanceContainer: {
    overflowX: 'auto'
  },
  balanceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  balanceHeader: {
    padding: '12px',
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd'
  },
  balanceRow: {
    borderBottom: '1px solid #e0e0e0'
  },
  balanceCell: {
    padding: '15px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px'
  },
  loader: {
    fontSize: '18px',
    color: '#666'
  },
  errorContainer: {
    padding: '20px',
    textAlign: 'center'
  },
  errorMessage: {
    padding: '15px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
    marginBottom: '15px'
  },
  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default DetailedAnnualExecutionReport;
