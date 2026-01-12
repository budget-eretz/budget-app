import React, { useState } from 'react';
import { TableColumn } from './SummaryTable';
import { reportsAPI } from '../../services/api';
import { FundSummary } from '../../types';

export interface CollapsibleTableColumn extends TableColumn {
  expandable?: boolean;
}

export interface CollapsibleSummaryTableProps {
  data: any[];
  columns: CollapsibleTableColumn[];
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
  // Collapsible specific props
  expandableRowKey: string; // The key that identifies which rows can be expanded (e.g., 'budgetId')
  year: number;
  month: number;
  onLoadDetails?: (rowId: number, year: number, month: number) => Promise<any[]>;
  detailColumns?: CollapsibleTableColumn[]; // Columns for the detail rows
  getDetailValue?: (column: CollapsibleTableColumn, detail: any) => any; // Function to map detail data to column values
}

export default function CollapsibleSummaryTable({
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
  expandableRowKey,
  year,
  month,
  onLoadDetails,
  detailColumns,
  getDetailValue,
}: CollapsibleSummaryTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [rowDetails, setRowDetails] = useState<Record<number, any[]>>({});
  const [loadingRows, setLoadingRows] = useState<Set<number>>(new Set());

  const handleSort = (column: CollapsibleTableColumn) => {
    if (!column.sortable || !onSort) return;
    
    const newDirection = sortKey === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column.key, newDirection);
  };

  const handleRowToggle = async (rowId: number) => {
    const newExpandedRows = new Set(expandedRows);
    
    if (expandedRows.has(rowId)) {
      // Collapse row
      newExpandedRows.delete(rowId);
    } else {
      // Expand row - load fund details if not already loaded
      newExpandedRows.add(rowId);
      
      if (!rowDetails[rowId]) {
        setLoadingRows(prev => new Set(prev).add(rowId));
        
        try {
          let details: any[] = [];
          
          if (onLoadDetails) {
            details = await onLoadDetails(rowId, year, month);
          } else {
            // Default implementation using reportsAPI for fund details
            const response = await reportsAPI.getBudgetFundDetails(rowId, year, month);
            details = response.data.funds;
          }
          
          setRowDetails(prev => ({
            ...prev,
            [rowId]: details
          }));
        } catch (error) {
          console.error('Failed to load row details:', error);
          // Remove from expanded rows if loading failed
          newExpandedRows.delete(rowId);
        } finally {
          setLoadingRows(prev => {
            const newSet = new Set(prev);
            newSet.delete(rowId);
            return newSet;
          });
        }
      }
    }
    
    setExpandedRows(newExpandedRows);
  };

  const getRowDetailValue = (column: CollapsibleTableColumn, detail: any) => {
    // Use custom detail value function if provided
    if (getDetailValue) {
      return getDetailValue(column, detail);
    }
    
    // Default implementation for fund details (backward compatibility)
    switch (column.key) {
      case 'budgetName':
        return detail.fundName || detail.name || '—';
      case 'budgetType':
      case 'groupName':
        return '—';
      case 'amount':
        return formatCurrency(detail.amount || 0);
      case 'count':
        return detail.count || 0;
      default:
        // For other columns, try to get the value directly or return dash
        return detail[column.key] || '—';
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

  const renderCellValue = (column: CollapsibleTableColumn, value: any, row: any, index: number) => {
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

  const getSortIcon = (column: CollapsibleTableColumn) => {
    if (!column.sortable) return null;
    
    if (sortKey === column.key) {
      return sortDirection === 'asc' ? ' ↑' : ' ↓';
    }
    return ' ↕';
  };

  const getExpandIcon = (rowId: number) => {
    if (loadingRows.has(rowId)) {
      return '⏳';
    }
    return expandedRows.has(rowId) ? '▼' : '▶';
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
            onClick={() => {/* TODO: Implement export */}}
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
                <th style={{...styles.headerCell, width: '40px', textAlign: 'center'}}>
                  {/* Expand/Collapse column header */}
                </th>
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    style={{
                      ...styles.headerCell,
                      width: column.width,
                      textAlign: column.align || 'right',
                      cursor: column.sortable ? 'pointer' : 'default',
                      ...(bordered && {
                        borderLeft: '1px solid #e2e8f0',
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
            {data.map((row, rowIndex) => {
              const rowId = row[expandableRowKey];
              const isExpanded = expandedRows.has(rowId);
              const details = rowDetails[rowId] || [];
              const columnsToUse = detailColumns || columns;
              
              return (
                <React.Fragment key={rowIndex}>
                  {/* Main row */}
                  <tr
                    style={{
                      ...styles.dataRow,
                      ...(striped && rowIndex % 2 === 1 && styles.stripedRow),
                      cursor: 'pointer',
                    }}
                    onClick={() => handleRowToggle(rowId)}
                  >
                    <td style={{...styles.dataCell, textAlign: 'center', width: '40px'}}>
                      <span style={styles.expandIcon}>
                        {getExpandIcon(rowId)}
                      </span>
                    </td>
                    {columns.map((column, colIndex) => (
                      <td
                        key={column.key}
                        style={{
                          ...styles.dataCell,
                          textAlign: column.align || 'right',
                          ...(bordered && {
                            borderLeft: '1px solid #e2e8f0',
                            borderBottom: '1px solid #e2e8f0',
                          }),
                        }}
                      >
                        {renderCellValue(column, row[column.key], row, rowIndex)}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Expanded detail rows - inline under each column */}
                  {isExpanded && details.map((detail, detailIndex) => (
                    <tr key={`${rowId}-detail-${detailIndex}`} style={styles.detailRow}>
                      <td style={{...styles.detailCell, textAlign: 'center'}}>
                        <span style={styles.detailIndicator}>
                          ←
                        </span>
                      </td>
                      {columnsToUse.map((column, colIndex) => (
                        <td
                          key={column.key}
                          style={{
                            ...styles.detailCell,
                            textAlign: column.align || 'right',
                            ...(bordered && {
                              borderLeft: '1px solid #e2e8f0',
                              borderBottom: detailIndex === details.length - 1 ? '1px solid #cbd5e0' : '1px solid #f1f5f9',
                            }),
                          }}
                        >
                          {getRowDetailValue(column, detail)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  
                  {/* Empty state for expanded row with no details */}
                  {isExpanded && details.length === 0 && (
                    <tr style={styles.detailRow}>
                      <td style={{...styles.detailCell, textAlign: 'center'}}>
                        <span style={styles.detailIndicator}>←</span>
                      </td>
                      <td 
                        colSpan={columnsToUse.length} 
                        style={{
                          ...styles.detailCell,
                          textAlign: 'center',
                          fontStyle: 'italic',
                          color: '#718096',
                        }}
                      >
                        אין פריטים להצגה
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          {showFooter && footerData && (
            <tfoot>
              <tr style={styles.footerRow}>
                <td style={{...styles.footerCell, textAlign: 'center'}}>
                  {/* Empty cell for expand/collapse column */}
                </td>
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    style={{
                      ...styles.footerCell,
                      textAlign: column.align || 'right',
                      ...(bordered && {
                        borderLeft: '1px solid #e2e8f0',
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
  expandIcon: {
    fontSize: '14px',
    color: '#4a5568',
    userSelect: 'none',
  },
  fundDetailRow: {
    backgroundColor: '#f8fafc',
    borderLeft: '3px solid #4299e1',
    position: 'relative',
  },
  fundDetailCell: {
    padding: '8px 16px',
    color: '#4a5568',
    fontSize: '13px',
    fontStyle: 'italic',
    paddingRight: '24px', // Extra padding for the visual indicator
  },
  fundDetailIndicator: {
    fontSize: '16px',
    color: '#4299e1',
    fontWeight: 'bold',
    marginLeft: '4px',
  },
  detailRow: {
    backgroundColor: '#f8fafc',
    borderLeft: '3px solid #4299e1',
    position: 'relative',
  },
  detailCell: {
    padding: '8px 16px',
    color: '#4a5568',
    fontSize: '13px',
    fontStyle: 'italic',
    paddingRight: '24px', // Extra padding for the visual indicator
  },
  detailIndicator: {
    fontSize: '16px',
    color: '#4299e1',
    fontWeight: 'bold',
    marginLeft: '4px',
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