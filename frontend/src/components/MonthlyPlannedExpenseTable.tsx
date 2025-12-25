import { useState, useEffect, useRef } from 'react';
import { MonthlyPlannedExpenseDetail } from '../types';
import { useStickyTableHeader } from '../hooks/useStickyTableHeader';

interface MonthlyPlannedExpenseTableProps {
  plannedExpenses: MonthlyPlannedExpenseDetail[];
  onViewDetails?: (expense: MonthlyPlannedExpenseDetail) => void;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

interface FilterState {
  [key: string]: string[];
}

interface Column {
  key: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
  render: (expense: MonthlyPlannedExpenseDetail) => React.ReactNode;
}

export default function MonthlyPlannedExpenseTable({
  plannedExpenses,
  onViewDetails,
}: MonthlyPlannedExpenseTableProps) {
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });
  const [filterState, setFilterState] = useState<FilterState>({});
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const { tableClassName, headerCellRef } = useStickyTableHeader();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        setActiveFilterColumn(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = (columnKey: string, sortable: boolean) => {
    if (!sortable) return;

    let newDirection: SortDirection = 'asc';
    
    if (sortState.column === columnKey) {
      if (sortState.direction === 'asc') {
        newDirection = 'desc';
      } else if (sortState.direction === 'desc') {
        newDirection = null;
      }
    }

    setSortState({
      column: newDirection ? columnKey : null,
      direction: newDirection,
    });
  };

  const getFilteredExpenses = () => {
    let filtered = plannedExpenses;

    Object.keys(filterState).forEach((columnKey) => {
      const filterValues = filterState[columnKey];
      if (filterValues.length === 0) return;

      filtered = filtered.filter((expense) => {
        let value: string;
        
        switch (columnKey) {
          case 'user':
            value = expense.userName || '';
            break;
          case 'description':
            value = expense.description;
            break;
          case 'status':
            value = getStatusLabel(expense.status);
            break;
          default:
            return true;
        }

        return filterValues.includes(value);
      });
    });

    return filtered;
  };

  const getSortedExpenses = () => {
    const filtered = getFilteredExpenses();

    if (!sortState.column || !sortState.direction) {
      return filtered;
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortState.column) {
        case 'user':
          aValue = a.userName || '';
          bValue = b.userName || '';
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'planned_date':
          aValue = new Date(a.plannedDate).getTime();
          bValue = new Date(b.plannedDate).getTime();
          break;
        case 'status':
          aValue = getStatusLabel(a.status);
          bValue = getStatusLabel(b.status);
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortState.direction === 'asc' 
          ? aValue.localeCompare(bValue, 'he')
          : bValue.localeCompare(aValue, 'he');
      } else {
        return sortState.direction === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
    });

    return sorted;
  };

  const getUniqueValues = (columnKey: string): string[] => {
    const values = new Set<string>();
    
    plannedExpenses.forEach((expense) => {
      let value: string;
      
      switch (columnKey) {
        case 'user':
          value = expense.userName || '';
          break;
        case 'description':
          value = expense.description;
          break;
        case 'status':
          value = getStatusLabel(expense.status);
          break;
        default:
          return;
      }
      
      if (value) values.add(value);
    });
    
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'he'));
  };

  const handleFilterToggle = (columnKey: string) => {
    setActiveFilterColumn(activeFilterColumn === columnKey ? null : columnKey);
  };

  const handleFilterChange = (columnKey: string, value: string) => {
    setFilterState((prev) => {
      const currentFilters = prev[columnKey] || [];
      const newFilters = currentFilters.includes(value)
        ? currentFilters.filter((v) => v !== value)
        : [...currentFilters, value];
      
      if (newFilters.length === 0) {
        const { [columnKey]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [columnKey]: newFilters };
    });
  };

  const clearAllFilters = () => {
    setFilterState({});
    setActiveFilterColumn(null);
  };

  const hasActiveFilters = Object.keys(filterState).length > 0;
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      'planned': 'מתוכנן',
      'executed': 'בוצע',
      'cancelled': 'בוטל',
    };
    return statusMap[status] || status;
  };

  const getStatusStyle = (status: string): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block',
    };

    switch (status) {
      case 'planned':
        return { ...baseStyle, background: '#fef5e7', color: '#d68910' };
      case 'executed':
        return { ...baseStyle, background: '#d1f2eb', color: '#2f855a' };
      case 'cancelled':
        return { ...baseStyle, background: '#f8d7da', color: '#c53030' };
      default:
        return { ...baseStyle, background: '#e2e8f0', color: '#4a5568' };
    }
  };

  const columns: Column[] = [
    {
      key: 'user',
      label: 'משתמש',
      sortable: true,
      filterable: true,
      render: (expense: MonthlyPlannedExpenseDetail) => (
        <span>{expense.userName || '-'}</span>
      ),
    },
    {
      key: 'description',
      label: 'תיאור',
      sortable: false,
      filterable: true,
      render: (expense: MonthlyPlannedExpenseDetail) => (
        <span style={styles.description} title={expense.description}>
          {expense.description}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'סכום',
      sortable: true,
      filterable: false,
      render: (expense: MonthlyPlannedExpenseDetail) => (
        <span style={styles.amount}>{formatCurrency(expense.amount)}</span>
      ),
    },
    {
      key: 'planned_date',
      label: 'תאריך מתוכנן',
      sortable: true,
      filterable: false,
      render: (expense: MonthlyPlannedExpenseDetail) => (
        <span>{formatDate(expense.plannedDate)}</span>
      ),
    },
    {
      key: 'status',
      label: 'סטטוס',
      sortable: true,
      filterable: true,
      render: (expense: MonthlyPlannedExpenseDetail) => (
        <span style={getStatusStyle(expense.status)}>
          {getStatusLabel(expense.status)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'פעולות',
      sortable: false,
      filterable: false,
      render: (expense: MonthlyPlannedExpenseDetail) => (
        <div style={styles.actionsCell}>
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(expense)}
              style={styles.actionBtn}
              className="action-btn details-btn"
              title="פרטים"
              aria-label="הצג פרטים"
            >
              👁️
            </button>
          )}
        </div>
      ),
    },
  ];

  if (plannedExpenses.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>אין הוצאות מתוכננות להצגה לחודש זה</p>
      </div>
    );
  }

  const sortedExpenses = getSortedExpenses();

  return (
    <div style={styles.tableContainer} ref={tableRef}>
      {hasActiveFilters && (
        <div style={styles.filterBar}>
          <span style={styles.filterBarText}>
            סינונים פעילים: {Object.keys(filterState).length}
          </span>
          <button onClick={clearAllFilters} style={styles.clearFiltersBtn} className="clear-filters-btn">
            נקה סינונים
          </button>
        </div>
      )}
      <table style={styles.table} className={tableClassName}>
        <thead>
          <tr style={styles.headerRow}>
            {columns.map((column, columnIndex) => (
              <th 
                key={column.key} 
                style={styles.headerCell}
                ref={columnIndex === 0 ? headerCellRef : undefined}
              >
                <div style={styles.headerContent}>
                  <div 
                    style={{
                      ...styles.headerLabelContainer,
                      ...(column.sortable ? styles.sortableHeader : {}),
                    }}
                    onClick={() => handleSort(column.key, column.sortable)}
                  >
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span style={styles.sortIcon}>
                        {sortState.column === column.key ? (
                          sortState.direction === 'asc' ? '▲' : '▼'
                        ) : (
                          '⇅'
                        )}
                      </span>
                    )}
                  </div>
                  {column.filterable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFilterToggle(column.key);
                      }}
                      style={{
                        ...styles.filterBtn,
                        ...(filterState[column.key]?.length > 0 ? styles.filterBtnActive : {}),
                      }}
                      className="filter-btn"
                      title="סנן"
                    >
                      ⏷
                    </button>
                  )}
                  {column.filterable && activeFilterColumn === column.key && (
                    <div 
                      style={styles.filterDropdown}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getUniqueValues(column.key).map((value) => (
                        <label key={value} style={styles.filterOption} className="filter-option">
                          <input
                            type="checkbox"
                            checked={filterState[column.key]?.includes(value) || false}
                            onChange={() => handleFilterChange(column.key, value)}
                            style={styles.filterCheckbox}
                          />
                          <span>{value}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedExpenses.map((expense) => (
            <tr key={expense.id} style={styles.row} className="table-row">
              {columns.map((column) => (
                <td key={column.key} style={styles.cell}>
                  {column.render(expense)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Add hover styles
const tableHoverStyle = document.createElement('style');
tableHoverStyle.textContent = `
  .filter-option:hover {
    background: #f7fafc;
  }
  .clear-filters-btn:hover {
    background: #5568d3;
  }
  .filter-btn:hover {
    background: #edf2f7;
  }
  .table-row:hover {
    background: #f7fafc;
  }
  .action-btn:hover {
    transform: scale(1.1);
  }
  .details-btn:hover {
    background: #718096 !important;
  }
`;
if (!document.head.querySelector('style[data-monthly-planned-expense-table]')) {
  tableHoverStyle.setAttribute('data-monthly-planned-expense-table', 'true');
  document.head.appendChild(tableHoverStyle);
}

const styles: Record<string, React.CSSProperties> = {
  tableContainer: {
    overflowX: 'auto',
    overflowY: 'visible',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    position: 'relative',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  headerRow: {
    background: '#f7fafc',
    borderBottom: '2px solid #e2e8f0',
  },
  headerCell: {
    padding: '12px 16px',
    textAlign: 'right',
    fontWeight: '600',
    color: '#2d3748',
    whiteSpace: 'nowrap',
  },
  sortableHeader: {
    cursor: 'pointer',
    userSelect: 'none',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  sortIcon: {
    fontSize: '12px',
    color: '#718096',
  },
  headerLabelContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#edf2f7',
    borderBottom: '1px solid #e2e8f0',
  },
  filterBarText: {
    fontSize: '14px',
    color: '#4a5568',
    fontWeight: '600',
  },
  clearFiltersBtn: {
    padding: '6px 12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'background 0.2s',
  },
  filterBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  filterBtnActive: {
    background: '#667eea',
    color: 'white',
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 10,
    minWidth: '200px',
    maxHeight: '300px',
    overflowY: 'auto',
    marginTop: '4px',
  },
  filterOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    fontSize: '14px',
  },
  filterCheckbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  row: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'all 0.2s ease',
  },
  cell: {
    padding: '12px 16px',
    textAlign: 'right',
    color: '#4a5568',
  },
  description: {
    maxWidth: '250px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'inline-block',
  },
  amount: {
    fontWeight: '600',
    color: '#2d3748',
  },
  actionsCell: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionBtn: {
    padding: '6px 10px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
    background: '#e2e8f0',
    minWidth: '32px',
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#718096',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
};
