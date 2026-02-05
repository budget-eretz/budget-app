import React, { useState, useEffect } from 'react';
import { apartmentsAPI } from '../../services/api';
import { ApartmentMonthlyExpense } from '../../types';
import { useToast } from '../Toast';

interface ApartmentExpenseReportProps {
  year: number;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

interface PivotRow {
  apartmentId: number;
  apartmentName: string;
  budgetId: number;
  budgetName: string;
  fundId: number;
  fundName: string;
  months: { [month: number]: number }; // month (1-12) -> total_amount
  total: number;
}

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function ApartmentExpenseReport({ year, isLoading, setIsLoading }: ApartmentExpenseReportProps) {
  const [pivotData, setPivotData] = useState<PivotRow[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    loadMonthlyExpenses();
  }, [year]);

  const loadMonthlyExpenses = async () => {
    setIsLoading(true);
    try {
      const response = await apartmentsAPI.getMonthlyExpenses(year);
      const rawData: ApartmentMonthlyExpense[] = response.data;

      // Pivot the data
      const pivotMap = new Map<string, PivotRow>();

      rawData.forEach((item) => {
        const key = `${item.apartment_id}-${item.budget_id}-${item.fund_id}`;

        if (!pivotMap.has(key)) {
          pivotMap.set(key, {
            apartmentId: item.apartment_id,
            apartmentName: item.apartment_name,
            budgetId: item.budget_id,
            budgetName: item.budget_name,
            fundId: item.fund_id,
            fundName: item.fund_name,
            months: {},
            total: 0,
          });
        }

        const row = pivotMap.get(key)!;
        row.months[item.month] = (row.months[item.month] || 0) + item.total_amount;
        row.total += item.total_amount;
      });

      const pivotArray = Array.from(pivotMap.values());

      // Sort by apartment name, then budget name, then fund name
      pivotArray.sort((a, b) => {
        if (a.apartmentName !== b.apartmentName) {
          return a.apartmentName.localeCompare(b.apartmentName, 'he');
        }
        if (a.budgetName !== b.budgetName) {
          return a.budgetName.localeCompare(b.budgetName, 'he');
        }
        return a.fundName.localeCompare(b.fundName, 'he');
      });

      setPivotData(pivotArray);
    } catch (error: any) {
      console.error('Failed to load apartment monthly expenses:', error);
      showToast(error.response?.data?.error || 'שגיאה בטעינת דוח הוצאות חודשי', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Group data by apartment for subtotals
  const apartmentGroups = new Map<number, PivotRow[]>();
  pivotData.forEach((row) => {
    if (!apartmentGroups.has(row.apartmentId)) {
      apartmentGroups.set(row.apartmentId, []);
    }
    apartmentGroups.get(row.apartmentId)!.push(row);
  });

  // Calculate apartment subtotals
  const apartmentSubtotals = new Map<number, { months: { [month: number]: number }, total: number }>();
  apartmentGroups.forEach((rows, apartmentId) => {
    const subtotal = {
      months: {} as { [month: number]: number },
      total: 0,
    };
    rows.forEach((row) => {
      for (let month = 1; month <= 12; month++) {
        if (row.months[month]) {
          subtotal.months[month] = (subtotal.months[month] || 0) + row.months[month];
        }
      }
      subtotal.total += row.total;
    });
    apartmentSubtotals.set(apartmentId, subtotal);
  });

  // Calculate column totals
  const columnTotals = {
    months: {} as { [month: number]: number },
    total: 0,
  };

  pivotData.forEach((row) => {
    for (let month = 1; month <= 12; month++) {
      if (row.months[month]) {
        columnTotals.months[month] = (columnTotals.months[month] || 0) + row.months[month];
      }
    }
    columnTotals.total += row.total;
  });

  return (
    <div style={styles.reportContent}>
      <div style={styles.header}>
        <h2 style={styles.reportTitle}>דוח הוצאות לפי דירות - {year}</h2>
        <p style={styles.reportDescription}>
          הדוח מציג סכום החזרים והוצאות ישירות לפי דירה, תקציב וסעיף עבור כל חודש בשנה
        </p>
      </div>

      {isLoading ? (
        <div style={styles.loading}>טוען נתונים...</div>
      ) : pivotData.length === 0 ? (
        <div style={styles.noData}>אין נתונים להצגה עבור שנת {year}</div>
      ) : (
        <div style={styles.tableWrapper}>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.headerRow}>
                  <th style={{ ...styles.stickyHeader, ...styles.firstColumn }}>דירה</th>
                  <th style={styles.stickyHeader}>תקציב</th>
                  <th style={styles.stickyHeader}>סעיף</th>
                  {MONTH_NAMES.map((monthName, index) => (
                    <th key={index + 1} style={styles.monthHeader}>
                      {monthName}
                    </th>
                  ))}
                  <th style={{ ...styles.stickyHeader, ...styles.totalColumn }}>סה"כ</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(apartmentGroups.entries()).map(([apartmentId, rows]) => {
                  const apartmentName = rows[0].apartmentName;
                  const subtotal = apartmentSubtotals.get(apartmentId)!;

                  return (
                    <React.Fragment key={apartmentId}>
                      {/* Apartment rows */}
                      {rows.map((row) => (
                        <tr key={`${row.apartmentId}-${row.budgetId}-${row.fundId}`} style={styles.dataRow}>
                          <td style={{ ...styles.cell, ...styles.firstColumn }}>{row.apartmentName}</td>
                          <td style={styles.cell}>{row.budgetName}</td>
                          <td style={styles.cell}>{row.fundName}</td>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                            <td key={month} style={styles.monthCell}>
                              {formatCurrency(row.months[month])}
                            </td>
                          ))}
                          <td style={{ ...styles.cell, ...styles.totalCell }}>
                            {formatCurrency(row.total)}
                          </td>
                        </tr>
                      ))}

                      {/* Apartment subtotal row */}
                      <tr key={`subtotal-${apartmentId}`} style={styles.subtotalRow}>
                        <td colSpan={3} style={styles.subtotalLabel}>
                          <strong>סיכום {apartmentName}</strong>
                        </td>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                          <td key={month} style={styles.subtotalCell}>
                            <strong>{formatCurrency(subtotal.months[month])}</strong>
                          </td>
                        ))}
                        <td style={styles.subtotalTotalCell}>
                          <strong>{formatCurrency(subtotal.total)}</strong>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}

                {/* Totals Row */}
                <tr style={styles.totalsRow}>
                  <td colSpan={3} style={{ ...styles.cell, ...styles.totalLabel }}>
                    <strong>סה"כ</strong>
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                    <td key={month} style={styles.totalMonthCell}>
                      <strong>{formatCurrency(columnTotals.months[month])}</strong>
                    </td>
                  ))}
                  <td style={{ ...styles.cell, ...styles.grandTotalCell }}>
                    <strong>{formatCurrency(columnTotals.total)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  reportContent: {
    width: '100%',
  },
  header: {
    marginBottom: '24px',
  },
  reportTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
    marginBottom: '8px',
  },
  reportDescription: {
    fontSize: '14px',
    color: '#718096',
    margin: 0,
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#718096',
    fontSize: '16px',
  },
  noData: {
    padding: '40px',
    textAlign: 'center',
    color: '#718096',
    fontSize: '16px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
  },
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },
  tableContainer: {
    minWidth: '1400px', // Ensure horizontal scroll for wide table
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
  },
  headerRow: {
    backgroundColor: '#4a5568',
    color: 'white',
  },
  stickyHeader: {
    padding: '12px 8px',
    textAlign: 'right',
    fontWeight: '600',
    borderBottom: '2px solid #2d3748',
    borderLeft: '1px solid #718096',
    position: 'sticky',
    top: 0,
    backgroundColor: '#4a5568',
    color: 'white',
    zIndex: 10,
  },
  firstColumn: {
    minWidth: '120px',
  },
  monthHeader: {
    padding: '12px 8px',
    textAlign: 'center',
    fontWeight: '600',
    borderBottom: '2px solid #2d3748',
    borderLeft: '1px solid #718096',
    minWidth: '90px',
  },
  totalColumn: {
    minWidth: '100px',
    backgroundColor: '#2d3748',
  },
  dataRow: {
    borderBottom: '1px solid #e2e8f0',
  },
  cell: {
    padding: '10px 8px',
    textAlign: 'right',
    color: '#2d3748',
    borderLeft: '1px solid #e2e8f0',
  },
  monthCell: {
    padding: '10px 8px',
    textAlign: 'center',
    color: '#2d3748',
    borderLeft: '1px solid #e2e8f0',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  totalCell: {
    fontWeight: 'bold',
    backgroundColor: '#f7fafc',
    fontFamily: 'monospace',
  },
  subtotalRow: {
    backgroundColor: '#e6f7ff',
    borderTop: '2px solid #91d5ff',
    borderBottom: '2px solid #91d5ff',
  },
  subtotalLabel: {
    padding: '10px 8px',
    textAlign: 'right',
    color: '#1890ff',
    fontSize: '14px',
    borderLeft: '1px solid #91d5ff',
  },
  subtotalCell: {
    padding: '10px 8px',
    textAlign: 'center',
    color: '#1890ff',
    borderLeft: '1px solid #91d5ff',
    fontFamily: 'monospace',
    fontSize: '13px',
    backgroundColor: '#e6f7ff',
  },
  subtotalTotalCell: {
    padding: '10px 8px',
    textAlign: 'center',
    color: '#1890ff',
    borderLeft: '1px solid #91d5ff',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
    backgroundColor: '#bae7ff',
  },
  totalsRow: {
    backgroundColor: '#edf2f7',
    borderTop: '2px solid #4a5568',
  },
  totalLabel: {
    textAlign: 'center',
    fontSize: '14px',
  },
  totalMonthCell: {
    padding: '10px 8px',
    textAlign: 'center',
    color: '#2d3748',
    borderLeft: '1px solid #cbd5e0',
    fontFamily: 'monospace',
    fontSize: '13px',
  },
  grandTotalCell: {
    fontWeight: 'bold',
    backgroundColor: '#e2e8f0',
    fontSize: '14px',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
};
