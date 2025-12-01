import { useState, useEffect, useRef } from 'react';
import { Reimbursement, ReimbursementStatus } from '../types';

interface ReimbursementTableProps {
  reimbursements: Reimbursement[];
  status: ReimbursementStatus;
  onSelect: (ids: number[]) => void;
  selectedIds: number[];
  onAction: (action: string, ids: number[]) => void;
  showTransferInfo?: boolean;
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
  render: (reimbursement: Reimbursement) => React.ReactNode;
}

export default function ReimbursementTable({
  reimbursements,
  status,
  onSelect,
  selectedIds,
  onAction,
  showTransferInfo = false,
}: ReimbursementTableProps) {
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
  
  const handleSelectAll = () => {
    if (selectedIds.length === reimbursements.length) {
      // Deselect all
      onSelect([]);
    } else {
      // Select all
      onSelect(reimbursements.map(r => r.id));
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      // Deselect
      onSelect(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      // Select
      onSelect([...selectedIds, id]);
    }
  };

  const isAllSelected = reimbursements.length > 0 && selectedIds.length === reimbursements.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < reimbursements.length;

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

  const getFilteredReimbursements = () => {
    let filtered = reimbursements;

    Object.keys(filterState).forEach((columnKey) => {
      const filterValues = filterState[columnKey];
      if (filterValues.length === 0) return;

      filtered = filtered.filter((reimbursement) => {
        let value: string;
        
        switch (columnKey) {
          case 'submitter':
            value = reimbursement.user_name || '';
            break;
          case 'recipient':
            value = reimbursement.recipient_name || reimbursement.user_name || '';
            break;
          case 'fund':
            value = reimbursement.fund_name || '';
            break;
          case 'description':
            value = reimbursement.description;
            break;
          default:
            return true;
        }

        return filterValues.includes(value);
      });
    });

    return filtered;
  };

  const getSortedReimbursements = () => {
    const filtered = getFilteredReimbursements();

    if (!sortState.column || !sortState.direction) {
      return filtered;
    }

    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortState.column) {
        case 'submitter':
          aValue = a.user_name || '';
          bValue = b.user_name || '';
          break;
        case 'recipient':
          aValue = a.recipient_name || a.user_name || '';
          bValue = b.recipient_name || b.user_name || '';
          break;
        case 'fund':
          aValue = a.fund_name || '';
          bValue = b.fund_name || '';
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'expense_date':
          aValue = new Date(a.expense_date).getTime();
          bValue = new Date(b.expense_date).getTime();
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
    
    reimbursements.forEach((reimbursement) => {
      let value: string;
      
      switch (columnKey) {
        case 'submitter':
          value = reimbursement.user_name || '';
          break;
        case 'recipient':
          value = reimbursement.recipient_name || reimbursement.user_name || '';
          break;
        case 'fund':
          value = reimbursement.fund_name || '';
          break;
        case 'description':
          value = reimbursement.description;
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
  const hasMultipleSelected = selectedIds.length > 1;
  
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

  const baseColumns: Column[] = [
    {
      key: 'checkbox',
      label: '',
      sortable: false,
      filterable: false,
      render: (reimbursement: Reimbursement) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(reimbursement.id)}
          onChange={() => handleSelectOne(reimbursement.id)}
          style={styles.checkbox}
        />
      ),
    },
    {
      key: 'submitter',
      label: 'מגיש',
      sortable: true,
      filterable: true,
      render: (reimbursement: Reimbursement) => (
        <span>{reimbursement.user_name || '-'}</span>
      ),
    },
    {
      key: 'recipient',
      label: 'מקבל תשלום',
      sortable: true,
      filterable: true,
      render: (reimbursement: Reimbursement) => (
        <span style={reimbursement.recipient_user_id && reimbursement.recipient_user_id !== reimbursement.user_id ? styles.differentRecipient : {}}>
          {reimbursement.recipient_name || reimbursement.user_name || '-'}
        </span>
      ),
    },
    {
      key: 'fund',
      label: 'סעיף',
      sortable: true,
      filterable: true,
      render: (reimbursement: Reimbursement) => (
        <span>{reimbursement.fund_name || '-'}</span>
      ),
    },
    {
      key: 'description',
      label: 'תיאור',
      sortable: false,
      filterable: true,
      render: (reimbursement: Reimbursement) => (
        <span style={styles.description}>{reimbursement.description}</span>
      ),
    },
    {
      key: 'amount',
      label: 'סכום',
      sortable: true,
      filterable: false,
      render: (reimbursement: Reimbursement) => (
        <span style={styles.amount}>{formatCurrency(reimbursement.amount)}</span>
      ),
    },
    {
      key: 'expense_date',
      label: 'תאריך הוצאה',
      sortable: true,
      filterable: false,
      render: (reimbursement: Reimbursement) => (
        <span>{formatDate(reimbursement.expense_date)}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'תאריך הגשה',
      sortable: true,
      filterable: false,
      render: (reimbursement: Reimbursement) => (
        <span>{formatDate(reimbursement.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'פעולות',
      sortable: false,
      filterable: false,
      render: (reimbursement: Reimbursement) => {
        const handleSingleAction = (action: string, id: number) => {
          if (hasMultipleSelected) {
            alert('לא ניתן לבצע פעולות על החזר יחיד כאשר מסומנים מספר החזרים. אנא בטל את הבחירה המרובה או השתמש בכפתורי הפעולות המרובות.');
            return;
          }
          onAction(action, [id]);
        };

        return (
          <div style={styles.actionsCell}>
            {/* Receipt button */}
            {reimbursement.receipt_url && (
              <button
                onClick={() => {
                  if (hasMultipleSelected) {
                    alert('לא ניתן לבצע פעולות על החזר יחיד כאשר מסומנים מספר החזרים. אנא בטל את הבחירה המרובה או השתמש בכפתורי הפעולות המרובות.');
                    return;
                  }
                  window.open(reimbursement.receipt_url, '_blank');
                }}
                style={{
                  ...styles.actionBtn,
                  ...(hasMultipleSelected ? styles.disabledBtn : {}),
                }}
                className={`action-btn receipt-btn ${hasMultipleSelected ? 'disabled' : ''}`}
                title={hasMultipleSelected ? 'לא זמין בבחירה מרובה' : 'צפה בקבלה'}
                aria-label="צפה בקבלה"
              >
                📄
              </button>
            )}
            
            {/* Details button */}
            <button
              onClick={() => handleSingleAction('details', reimbursement.id)}
              style={{
                ...styles.actionBtn,
                ...(hasMultipleSelected ? styles.disabledBtn : {}),
              }}
              className={`action-btn details-btn ${hasMultipleSelected ? 'disabled' : ''}`}
              title={hasMultipleSelected ? 'לא זמין בבחירה מרובה' : 'פרטים'}
              aria-label="הצג פרטים"
            >
              👁️
            </button>

            {/* Status-specific action buttons - show all relevant actions */}
            {status !== 'paid' && (
              <>
                {/* For rejected items, only show return to pending */}
                {status === 'rejected' ? (
                  <button
                    onClick={() => handleSingleAction('return-pending', reimbursement.id)}
                    style={{
                      ...styles.actionBtn,
                      ...styles.returnBtn,
                      ...(hasMultipleSelected ? styles.disabledBtn : {}),
                    }}
                    className={`action-btn return-btn ${hasMultipleSelected ? 'disabled' : ''}`}
                    title={hasMultipleSelected ? 'לא זמין בבחירה מרובה' : 'החזר לממתין'}
                    aria-label="החזר לממתין"
                  >
                    ↩️
                  </button>
                ) : (
                  <>
                    {status !== 'approved' && (
                      <button
                        onClick={() => handleSingleAction('approve', reimbursement.id)}
                        style={{
                          ...styles.actionBtn,
                          ...styles.approveBtn,
                          ...(hasMultipleSelected ? styles.disabledBtn : {}),
                        }}
                        className={`action-btn approve-btn ${hasMultipleSelected ? 'disabled' : ''}`}
                        title={hasMultipleSelected ? 'לא זמין בבחירה מרובה' : 'אשר החזר'}
                        aria-label="אשר החזר"
                      >
                        ✓
                      </button>
                    )}
                    {status !== 'under_review' && (
                      <button
                        onClick={() => handleSingleAction('mark-review', reimbursement.id)}
                        style={{
                          ...styles.actionBtn,
                          ...styles.reviewBtn,
                          ...(hasMultipleSelected ? styles.disabledBtn : {}),
                        }}
                        className={`action-btn review-btn ${hasMultipleSelected ? 'disabled' : ''}`}
                        title={hasMultipleSelected ? 'לא זמין בבחירה מרובה' : 'סמן לבדיקה'}
                        aria-label="סמן לבדיקה"
                      >
                        🔍
                      </button>
                    )}
                    {status !== 'pending' && (
                      <button
                        onClick={() => handleSingleAction('return-pending', reimbursement.id)}
                        style={{
                          ...styles.actionBtn,
                          ...styles.returnBtn,
                          ...(hasMultipleSelected ? styles.disabledBtn : {}),
                        }}
                        className={`action-btn return-btn ${hasMultipleSelected ? 'disabled' : ''}`}
                        title={hasMultipleSelected ? 'לא זמין בבחירה מרובה' : 'החזר לממתין'}
                        aria-label="החזר לממתין"
                      >
                        ↩️
                      </button>
                    )}
                    <button
                      onClick={() => handleSingleAction('reject', reimbursement.id)}
                      style={{
                        ...styles.actionBtn,
                        ...styles.rejectBtn,
                        ...(hasMultipleSelected ? styles.disabledBtn : {}),
                      }}
                      className={`action-btn reject-btn ${hasMultipleSelected ? 'disabled' : ''}`}
                      title={hasMultipleSelected ? 'לא זמין בבחירה מרובה' : 'דחה החזר'}
                      aria-label="דחה החזר"
                    >
                      ✗
                    </button>
                  </>
                )}
              </>
            )}

            {/* Show rejection reason for rejected items */}
            {status === 'rejected' && reimbursement.notes && (
              <span style={styles.rejectionNote} title={reimbursement.notes}>
                סיבה: {reimbursement.notes}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  // Build final columns array with optional transfer info column
  const columns: Column[] = [...baseColumns];
  
  // Insert transfer info column before actions if showTransferInfo is true
  if (showTransferInfo) {
    const actionsColumn = columns.pop(); // Remove actions column temporarily
    columns.push({
      key: 'transfer_info',
      label: 'העברה',
      sortable: false,
      filterable: false,
      render: (reimbursement: Reimbursement) => (
        <div style={styles.transferInfo}>
          {reimbursement.payment_transfer_id ? (
            <>
              <span style={styles.transferId}>#{reimbursement.payment_transfer_id}</span>
              <br />
              <span style={styles.transferRecipient}>{reimbursement.recipient_name || reimbursement.user_name}</span>
            </>
          ) : (
            <span style={styles.noTransfer}>-</span>
          )}
        </div>
      ),
    });
    if (actionsColumn) columns.push(actionsColumn); // Add actions column back
  }

  if (reimbursements.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>אין החזרים להצגה</p>
      </div>
    );
  }

  const sortedReimbursements = getSortedReimbursements();

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
                {column.key === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = isSomeSelected;
                      }
                    }}
                    onChange={handleSelectAll}
                    style={styles.checkbox}
                    title={isAllSelected ? 'בטל בחירת הכל' : 'סמן הכל'}
                  />
                ) : (
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
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedReimbursements.map((reimbursement) => (
            <tr key={reimbursement.id} style={styles.row} className="table-row">
              {columns.map((column) => (
                <td key={column.key} style={styles.cell}>
                  {column.render(reimbursement)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Add hover styles for filter options and action buttons
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
  .action-btn:not(.disabled):hover {
    transform: scale(1.1);
  }
  .approve-btn:not(.disabled):hover {
    background: #38a169 !important;
  }
  .reject-btn:not(.disabled):hover {
    background: #c53030 !important;
  }
  .review-btn:not(.disabled):hover {
    background: #d69e2e !important;
  }
  .return-btn:not(.disabled):hover {
    background: #4299e1 !important;
  }
  .paid-btn:not(.disabled):hover {
    background: #38a169 !important;
  }
  .details-btn:not(.disabled):hover {
    background: #718096 !important;
  }
  .receipt-btn:not(.disabled):hover {
    background: #667eea !important;
  }
  .action-btn.disabled {
    cursor: not-allowed !important;
    opacity: 0.4 !important;
  }
`;
if (!document.head.querySelector('style[data-reimbursement-table]')) {
  tableHoverStyle.setAttribute('data-reimbursement-table', 'true');
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
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  differentRecipient: {
    color: '#667eea',
    fontWeight: '600',
  },
  description: {
    maxWidth: '200px',
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
  approveBtn: {
    background: '#48bb78',
    color: 'white',
  },
  rejectBtn: {
    background: '#e53e3e',
    color: 'white',
  },
  reviewBtn: {
    background: '#ecc94b',
    color: 'white',
  },
  returnBtn: {
    background: '#4299e1',
    color: 'white',
  },
  paidBtn: {
    background: '#48bb78',
    color: 'white',
  },
  rejectionNote: {
    fontSize: '12px',
    color: '#e53e3e',
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
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
  transferInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  transferId: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#667eea',
  },
  transferRecipient: {
    fontSize: '11px',
    color: '#718096',
  },
  noTransfer: {
    color: '#cbd5e0',
  },
  disabledBtn: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
};
