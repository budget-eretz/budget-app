import React, { useEffect, useState } from 'react';
import { reportsAPI } from '../../services/api';
import { DetailedAnnualExecutionData } from '../../types';

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
      const response = await reportsAPI.exportDetailedAnnualExecutionReport(year);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `detailed-annual-execution-${year}.csv`);
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
        <h2 style={styles.title}>דוח ביצוע שנתי מפורט - {year}</h2>
        <button onClick={handleExport} style={styles.exportButton}>
          ייצא לקובץ CSV
        </button>
      </div>

      {/* Section 1: Income Table */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>הכנסות</h3>
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
                <td style={{ ...styles.numberCell, ...styles.totalCell }}>-</td>
                <td style={{ ...styles.numberCell, ...styles.totalCell }}>-</td>
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
                      <td style={styles.fundCell}>{fund.fundName}</td>
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
                <td style={styles.fundCell}>-</td>
                {reportData.expenseExecution.totals.monthly.map((amount, index) => (
                  <td key={index} style={styles.numberCell}>
                    {formatCurrency(amount)}
                  </td>
                ))}
                <td style={{ ...styles.numberCell, ...styles.totalCell }}>
                  {formatCurrency(reportData.expenseExecution.totals.annual)}
                </td>
                <td style={{ ...styles.numberCell, ...styles.totalCell }}>-</td>
                <td style={{ ...styles.numberCell, ...styles.totalCell }}>-</td>
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
    </div>
  );
};

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    direction: 'rtl',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e0e0e0'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0
  },
  exportButton: {
    padding: '10px 20px',
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  section: {
    marginBottom: '40px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#555',
    marginBottom: '15px'
  },
  tableContainer: {
    overflowX: 'auto',
    border: '1px solid #e0e0e0',
    borderRadius: '4px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    fontSize: '13px'
  },
  headerRow: {
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #ddd'
  },
  stickyColumn: {
    padding: '12px',
    textAlign: 'right',
    borderBottom: '1px solid #e0e0e0',
    fontWeight: 'bold',
    minWidth: '150px',
    maxWidth: '200px',
    position: 'sticky',
    right: 0,
    backgroundColor: '#fff',
    zIndex: 1
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
    borderBottom: '1px solid #e0e0e0'
  },
  numberCell: {
    padding: '10px',
    textAlign: 'center',
    fontSize: '13px'
  },
  totalCell: {
    fontWeight: 'bold',
    backgroundColor: '#fafafa'
  },
  totalRow: {
    backgroundColor: '#e3f2fd',
    fontWeight: 'bold',
    borderTop: '2px solid #1976d2'
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
    backgroundColor: '#f9f9f9'
  },
  groupName: {
    fontSize: '11px',
    color: '#666',
    fontWeight: 'normal',
    marginTop: '2px'
  },
  fundCell: {
    padding: '10px 12px',
    textAlign: 'right',
    fontSize: '13px',
    paddingRight: '20px'
  },
  separator: {
    height: '2px',
    backgroundColor: '#ccc',
    margin: '30px 0',
    borderRadius: '1px'
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
