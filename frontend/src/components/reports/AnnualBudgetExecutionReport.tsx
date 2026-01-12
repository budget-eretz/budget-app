import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';
import { AnnualBudgetExecutionData } from '../../types';
import { LineChart, BarChart, SummaryTable } from '../charts';
import type { LineChartData, BarChartData, TableColumn } from '../charts';
import { generateColorPalette, getBudgetComparisonColors } from '../../utils/chartColors';
import ReportErrorDisplay from '../ReportErrorDisplay';
import { parseError, ReportError } from '../../utils/errorHandling';

interface AnnualBudgetExecutionReportProps {
  year: number;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onError?: (error: string) => void;
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function AnnualBudgetExecutionReport({ year, isLoading, setIsLoading, onError }: AnnualBudgetExecutionReportProps) {
  const [reportData, setReportData] = useState<AnnualBudgetExecutionData | null>(null);
  const [error, setError] = useState<ReportError | null>(null);

  useEffect(() => {
    loadReportData();
  }, [year]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await reportsAPI.getAnnualBudgetExecutionReport(year);
      setReportData(response.data);
    } catch (error: any) {
      console.error('Failed to load annual budget execution report:', error);
      const parsedError = parseError(error);
      setError(parsedError);
      if (onError) {
        onError(parsedError.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await reportsAPI.exportAnnualBudgetExecutionReport(year);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `annual-budget-execution-${year}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Failed to export report:', error);
      const parsedError = parseError(error);
      alert(parsedError.message);
      if (onError) {
        onError(parsedError.message);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare chart data
  const prepareTrendChartData = (): LineChartData => {
    if (!reportData || reportData.monthlyBalance.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = reportData.monthlyBalance.map(data => HEBREW_MONTHS[data.month - 1]);
    const incomeData = reportData.monthlyBalance.map(data => data.income);
    const expenseData = reportData.monthlyBalance.map(data => data.expenses);
    const balanceData = reportData.monthlyBalance.map(data => data.balance);
    
    const comparisonColors = getBudgetComparisonColors();

    return {
      labels,
      datasets: [
        {
          label: 'הכנסות',
          data: incomeData,
          borderColor: comparisonColors.actual,
          backgroundColor: comparisonColors.actual + '20',
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
          borderColor: comparisonColors.planned,
          backgroundColor: comparisonColors.planned + '20',
          fill: false,
          tension: 0.4,
          borderWidth: 3,
        },
      ],
    };
  };

  const prepareMonthlyComparisonData = (): BarChartData => {
    if (!reportData || reportData.monthlyBalance.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = reportData.monthlyBalance.map(data => HEBREW_MONTHS[data.month - 1]);
    const incomeData = reportData.monthlyBalance.map(data => data.income);
    const expenseData = reportData.monthlyBalance.map(data => data.expenses);
    
    const comparisonColors = getBudgetComparisonColors();

    return {
      labels,
      datasets: [
        {
          label: 'הכנסות',
          data: incomeData,
          backgroundColor: comparisonColors.actual + '80',
          borderColor: comparisonColors.actual,
          borderWidth: 2,
        },
        {
          label: 'הוצאות',
          data: expenseData,
          backgroundColor: '#F56565' + '80',
          borderColor: '#F56565',
          borderWidth: 2,
        },
      ],
    };
  };

  // Prepare table data
  const monthlyTrendsColumns: TableColumn[] = [
    { key: 'monthName', title: 'חודש', width: '25%', sortable: true },
    { key: 'income', title: 'הכנסות', width: '25%', sortable: true, align: 'right' },
    { key: 'expenses', title: 'הוצאות', width: '25%', sortable: true, align: 'right' },
    { 
      key: 'balance', 
      title: 'יתרה', 
      width: '25%', 
      sortable: true, 
      align: 'right',
      render: (value) => (
        <span style={{ color: value >= 0 ? '#38a169' : '#e53e3e', fontWeight: '600' }}>
          {new Intl.NumberFormat('he-IL', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value)}
        </span>
      )
    },
  ];

  const monthlyIncomeColumns: TableColumn[] = [
    { key: 'monthName', title: 'חודש', width: '40%', sortable: true },
    { key: 'amount', title: 'סכום', width: '30%', sortable: true, align: 'right' },
    { key: 'count', title: 'מספר פריטים', width: '30%', sortable: true, align: 'center' },
  ];

  const monthlyExpenseColumns: TableColumn[] = [
    { key: 'monthName', title: 'חודש', width: '40%', sortable: true },
    { key: 'amount', title: 'סכום', width: '30%', sortable: true, align: 'right' },
    { key: 'count', title: 'מספר פריטים', width: '30%', sortable: true, align: 'center' },
  ];

  // Prepare table data with month names
  const monthlyTrendsData = reportData?.monthlyBalance.map(data => ({
    ...data,
    monthName: HEBREW_MONTHS[data.month - 1]
  })) || [];

  const monthlyIncomeData = reportData?.monthlyIncome.map(data => ({
    ...data,
    monthName: HEBREW_MONTHS[data.month - 1]
  })) || [];

  const monthlyExpenseData = reportData?.monthlyExpenses.map(data => ({
    ...data,
    monthName: HEBREW_MONTHS[data.month - 1]
  })) || [];

  const trendChartData = prepareTrendChartData();
  const comparisonChartData = prepareMonthlyComparisonData();

  if (error) {
    return (
      <ReportErrorDisplay
        error={error}
        onRetry={loadReportData}
        reportType="דוח ביצוע תקציב שנתי"
        period={`${year}`}
      />
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>דוח ביצוע תקציב שנתי</h2>
          <p style={styles.subtitle}>שנת {year}</p>
        </div>
        <button onClick={handleExport} style={styles.exportButton}>
          ייצא לקובץ CSV
        </button>
      </div>

      <div style={styles.summaryCards}>
        <div style={styles.summaryCard}>
          <h3 style={styles.summaryTitle}>סך הכנסות שנתי</h3>
          <p style={styles.summaryAmount}>{formatCurrency(reportData.yearlyTotals.income)}</p>
        </div>
        <div style={styles.summaryCard}>
          <h3 style={styles.summaryTitle}>סך הוצאות שנתי</h3>
          <p style={styles.summaryAmount}>{formatCurrency(reportData.yearlyTotals.expenses)}</p>
        </div>
        <div style={{
          ...styles.summaryCard,
          ...(reportData.yearlyTotals.balance >= 0 ? styles.positiveBalance : styles.negativeBalance)
        }}>
          <h3 style={styles.summaryTitle}>יתרה שנתית</h3>
          <p style={styles.summaryAmount}>{formatCurrency(reportData.yearlyTotals.balance)}</p>
        </div>
      </div>

      <div style={styles.sectionsContainer}>
        {/* Monthly Trends Section */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>מגמות חודשיות</h3>
          <div style={styles.chartsAndTableContainer}>
            {/* Charts Row */}
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
            
            {/* Table */}
            <div style={styles.tableContainer}>
              <SummaryTable
                data={monthlyTrendsData}
                columns={monthlyTrendsColumns}
                showFooter={true}
                footerData={{
                  monthName: 'סה"כ',
                  income: reportData?.yearlyTotals.income || 0,
                  expenses: reportData?.yearlyTotals.expenses || 0,
                  balance: reportData?.yearlyTotals.balance || 0
                }}
                striped={true}
                bordered={true}
              />
            </div>
          </div>
        </div>

        {/* Monthly Income Details */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>פירוט הכנסות חודשי</h3>
          {reportData.monthlyIncome.length > 0 ? (
            <div style={styles.tableContainer}>
              <SummaryTable
                data={monthlyIncomeData}
                columns={monthlyIncomeColumns}
                striped={true}
                bordered={true}
              />
            </div>
          ) : (
            <p style={styles.noData}>אין נתוני הכנסות לשנה זו</p>
          )}
        </div>

        {/* Monthly Expenses Details */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>פירוט הוצאות חודשי</h3>
          {reportData.monthlyExpenses.length > 0 ? (
            <div style={styles.tableContainer}>
              <SummaryTable
                data={monthlyExpenseData}
                columns={monthlyExpenseColumns}
                striped={true}
                bordered={true}
              />
            </div>
          ) : (
            <p style={styles.noData}>אין נתוני הוצאות לשנה זו</p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    direction: 'rtl',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#718096',
    margin: 0,
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
    transition: 'background-color 0.2s',
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  summaryCard: {
    padding: '20px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    textAlign: 'center',
    border: '2px solid #e2e8f0',
  },
  positiveBalance: {
    backgroundColor: '#f0fff4',
    borderColor: '#48bb78',
  },
  negativeBalance: {
    backgroundColor: '#fed7d7',
    borderColor: '#f56565',
  },
  summaryTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    margin: '0 0 8px 0',
  },
  summaryAmount: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  sectionsContainer: {
    display: 'grid',
    gap: '32px',
  },
  section: {
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    padding: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: '0 0 16px 0',
  },
  chartsAndTableContainer: {
    display: 'grid',
    gap: '24px',
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  table: {
    backgroundColor: 'white',
    borderRadius: '6px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    backgroundColor: '#edf2f7',
    fontWeight: '600',
    fontSize: '14px',
  },
  tableHeaderCell: {
    padding: '12px 16px',
    textAlign: 'right',
    borderLeft: '1px solid #e2e8f0',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    borderBottom: '1px solid #e2e8f0',
  },
  tableTotalRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    backgroundColor: '#f7fafc',
    fontWeight: '600',
  },
  tableCell: {
    padding: '12px 16px',
    textAlign: 'right',
    borderLeft: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  noData: {
    textAlign: 'center',
    color: '#718096',
    fontStyle: 'italic',
    padding: '40px 20px',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: '#fed7d7',
    borderRadius: '8px',
    color: '#c53030',
  },
  retryButton: {
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: '#e53e3e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};