import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';
import { IncomeExecutionData } from '../../types';
import { BarChart, PieChart, SummaryTable } from '../charts';
import type { BarChartData, PieChartData, TableColumn } from '../charts';
import ReportErrorDisplay from '../ReportErrorDisplay';
import { parseError, ReportError } from '../../utils/errorHandling';

interface IncomeExecutionReportProps {
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

export default function IncomeExecutionReport({ year, month, isLoading, setIsLoading, onError }: IncomeExecutionReportProps) {
  const [reportData, setReportData] = useState<IncomeExecutionData | null>(null);
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
      const response = await reportsAPI.getIncomeExecutionReport(year, month);
      setReportData(response.data);
    } catch (error: any) {
      console.error('Failed to load income execution report:', error);
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
      const response = await reportsAPI.exportIncomeExecutionReport(year, month);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `income-execution-${year}-${month.toString().padStart(2, '0')}.csv`);
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

  const getFulfillmentColor = (percentage: number) => {
    if (percentage >= 100) return '#38a169'; // Green
    if (percentage >= 70) return '#d69e2e';  // Yellow
    if (percentage >= 30) return '#ed8936';  // Orange
    return '#e53e3e'; // Red
  };

  // Prepare chart data
  const prepareIncomeAnalysisChartData = (data: any[]): { barData: BarChartData; pieData: PieChartData } => {
    if (!data || data.length === 0) {
      return {
        barData: { labels: [], datasets: [] },
        pieData: { labels: [], datasets: [] }
      };
    }

    const labels = data.map(category => category.categoryName);
    const expectedAmounts = data.map(category => category.expectedAmount);
    const actualAmounts = data.map(category => category.actualAmount);
    const colors = data.map(category => category.categoryColor || '#36A2EB');

    return {
      barData: {
        labels,
        datasets: [
          {
            label: 'צפוי',
            data: expectedAmounts,
            backgroundColor: colors.map(color => color + '40'),
            borderColor: colors,
            borderWidth: 1,
          },
          {
            label: 'בפועל',
            data: actualAmounts,
            backgroundColor: colors.map(color => color + '80'),
            borderColor: colors,
            borderWidth: 1,
          }
        ]
      },
      pieData: {
        labels,
        datasets: [{
          data: actualAmounts,
          backgroundColor: colors,
          borderColor: colors.map(color => color + 'CC'),
          borderWidth: 1,
        }]
      }
    };
  };

  const prepareFulfillmentChartData = (data: any[]): BarChartData => {
    if (!data || data.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = data.map(category => category.categoryName);
    const fulfillmentData = data.map(category => category.fulfillmentPercentage);
    const colors = fulfillmentData.map(percentage => getFulfillmentColor(percentage));

    return {
      labels,
      datasets: [{
        label: '% מימוש',
        data: fulfillmentData,
        backgroundColor: colors.map(color => color + '80'),
        borderColor: colors,
        borderWidth: 1,
      }]
    };
  };

  // Prepare table columns
  const incomeAnalysisColumns: TableColumn[] = [
    { 
      key: 'categoryName', 
      title: 'קטגוריה', 
      width: '25%', 
      sortable: true,
      render: (value, row) => (
        <div style={styles.categoryName}>
          {row.categoryColor && (
            <div 
              style={{
                ...styles.categoryColor,
                backgroundColor: row.categoryColor
              }}
            />
          )}
          {value}
        </div>
      )
    },
    { key: 'expectedAmount', title: 'צפוי', width: '20%', sortable: true, align: 'right' },
    { key: 'actualAmount', title: 'בפועל', width: '20%', sortable: true, align: 'right' },
    { 
      key: 'difference', 
      title: 'הפרש', 
      width: '20%', 
      sortable: true, 
      align: 'right',
      render: (value) => (
        <span style={{
          color: value >= 0 ? '#38a169' : '#e53e3e',
          fontWeight: '600'
        }}>
          {new Intl.NumberFormat('he-IL', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value)}
        </span>
      )
    },
    { 
      key: 'fulfillmentPercentage', 
      title: '% מימוש', 
      width: '15%', 
      sortable: true, 
      align: 'center',
      render: (value) => (
        <span style={{
          color: getFulfillmentColor(value),
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
        reportType="דוח ביצוע הכנסות"
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
  const monthlyChartData = prepareIncomeAnalysisChartData(currentMonthData);
  const annualChartData = prepareIncomeAnalysisChartData(reportData.annualTotals.byCategory);
  const monthlyFulfillmentData = prepareFulfillmentChartData(currentMonthData);
  const annualFulfillmentData = prepareFulfillmentChartData(reportData.annualTotals.byCategory);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>דוח ביצוע הכנסות</h2>
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
              <h3 style={styles.summaryTitle}>סך הכנסות חודשי</h3>
              <p style={styles.summaryAmount}>{formatCurrency(currentMonthTotal)}</p>
            </div>
          </div>

          {/* Monthly Category Analysis */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>ניתוח הכנסות לפי קטגוריות - {HEBREW_MONTHS[month - 1]} {year}</h3>
            {currentMonthData.length > 0 ? (
              <div style={styles.chartsAndTableContainer}>
                {/* Charts Row */}
                <div style={styles.chartsRow}>
                  <div style={styles.chartContainer}>
                    <BarChart 
                      data={monthlyChartData.barData}
                      height={350}
                      title="השוואת צפוי מול בפועל"
                      showLegend={true}
                    />
                  </div>
                  <div style={styles.chartContainer}>
                    <BarChart 
                      data={monthlyFulfillmentData}
                      height={350}
                      title="אחוז מימוש לפי קטגוריה"
                      showLegend={false}
                      options={{
                        scales: {
                          y: {
                            max: 150,
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
                      title="התפלגות הכנסות בפועל לפי קטגוריה"
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
                    columns={incomeAnalysisColumns}
                    striped={true}
                    bordered={true}
                  />
                </div>
              </div>
            ) : (
              <p style={styles.noData}>אין נתוני הכנסות לחודש זה</p>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.sectionsContainer}>
          {/* Annual Summary */}
          <div style={styles.summaryCards}>
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>סך הכנסות שנתי</h3>
              <p style={styles.summaryAmount}>{formatCurrency(reportData.annualTotals.total)}</p>
            </div>
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>סך צפוי שנתי</h3>
              <p style={styles.summaryAmount}>
                {formatCurrency(reportData.annualTotals.byCategory.reduce((sum, cat) => sum + cat.expectedAmount, 0))}
              </p>
            </div>
            <div style={{
              ...styles.summaryCard,
              ...(reportData.annualTotals.byCategory.reduce((sum, cat) => sum + cat.difference, 0) >= 0 
                ? styles.positiveBalance : styles.negativeBalance)
            }}>
              <h3 style={styles.summaryTitle}>הפרש שנתי</h3>
              <p style={styles.summaryAmount}>
                {formatCurrency(reportData.annualTotals.byCategory.reduce((sum, cat) => sum + cat.difference, 0))}
              </p>
            </div>
          </div>

          {/* Annual Category Analysis */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>ניתוח הכנסות שנתי לפי קטגוריות - {year}</h3>
            {reportData.annualTotals.byCategory.length > 0 ? (
              <div style={styles.chartsAndTableContainer}>
                {/* Charts Row */}
                <div style={styles.chartsRow}>
                  <div style={styles.chartContainer}>
                    <BarChart 
                      data={annualChartData.barData}
                      height={350}
                      title="השוואת צפוי מול בפועל - שנתי"
                      showLegend={true}
                    />
                  </div>
                  <div style={styles.chartContainer}>
                    <BarChart 
                      data={annualFulfillmentData}
                      height={350}
                      title="אחוז מימוש שנתי לפי קטגוריה"
                      showLegend={false}
                      options={{
                        scales: {
                          y: {
                            max: 150,
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
                      title="התפלגות הכנסות שנתיות בפועל לפי קטגוריה"
                      showLegend={true}
                      showPercentages={true}
                      legendPosition="bottom"
                    />
                  </div>
                </div>
                
                {/* Table */}
                <div style={styles.tableContainer}>
                  <SummaryTable
                    data={reportData.annualTotals.byCategory}
                    columns={incomeAnalysisColumns}
                    showFooter={true}
                    footerData={{
                      categoryName: 'סה"כ',
                      expectedAmount: reportData.annualTotals.byCategory.reduce((sum, cat) => sum + cat.expectedAmount, 0),
                      actualAmount: reportData.annualTotals.total,
                      difference: reportData.annualTotals.byCategory.reduce((sum, cat) => sum + cat.difference, 0),
                      fulfillmentPercentage: 0
                    }}
                    striped={true}
                    bordered={true}
                  />
                </div>
              </div>
            ) : (
              <p style={styles.noData}>אין נתוני הכנסות לשנה זו</p>
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