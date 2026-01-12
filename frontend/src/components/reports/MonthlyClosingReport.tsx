import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';
import { MonthlyClosingData } from '../../types';
import { BarChart, PieChart, SummaryTable, CollapsibleSummaryTable } from '../charts';
import type { BarChartData, PieChartData, TableColumn, CollapsibleTableColumn } from '../charts';
import { generateColorPalette, getIncomeColors, getExpenseColors } from '../../utils/chartColors';
import ReportErrorDisplay from '../ReportErrorDisplay';
import { parseError, ReportError } from '../../utils/errorHandling';
import { apiCallWithRetry } from '../../utils/networkUtils';

interface MonthlyClosingReportProps {
  year: number;
  month: number;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onError?: (error: string) => void;
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function MonthlyClosingReport({ year, month, isLoading, setIsLoading, onError }: MonthlyClosingReportProps) {
  const [reportData, setReportData] = useState<MonthlyClosingData | null>(null);
  const [error, setError] = useState<ReportError | null>(null);

  useEffect(() => {
    loadReportData();
  }, [year, month]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiCallWithRetry(
        () => reportsAPI.getMonthlyClosingReport(year, month),
        { maxRetries: 2, baseDelay: 1000 }
      );
      setReportData(response.data);
    } catch (error: any) {
      console.error('Failed to load monthly closing report:', error);
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
      const response = await apiCallWithRetry(
        () => reportsAPI.exportMonthlyClosingReport(year, month),
        { maxRetries: 1, baseDelay: 500 }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `monthly-closing-${year}-${month.toString().padStart(2, '0')}.csv`);
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
  const prepareIncomeChartData = (): { barData: BarChartData; pieData: PieChartData } => {
    if (!reportData || reportData.income.byCategory.length === 0) {
      return {
        barData: { labels: [], datasets: [] },
        pieData: { labels: [], datasets: [] }
      };
    }

    const labels = reportData.income.byCategory.map(cat => cat.categoryName);
    const amounts = reportData.income.byCategory.map(cat => cat.amount);
    
    // Use category colors if available, otherwise generate distinct colors
    const categoryColors = reportData.income.byCategory.map(cat => cat.categoryColor);
    const hasCustomColors = categoryColors.some(color => color && color !== '');
    const colors = hasCustomColors ? 
      categoryColors.map((color, index) => color || getIncomeColors(labels.length)[index]) :
      getIncomeColors(labels.length);

    return {
      barData: {
        labels,
        datasets: [{
          label: 'הכנסות לפי קטגוריה',
          data: amounts,
          backgroundColor: colors.map(color => color + '80'),
          borderColor: colors,
          borderWidth: 2,
        }]
      },
      pieData: {
        labels,
        datasets: [{
          data: amounts,
          backgroundColor: colors,
          borderColor: colors.map(color => color + 'CC'),
          borderWidth: 2,
        }]
      }
    };
  };

  const prepareExpenseChartData = (): { barData: BarChartData; pieData: PieChartData } => {
    if (!reportData || reportData.expenses.byBudget.length === 0) {
      return {
        barData: { labels: [], datasets: [] },
        pieData: { labels: [], datasets: [] }
      };
    }

    const labels = reportData.expenses.byBudget.map(budget => budget.budgetName);
    const amounts = reportData.expenses.byBudget.map(budget => budget.amount);
    
    // Generate distinct colors for each budget instead of just circle/group colors
    const colors = getExpenseColors(labels.length);

    return {
      barData: {
        labels,
        datasets: [{
          label: 'הוצאות לפי תקציב',
          data: amounts,
          backgroundColor: colors.map(color => color + '80'),
          borderColor: colors,
          borderWidth: 2,
        }]
      },
      pieData: {
        labels,
        datasets: [{
          data: amounts,
          backgroundColor: colors,
          borderColor: colors.map(color => color + 'CC'),
          borderWidth: 2,
        }]
      }
    };
  };

  // Prepare table data
  const incomeTableColumns: TableColumn[] = [
    { key: 'categoryName', title: 'קטגוריה', width: '40%', sortable: true },
    { key: 'amount', title: 'סכום', width: '30%', sortable: true, align: 'right' },
    { key: 'count', title: 'מספר פריטים', width: '30%', sortable: true, align: 'center' },
  ];

  const expenseTableColumns: CollapsibleTableColumn[] = [
    { key: 'budgetName', title: 'תקציב', width: '25%', sortable: true },
    { 
      key: 'budgetType', 
      title: 'סוג', 
      width: '15%', 
      render: (value) => (
        <span style={{
          ...styles.budgetTypeBadge,
          ...(value === 'circle' ? styles.circleBadge : styles.groupBadge)
        }}>
          {value === 'circle' ? 'מעגלי' : 'קבוצתי'}
        </span>
      )
    },
    { key: 'groupName', title: 'קבוצה', width: '20%', render: (value) => value || '-' },
    { key: 'amount', title: 'סכום', width: '20%', sortable: true, align: 'right' },
    { key: 'count', title: 'מספר פריטים', width: '20%', sortable: true, align: 'center' },
  ];

  const incomeChartData = prepareIncomeChartData();
  const expenseChartData = prepareExpenseChartData();

  if (error) {
    return (
      <ReportErrorDisplay
        error={error}
        onRetry={loadReportData}
        reportType="דוח סגירה חודשי"
        period={`${HEBREW_MONTHS[month - 1]} ${year}`}
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
          <h2 style={styles.title}>דוח סגירה חודשי</h2>
          <p style={styles.subtitle}>
            {HEBREW_MONTHS[month - 1]} {year}
          </p>
        </div>
        <button onClick={handleExport} style={styles.exportButton}>
          ייצא לקובץ CSV
        </button>
      </div>

      <div style={styles.summaryCards}>
        <div style={styles.summaryCard}>
          <h3 style={styles.summaryTitle}>סך הכנסות</h3>
          <p style={styles.summaryAmount}>{formatCurrency(reportData.income.total)}</p>
        </div>
        <div style={styles.summaryCard}>
          <h3 style={styles.summaryTitle}>סך הוצאות</h3>
          <p style={styles.summaryAmount}>{formatCurrency(reportData.expenses.total)}</p>
        </div>
        <div style={{
          ...styles.summaryCard,
          ...(reportData.balance >= 0 ? styles.positiveBalance : styles.negativeBalance)
        }}>
          <h3 style={styles.summaryTitle}>יתרה</h3>
          <p style={styles.summaryAmount}>{formatCurrency(reportData.balance)}</p>
        </div>
      </div>

      <div style={styles.sectionsContainer}>
        {/* Income Section */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>הכנסות לפי קטגוריות</h3>
          {reportData.income.byCategory.length > 0 ? (
            <div style={styles.chartsAndTableContainer}>
              {/* Charts Row */}
              <div style={styles.chartsRow}>
                <div style={styles.chartContainer}>
                  <BarChart 
                    data={incomeChartData.barData}
                    height={300}
                    title="הכנסות לפי קטגוריה - תרשים עמודות"
                    showLegend={false}
                  />
                </div>
                <div style={styles.chartContainer}>
                  <PieChart 
                    data={incomeChartData.pieData}
                    height={300}
                    title="הכנסות לפי קטגוריה - תרשים עוגה"
                    showLegend={true}
                    showPercentages={true}
                    legendPosition="bottom"
                  />
                </div>
              </div>
              
              {/* Table */}
              <div style={styles.tableContainer}>
                <SummaryTable
                  data={reportData.income.byCategory}
                  columns={incomeTableColumns}
                  showFooter={true}
                  footerData={{
                    categoryName: 'סה"כ',
                    amount: reportData.income.total,
                    count: reportData.income.byCategory.reduce((sum, cat) => sum + cat.count, 0)
                  }}
                  striped={true}
                  bordered={true}
                />
              </div>
            </div>
          ) : (
            <p style={styles.noData}>אין הכנסות לחודש זה</p>
          )}
        </div>

        {/* Expenses Section */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>הוצאות לפי תקציבים</h3>
          {reportData.expenses.byBudget.length > 0 ? (
            <div style={styles.chartsAndTableContainer}>
              {/* Charts Row */}
              <div style={styles.chartsRow}>
                <div style={styles.chartContainer}>
                  <BarChart 
                    data={expenseChartData.barData}
                    height={300}
                    title="הוצאות לפי תקציב - תרשים עמודות"
                    showLegend={false}
                  />
                </div>
                <div style={styles.chartContainer}>
                  <PieChart 
                    data={expenseChartData.pieData}
                    height={300}
                    title="הוצאות לפי תקציב - תרשים עוגה"
                    showLegend={true}
                    showPercentages={true}
                    legendPosition="bottom"
                  />
                </div>
              </div>
              
              {/* Table */}
              <div style={styles.tableContainer}>
                <CollapsibleSummaryTable
                  data={reportData.expenses.byBudget}
                  columns={expenseTableColumns}
                  showFooter={true}
                  footerData={{
                    budgetName: 'סה"כ',
                    budgetType: '',
                    groupName: '',
                    amount: reportData.expenses.total,
                    count: reportData.expenses.byBudget.reduce((sum, budget) => sum + budget.count, 0)
                  }}
                  striped={true}
                  bordered={true}
                  expandableRowKey="budgetId"
                  year={year}
                  month={month}
                />
              </div>
            </div>
          ) : (
            <p style={styles.noData}>אין הוצאות לחודש זה</p>
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
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
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
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
    borderBottom: '1px solid #e2e8f0',
  },
  tableTotalRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
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
  categoryName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  categoryColor: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  budgetTypeBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  },
  circleBadge: {
    backgroundColor: '#bee3f8',
    color: '#2b6cb0',
  },
  groupBadge: {
    backgroundColor: '#d6f5d6',
    color: '#2f855a',
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