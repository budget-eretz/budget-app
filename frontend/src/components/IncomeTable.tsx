import { useState, useEffect, useRef } from 'react';
import { Income } from '../types';

interface IncomeTableProps {
  incomes: Income[];
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  canEdit?: boolean;
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
  render: (income: Income) => React.ReactNode;
}

export default function IncomeTable({
  incomes,
  onEdit,
  onDelete,
  canEdit = false,
}: IncomeTableProps) {
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });
  const [filterState, setFilterState] = useState<FilterState>({});
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

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

  const getFilteredIncomes = () => {
    let filtered = incomes;

    Object.keys(filterState).forEach((columnKey) => {
      const filterValues = filterState[columnKey];
      if (filterValues.length === 0) return;

      filtered = filtered.filter((income) => {
        let value: string;
        
        switch (columnKey) {
          case 'source':
            value = income.source || '';
            break;
          case 'description':
            value = income.description || '';
            break;
          case 'categories':
            // Filter by category names
            const categoryNames = income.categories?.map(c => c.name) || [];
            return filterValues.some(fv => categoryNames.includes(fv));
          default:
            return true;
        }

        return filterValues.includes(value);
      });
    });

    return filtered;
  };

  const getSortedIncomes = () => {
    const filtered = getFilteredIncomes();

    if (!sortState.column || !sortState.direction) {
      return filtered;
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortState.column) {
        case 'source':
          aValue = a.source || '';
          bValue = b.source || '';
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'income_date':
          aValue = new Date(a.income_date).getTime();
          bValue = new Date(b.income_date).getTime();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
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
    
    incomes.forEach((income) => {
      let value: string;
      
      switch (columnKey) {
        case 'source':
          value = income.source || '';
          break;
        case 'description':
          value = income.description || '';
          break;
        case 'categories':
          income.categories?.forEach(cat => values.add(cat.name));
          return;
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
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const columns: Column[] = [
    {
      key: 'income_date',
      label: 'תאריך',
      sortable: true,
      filterable: false,
      render: (income: Income) => (
        <span>{formatDate(income.income_date)}</span>
      ),
    },
    {
      key: 'source',
      label: 'מקור',
      sortable: true,
      filterable: true,
      render: (income: Income) => (
        <span>{income.source || '-'}</span>
      ),
    },
    {
      key: 'description',
      label: 'תיאור',
      sortable: false,
      filterable: true,
      render: (income: Income) => (
        <span style={styles.description}>{income.description || '-'}</span>
      ),
    },
    {
      key: 'amount',
      label: 'סכום',
      sortable: true,
      filterable: false,
      render: (income: Income) => (
        <span style={styles.amount}>{formatCurrency(income.amount)}</span>
      ),
    },
    {
      key: 'categories',
      label: 'קטגוריות',
      sortable: false,
      filterable: true,
      render: (income: Income) => (
        <div style={styles.categoriesCell}>
          {income.categories && income.categories.length > 0 ? (
            income.categories.map((category) => (
              <span
                key={category.id}
                style={{
                  ...styles.categoryBadge,
                  backgroundColor: category.color || '#e2e8f0',
                  color: getContrastColor(category.color || '#e2e8f0'),
                }}
              >
                {category.name}
              </span>
            ))
          ) : (
            <span style={styles.noCategories}>-</span>
          )}
        </div>
      ),
    },
  ];

  // Add actions column if canEdit is true
  if (canEdit && (onEdit || onDelete)) {
    columns.push({
      key: 'actions',
      label: 'פעולות',
      sortable: false,
      filterable: false,
      render: (income: Income) => (
        <div style={styles.actionsCell}>
          {onEdit && (
            <button
              onClick={() => onEdit(income.id)}
              style={styles.actionBtn}
              className="action-btn edit-btn"
              title="ערוך"
              aria-label="ערוך הכנסה"
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(income.id)}
              style={{ ...styles.actionBtn, ...styles.deleteBtn }}
              className="action-btn delete-btn"
              title="מחק"
              aria-label="מחק הכנסה"
            >
              🗑️
            </button>
          )}
        </div>
      ),
    });
  }

  if (incomes.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>אין הכנסות להצגה</p>
      </div>
    );
  }

  const sortedIncomes = getSortedIncomes();

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
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            {columns.map((column) => (
              <th 
                key={column.key} 
                style={{
                  ...styles.headerCell,
                  position: 'relative',
                }}
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
          {sortedIncomes.map((income) => (
            <tr key={income.id} style={styles.row} className="table-row">
              {columns.map((column) => (
                <td key={column.key} style={styles.cell}>
                  {column.render(income)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper function to determine text color based on background
function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff';
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
  .edit-btn:hover {
    background: #4299e1 !important;
  }
  .delete-btn:hover {
    background: #c53030 !important;
  }
`;
if (!document.head.querySelector('style[data-income-table]')) {
  tableHoverStyle.setAttribute('data-income-table', 'true');
  document.head.appendChild(tableHoverStyle);
}

const styles: Record<string, React.CSSProperties> = {
  tableContainer: {
    overflowX: 'auto',
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
  categoriesCell: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  categoryBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  noCategories: {
    color: '#cbd5e0',
    fontSize: '14px',
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
  deleteBtn: {
    background: '#e53e3e',
    color: 'white',
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
