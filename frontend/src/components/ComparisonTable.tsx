import { useState, useEffect, useRef } from 'react';
import { IncomeComparison } from '../types';
import { useStickyTableHeader } from '../hooks/useStickyTableHeader';

interface ComparisonTableProps {
  comparisons: IncomeComparison[];
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
  render: (comparison: IncomeComparison) => React.ReactNode;
}

const STATUS_COLORS = {
  'not-received': '#EF4444',    // Red
  'partial': '#F59E0B',         // Orange
  'full': '#10B981',            // Green
  'exceeded': '#10B981',        // Green
};

const STATUS_LABELS = {
  'not-received': 'לא התקבל',
  'partial': 'התקבל חלקית',
  'full': 'התקבל במלואו',
  'exceeded': 'התקבל יותר מהצפוי',
};

export default function ComparisonTable({ comparisons }: ComparisonTableProps) {
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

  const getFilteredComparisons = () => {
    let filtered = comparisons;

    Object.keys(filterState).forEach((columnKey) => {
      const filterValues = filterState[columnKey];
      if (filterValues.length === 0) return;

      filtered = filtered.filter((comparison) => {
        let value: string;
        
        switch (columnKey) {
          case 'source':
            value = comparison.source_name || '';
            break;
          case 'status':
            value = STATUS_LABELS[comparison.status];
            break;
          default:
            return true;
        }

        return filterValues.includes(value);
      });
    });

    return filtered;
  };

  const getSortedComparisons = () => {
    const filtered = getFilteredComparisons();

    if (!sortState.column || !sortState.direction) {
      return filtered;
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortState.column) {
        case 'source':
          aValue = a.source_name || '';
          bValue = b.source_name || '';
          break;
        case 'expected':
          aValue = a.expected_amount;
          bValue = b.expected_amount;
          break;
        case 'actual':
          aValue = a.actual_amount;
          bValue = b.actual_amount;
          break;
        case 'difference':
          aValue = a.difference;
          bValue = b.difference;
          break;
        case 'status':
          // Sort by status priority: not-received, partial, full, exceeded
          const statusOrder = { 'not-received': 0, 'partial': 1, 'full': 2, 'exceeded': 3 };
          aValue = statusOrder[a.status];
          bValue = statusOrder[b.status];
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
    
    comparisons.forEach((comparison) => {
      let value: string;
      
      switch (columnKey) {
        case 'source':
          value = comparison.source_name || '';
          break;
        case 'status':
          value = STATUS_LABELS[comparison.status];
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
  
  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const columns: Column[] = [
    {
      key: 'source',
      label: 'מקור',
      sortable: true,
      filterable: true,
      render: (comparison: IncomeComparison) => (
        <span style={styles.sourceName}>{comparison.source_name || '-'}</span>
      ),
    },
    {
      key: 'expected',
      label: 'צפוי',
      sortable: true,
      filterable: false,
      render: (comparison: IncomeComparison) => (
        <span style={styles.amount}>{formatCurrency(comparison.expected_amount)}</span>
      ),
    },
    {
      key: 'actual',
      label: 'בפועל',
      sortable: true,
      filterable: false,
      render: (comparison: IncomeComparison) => (
        <span style={styles.amount}>{formatCurrency(comparison.actual_amount)}</span>
      ),
    },
    {
      key: 'difference',
      label: 'פער',
      sortable: true,
      filterable: false,
      render: (comparison: IncomeComparison) => (
        <span
          style={{
            ...styles.difference,
            color: comparison.difference >= 0 ? '#10B981' : '#EF4444',
          }}
        >
          {comparison.difference >= 0 ? '+' : ''}{formatCurrency(comparison.difference)}
          <br />
          <span style={styles.percentage}>
            ({formatPercentage(comparison.percentage)})
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'סטטוס',
      sortable: true,
      filterable: true,
      render: (comparison: IncomeComparison) => (
        <span
          style={{
            ...styles.statusBadge,
            backgroundColor: STATUS_COLORS[comparison.status],
          }}
        >
          {STATUS_LABELS[comparison.status]}
        </span>
      ),
    },
  ];

  if (comparisons.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>אין נתוני השוואה להצגה</p>
      </div>
    );
  }

  const sortedComparisons = getSortedComparisons();

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
          {sortedComparisons.map((comparison, index) => (
            <tr 
              key={`${comparison.source_name}-${index}`} 
              style={{
                ...styles.row,
                backgroundColor: getRowBackgroundColor(comparison.status),
              }}
              className="table-row"
            >
              {columns.map((column) => (
                <td key={column.key} style={styles.cell}>
                  {column.render(comparison)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper function to get row background color based on status
function getRowBackgroundColor(status: IncomeComparison['status']): string {
  switch (status) {
    case 'not-received':
      return '#FEE2E2'; // Light red
    case 'partial':
      return '#FEF3C7'; // Light orange
    case 'full':
    case 'exceeded':
      return '#D1FAE5'; // Light green
    default:
      return 'white';
  }
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
    opacity: 0.9;
  }
`;
if (!document.head.querySelector('style[data-comparison-table]')) {
  tableHoverStyle.setAttribute('data-comparison-table', 'true');
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
  sourceName: {
    fontWeight: '600',
    color: '#2d3748',
  },
  amount: {
    fontWeight: '600',
    color: '#2d3748',
  },
  difference: {
    fontWeight: '600',
    fontSize: '14px',
  },
  percentage: {
    fontSize: '12px',
    fontWeight: '500',
  },
  statusBadge: {
    padding: '6px 14px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white',
    display: 'inline-block',
    whiteSpace: 'nowrap',
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
