import React from 'react';
import { exportTableAsCSV } from './utils';

export interface TableColumn {
  key: string;
  title: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface SummaryTableProps {
  data: any[];
  columns: TableColumn[];
  title?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  footerData?: any;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  emptyMessage?: string;
  maxHeight?: number;
  striped?: boolean;
  bordered?: boolean;
  showExportButton?: boolean;
  exportFilename?: string;
}

export default function SummaryTable({
  data,
  columns,
  title,
  showHeader = true,
  showFooter = false,
  footerData,
  onSort,
  sortKey,
  sortDirection,
  emptyMessage = 'אין נתונים להצגה',
  maxHeight,
  striped = true,
  bordered = true,
  showExportButton = false,
  exportFilename = 'table-data',
}: SummaryTableProps) {
  const handleSort = (column: TableColumn) => {
    if (!column.sortable || !onSort) return;
    
    const newDirection = sortKey === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column.key, newDirection);
  };

  const handleExport = () => {
    exportTableAsCSV(data, columns, exportFilename);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderCellValue = (column: TableColumn, value: any, row: any, index: number) => {
    if (column.render) {
      return column.render(value, row, index);
    }
    
    // Auto-format currency if the value looks like a monetary amount
    if (typeof value === 'number' && (
      column.key.includes('amount') || 
      column.key.includes('total') || 
      column.key.includes('balance') ||
      column.key.includes('spent') ||
      column.key.includes('allocated')
    )) {
      return formatCurrency(value);
    }
    
    return value;
  };

  const getSortIcon = (column: TableColumn) => {
    if (!column.sortable) return null;
    
    if (sortKey === column.key) {
      return sortDirection === 'asc' ? ' ↑' : ' ↓';
    }
    return ' ↕';
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    direction: 'rtl',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    ...(bordered && {
      border: '1px solid #e2e8f0',
    }),
  };

  const containerStyle: React.CSSProperties = {
    direction: 'rtl',
    ...(maxHeight && {
      maxHeight: `${maxHeight}px`,
      overflowY: 'auto',
    }),
  };

  if (data.length === 0) {
    return (
      <div style={styles.container}>
        {title && <h3 style={styles.title}>{title}</h3>}
        <div style={styles.emptyState}>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.titleRow}>
        {title && <h3 style={styles.title}>{title}</h3>}
        {showExportButton && (
          <button
            onClick={handleExport}
            style={styles.exportButton}
          >
            ייצא לקובץ CSV
          </button>
        )}
      </div>
      <div style={containerStyle}>
        <table style={tableStyle}>
          {showHeader && (
            <thead>
              <tr style={styles.headerRow}>
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    style={{
                      ...styles.headerCell,
                      width: column.width,
                      textAlign: column.align || 'right',
                      cursor: column.sortable ? 'pointer' : 'default',
                      ...(bordered && {
                        borderLeft: index > 0 ? '1px solid #e2e8f0' : 'none',
                      }),
                    }}
                    onClick={() => handleSort(column)}
                  >
                    {column.title}
                    {getSortIcon(column)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  ...styles.dataRow,
                  ...(striped && rowIndex % 2 === 1 && styles.stripedRow),
                }}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={column.key}
                    style={{
                      ...styles.dataCell,
                      textAlign: column.align || 'right',
                      ...(bordered && {
                        borderLeft: colIndex > 0 ? '1px solid #e2e8f0' : 'none',
                        borderBottom: '1px solid #e2e8f0',
                      }),
                    }}
                  >
                    {renderCellValue(column, row[column.key], row, rowIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {showFooter && footerData && (
            <tfoot>
              <tr style={styles.footerRow}>
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    style={{
                      ...styles.footerCell,
                      textAlign: column.align || 'right',
                      ...(bordered && {
                        borderLeft: index > 0 ? '1px solid #e2e8f0' : 'none',
                        borderTop: '2px solid #4a5568',
                      }),
                    }}
                  >
                    {renderCellValue(column, footerData[column.key], footerData, -1)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    direction: 'rtl',
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 16px 0 16px',
    marginBottom: '16px',
  },
  exportButton: {
    padding: '6px 12px',
    backgroundColor: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  headerRow: {
    backgroundColor: '#edf2f7',
  },
  headerCell: {
    padding: '12px 16px',
    fontWeight: '600',
    color: '#4a5568',
    borderBottom: '2px solid #cbd5e0',
  },
  dataRow: {
    transition: 'background-color 0.2s',
  },
  stripedRow: {
    backgroundColor: '#f7fafc',
  },
  dataCell: {
    padding: '12px 16px',
    color: '#2d3748',
  },
  footerRow: {
    backgroundColor: '#f7fafc',
  },
  footerCell: {
    padding: '12px 16px',
    fontWeight: '600',
    color: '#2d3748',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#718096',
    fontStyle: 'italic',
  },
};