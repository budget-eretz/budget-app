import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';
import { ExpenseExecutionData } from '../../types';
import { BarChart, PieChart, SummaryTable } from '../charts';
import type { BarChartData, PieChartData, TableColumn } from '../charts';
import { generateColorPalette, getExpenseColors, getBudgetComparisonColors } from '../../utils/chartColors';
import ReportErrorDisplay from '../ReportErrorDisplay';
import { parseError, ReportError } from '../../utils/errorHandling';

interface ExpenseExecutionReportProps {
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

export default function ExpenseExecutionReport({ year, month, isLoading, setIsLoading, onError }: ExpenseExecutionReportProps) {
  const [reportData, setReportData] = useState<ExpenseExecutionData | null>(null);
  const [error, setError] = useState<ReportError | null>(null);
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    loadReportData();
  }, [year, month]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load both monthly and annual data
      const response = await reportsAPI.getExpenseExecutionReport(year, month);
      setReportData(response.data);
    } catch (error: any) {
      console.error('Failed to load expense execution report:', error);
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
      const response = await reportsAPI.exportExpenseExecutionReport(year, month);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expense-execution-${year}-${month.toString().padStart(2, '0')}.csv`);
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

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  // Prepare chart data
  const prepareBudgetExecutionChartData = (data: any[]): { barData: BarChartData; pieData: PieChartData } => {
    if (!data || data.length === 0) {
      return {
        barData: { labels: [], datasets: [] },
        pieData: { labels: [], datasets: [] }
      };
    }

    const labels = data.map(budget => budget.budgetName);
    const allocatedAmounts = data.map(budget => budget.allocatedAmount);
    const spentAmounts = data.map(budget => budget.spentAmount);
    
    // Generate distinct colors for each budget
    const colors = getExpenseColors(labels.length);
    const comparisonColors = getBudgetComparisonColors();

    return {
      barData: {
        labels,
        datasets: [
          {
            label: 'הוקצה',
            data: allocatedAmounts,
            backgroundColor: comparisonColors.planned + '60',
            borderColor: comparisonColors.planned,
            borderWidth: 2,
          },
          {
            label: 'הוצא',
            data: spentAmounts,
            backgroundColor: comparisonColors.actual + '80',
            borderColor: comparisonColors.actual,
            borderWidth: 2,
          }
        ]
      },
      pieData: {
        labels,
        datasets: [{
          data: spentAmounts,
          backgroundColor: colors,
          borderColor: colors.map(color => color + 'CC'),
          borderWidth: 2,
        }]
      }
    };
  };

  const prepareUtilizationChartData = (data: any[]): BarChartData => {
    if (!data || data.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = data.map(budget => budget.budgetName);
    const utilizationData = data.map(budget => budget.utilizationPercentage);
    
    // Use color coding based on utilization percentage
    const colors = utilizationData.map(percentage => 
      percentage > 90 ? '#F56565' : // Red for high utilization
      percentage > 70 ? '#ED8936' : // Orange for medium utilization
      '#48BB78' // Green for low utilization
    );

    return {
      labels,
      datasets: [{
        label: '% ניצול תקציב',
        data: utilizationData,
        backgroundColor: colors.map(color => color + '80'),
        borderColor: colors,
        borderWidth: 2,
      }]
    };
  };

  // Prepare table columns
  const budgetExecutionColumns: TableColumn[] = [
    { key: 'budgetName', title: 'תקציב', width: '20%', sortable: true },
    { 
      key: 'budgetType', 
      title: 'סוג', 
      width: '10%', 
      render: (value) => (
        <span style={{
          ...styles.budgetTypeBadge,
          ...(value === 'circle' ? styles.circleBadge : styles.groupBadge)
        }}>
          {value === 'circle' ? 'מעגלי' : 'קבוצתי'}
        </span>
      )
    },
    { key: 'groupName', title: 'קבוצה', width: '15%', render: (value) => value || '-' },
    { key: 'allocatedAmount', title: 'הוקצה', width: '15%', sortable: true, align: 'right' },
    { key: 'spentAmount', title: 'הוצא', width: '15%', sortable: true, align: 'right' },
    { key: 'remainingAmount', title: 'נותר', width: '15%', sortable: true, align: 'right' },
    { 
      key: 'utilizationPercentage', 
      title: '% ניצול', 
      width: '10%', 
      sortable: true, 
      align: 'center',
      render: (value) => (
        <span style={{
          color: value > 90 ? '#e53e3e' : 
                 value > 70 ? '#d69e2e' : '#38a169',
          fontWeight: '600'
        }}>
          {formatPercentage(value)}
        </span>
      )
    },
  ];

  if (error) {
    return (
      <ReportErrorDisplay
        error={error}
        onRetry={loadReportData}
        reportType="דוח ביצוע הוצאות"
        period={`${year}`}
      />
    );
  }

  if (!reportData) {
    return null;
  }

  const currentMonthData = reportData.monthlyExecution[month] || [];
  const currentMonthTotal = reportData.monthlyTotals[month] || 0;

  // Prepare chart data for current view
  const monthlyChartData = prepareBudgetExecutionChartData(currentMonthData);
  const annualChartData = prepareBudgetExecutionChartData(reportData.annualTotals.byBudget);
  const monthlyUtilizationData = prepareUtilizationChartData(currentMonthData);
  const annualUtilizationData = prepareUtilizationChartData(reportData.annualTotals.byBudget);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>דוח ביצוע הוצאות</h2>
          <p style={styles.subtitle}>
            {HEBREW_MONTHS[month - 1]} {year}
          </p>
        </div>
        <div style={styles.headerControls}>
          <div style={styles.viewModeButtons}>
            <button
              onClick={() => setViewMode('monthly')}
              style={{
                ...styles.viewModeButton,
                ...(viewMode === 'monthly' ? styles.viewModeButtonActive : {})
              }}
            >
              תצוגה חודשית
            </button>
            <button
              onClick={() => setViewMode('annual')}
              style={{
                ...styles.viewModeButton,
                ...(viewMode === 'annual' ? styles.viewModeButtonActive : {})
              }}
            >
              תצוגה שנתית
            </button>
          </div>
          <button onClick={handleExport} style={styles.exportButton}>
            ייצא לקובץ CSV
          </button>
        </div>
      </div>

      {viewMode === 'monthly' ? (
        <div style={styles.sectionsContainer}>
          {/* Monthly Summary */}
          <div style={styles.summaryCards}>
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>סך הוצאות חודשי</h3>
              <p style={styles.summaryAmount}>{formatCurrency(currentMonthTotal)}</p>
            </div>
          </div>

          {/* Monthly Budget Execution */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>ביצוע תקציב חודשי - {HEBREW_MONTHS[month - 1]} {year}</h3>
            {currentMonthData.length > 0 ? (
              <div style={styles.chartsAndTableContainer}>
                {/* Charts Row */}
                <div style={styles.chartsRow}>
                  <div style={styles.chartContainer}>
                    <BarChart 
                      data={monthlyChartData.barData}
                      height={350}
                      title="השוואת הוקצה מול הוצא"
                      showLegend={true}
                    />
                  </div>
                  <div style={styles.chartContainer}>
                    <BarChart 
                      data={monthlyUtilizationData}
                      height={350}
                      title="אחוז ניצול תקציב"
                      showLegend={false}
                      options={{
                        scales: {
                          y: {
                            max: 100,
                            ticks: {
                              callback: function(value) {
                                return value + '%';
                              },
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
                
                {/* Pie Chart Row */}
                <div style={styles.singleChartRow}>
                  <div style={styles.chartContainer}>
                    <PieChart 
                      data={monthlyChartData.pieData}
                      height={350}
                      title="התפלגות הוצאות לפי תקציב"
                      showLegend={true}
                      showPercentages={true}
                      legendPosition="bottom"
                    />
                  </div>
                </div>
                
                {/* Table */}
                <div style={styles.tableContainer}>
                  <SummaryTable
                    data={currentMonthData}
                    columns={budgetExecutionColumns}
                    striped={true}
                    bordered={true}
                  />
                </div>
              </div>
            ) : (
              <p style={styles.noData}>אין נתוני הוצאות לחודש זה</p>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.sectionsContainer}>
          {/* Annual Summary */}
          <div style={styles.summaryCards}>
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>סך הוצאות שנתי</h3>
              <p style={styles.summaryAmount}>{formatCurrency(reportData.annualTotals.total)}</p>
            </div>
          </div>

          {/* Annual Budget Execution */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>ביצוע תקציב שנתי - {year}</h3>
            {reportData.annualTotals.byBudget.length > 0 ? (
              <div style={styles.chartsAndTableContainer}>
                {/* Charts Row */}
                <div style={styles.chartsRow}>
                  <div style={styles.chartContainer}>
                    <BarChart 
                      data={annualChartData.barData}
                      height={350}
                      title="השוואת הוקצה מול הוצא - שנתי"
                      showLegend={true}
                    />
                  </div>
                  <div style={styles.chartContainer}>
                    <BarChart 
                      data={annualUtilizationData}
                      height={350}
                      title="אחוז ניצול תקציב - שנתי"
                      showLegend={false}
                      options={{
                        scales: {
                          y: {
                            max: 100,
                            ticks: {
                              callback: function(value) {
                                return value + '%';
                              },
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
                
                {/* Pie Chart Row */}
                <div style={styles.singleChartRow}>
                  <div style={styles.chartContainer}>
                    <PieChart 
                      data={annualChartData.pieData}
                      height={350}
                      title="התפלגות הוצאות שנתיות לפי תקציב"
                      showLegend={true}
                      showPercentages={true}
                      legendPosition="bottom"
                    />
                  </div>
                </div>
                
                {/* Table */}
                <div style={styles.tableContainer}>
                  <SummaryTable
                    data={reportData.annualTotals.byBudget}
                    columns={budgetExecutionColumns}
                    showFooter={true}
                    footerData={{
                      budgetName: 'סה"כ',
                      budgetType: '',
                      groupName: '',
                      allocatedAmount: reportData.annualTotals.byBudget.reduce((sum, b) => sum + b.allocatedAmount, 0),
                      spentAmount: reportData.annualTotals.total,
                      remainingAmount: reportData.annualTotals.byBudget.reduce((sum, b) => sum + b.remainingAmount, 0),
                      utilizationPercentage: 0
                    }}
                    striped={true}
                    bordered={true}
                  />
                </div>
              </div>
            ) : (
              <p style={styles.noData}>אין נתוני הוצאות לשנה זו</p>
            )}
          </div>
        </div>
      )}
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
  headerControls: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  viewModeButtons: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#f7fafc',
    borderRadius: '6px',
    padding: '4px',
  },
  viewModeButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#4a5568',
  },
  viewModeButtonActive: {
    backgroundColor: 'white',
    color: '#667eea',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
  singleChartRow: {
    display: 'flex',
    justifyContent: 'center',
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
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr',
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
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr',
    borderBottom: '1px solid #e2e8f0',
  },
  tableTotalRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr',
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