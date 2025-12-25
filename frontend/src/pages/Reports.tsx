import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import MonthlyClosingReport from '../components/reports/MonthlyClosingReport';
import AnnualBudgetExecutionReport from '../components/reports/AnnualBudgetExecutionReport';
import ExpenseExecutionReport from '../components/reports/ExpenseExecutionReport';
import IncomeExecutionReport from '../components/reports/IncomeExecutionReport';

type ReportType = 'monthly-closing' | 'annual-budget' | 'expense-execution' | 'income-execution';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function Reports() {
  const currentDate = new Date();
  const [selectedReport, setSelectedReport] = useState<ReportType>('monthly-closing');
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [isLoading, setIsLoading] = useState(false);

  const reportTypes: { id: ReportType; name: string; description: string }[] = [
    { id: 'monthly-closing', name: 'דוח סגירה חודשי', description: 'סיכום הכנסות והוצאות לחודש' },
    { id: 'annual-budget', name: 'דוח ביצוע תקציב שנתי', description: 'מעקב ביצוע תקציב לאורך השנה' },
    { id: 'expense-execution', name: 'דוח ביצוע הוצאות', description: 'ניתוח הוצאות לפי תקציבים' },
    { id: 'income-execution', name: 'דוח ביצוע הכנסות', description: 'ניתוח הכנסות לפי קטגוריות' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  const renderReport = () => {
    switch (selectedReport) {
      case 'monthly-closing':
        return (
          <MonthlyClosingReport
            year={selectedYear}
            month={selectedMonth}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        );
      case 'annual-budget':
        return (
          <AnnualBudgetExecutionReport
            year={selectedYear}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        );
      case 'expense-execution':
        return (
          <ExpenseExecutionReport
            year={selectedYear}
            month={selectedMonth}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        );
      case 'income-execution':
        return (
          <IncomeExecutionReport
            year={selectedYear}
            month={selectedMonth}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        );
      default:
        return null;
    }
  };

  const needsMonthSelector = selectedReport !== 'annual-budget';

  return (
    <div style={styles.container}>
      <Navigation />
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>דוחות</h1>
        </div>

        {/* Report Type Selection */}
        <div style={styles.reportTypeSelector}>
          {reportTypes.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              style={{
                ...styles.reportTypeButton,
                ...(selectedReport === report.id ? styles.reportTypeButtonActive : {})
              }}
            >
              <span style={styles.reportTypeName}>{report.name}</span>
              <span style={styles.reportTypeDescription}>{report.description}</span>
            </button>
          ))}
        </div>

        {/* Time Period Selectors */}
        <div style={styles.timePeriodSelector}>
          <div style={styles.selectorGroup}>
            <label style={styles.selectorLabel}>שנה</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={styles.select}
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {needsMonthSelector && (
            <div style={styles.selectorGroup}>
              <label style={styles.selectorLabel}>חודש</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={styles.select}
              >
                {HEBREW_MONTHS.map((month, index) => (
                  <option key={index + 1} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingSpinner}>טוען דוח...</div>
          </div>
        )}

        {/* Report Display Area */}
        <div style={styles.reportContainer}>
          {renderReport()}
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f7fafc',
    direction: 'rtl',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  reportTypeSelector: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  reportTypeButton: {
    padding: '16px',
    backgroundColor: 'white',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'right',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  reportTypeButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#f0f4ff',
  },
  reportTypeName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
  },
  reportTypeDescription: {
    fontSize: '12px',
    color: '#718096',
  },
  timePeriodSelector: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  selectorGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  selectorLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    minWidth: '120px',
    cursor: 'pointer',
  },
  loadingOverlay: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
  },
  loadingSpinner: {
    fontSize: '18px',
    color: '#667eea',
    fontWeight: '600',
  },
  reportContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    minHeight: '400px',
  },
};
