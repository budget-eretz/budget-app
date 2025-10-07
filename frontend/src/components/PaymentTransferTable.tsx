import { useState } from 'react';
import { PaymentTransfer } from '../types';

interface PaymentTransferTableProps {
  transfers: PaymentTransfer[];
  onTransferClick: (transfer: PaymentTransfer) => void;
  onExecute?: (transferId: number) => void;
  showExecuteAction: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

interface Column {
  key: string;
  label: string;
  sortable: boolean;
  render: (transfer: PaymentTransfer) => React.ReactNode;
}

export default function PaymentTransferTable({
  transfers,
  onTransferClick,
  onExecute,
  showExecuteAction,
}: PaymentTransferTableProps) {
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });

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

  const getSortedTransfers = () => {
    if (!sortState.column || !sortState.direction) {
      return transfers;
    }

    const sorted = [...transfers].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortState.column) {
        case 'recipient':
          aValue = a.recipientName || '';
          bValue = b.recipientName || '';
          break;
        case 'budgetType':
          aValue = a.budgetType === 'circle' ? 'מעגלי' : 'קבוצתי';
          bValue = b.budgetType === 'circle' ? 'מעגלי' : 'קבוצתי';
          break;
        case 'count':
          aValue = a.reimbursementCount;
          bValue = b.reimbursementCount;
          break;
        case 'amount':
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'status':
          aValue = a.status === 'pending' ? 'ממתין' : 'בוצע';
          bValue = b.status === 'pending' ? 'ממתין' : 'בוצע';
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount: number | undefined) => {
    const value = amount || 0;
    return `₪${value.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getBudgetTypeLabel = (budgetType: 'circle' | 'group', groupName: string | null) => {
    if (budgetType === 'circle') {
      return 'מעגלי';
    }
    return groupName ? `קבוצתי - ${groupName}` : 'קבוצתי';
  };

  const getStatusLabel = (status: 'pending' | 'executed') => {
    return status === 'pending' ? 'ממתין לביצוע' : 'בוצע';
  };

  const columns: Column[] = [
    {
      key: 'recipient',
      label: 'מקבל תשלום',
      sortable: true,
      render: (transfer: PaymentTransfer) => (
        <span style={styles.recipientName}>{transfer.recipientName}</span>
      ),
    },
    {
      key: 'budgetType',
      label: 'סוג תקציב',
      sortable: true,
      render: (transfer: PaymentTransfer) => (
        <span style={styles.budgetType}>
          {getBudgetTypeLabel(transfer.budgetType, transfer.groupName)}
        </span>
      ),
    },
    {
      key: 'count',
      label: 'מספר החזרים',
      sortable: true,
      render: (transfer: PaymentTransfer) => (
        <span style={styles.count}>{transfer.reimbursementCount}</span>
      ),
    },
    {
      key: 'amount',
      label: 'סכום כולל',
      sortable: true,
      render: (transfer: PaymentTransfer) => (
        <span style={styles.amount}>{formatCurrency(transfer.totalAmount)}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'תאריך יצירה',
      sortable: true,
      render: (transfer: PaymentTransfer) => (
        <span>{formatDate(transfer.createdAt)}</span>
      ),
    },
    {
      key: 'status',
      label: 'סטטוס',
      sortable: true,
      render: (transfer: PaymentTransfer) => (
        <span 
          style={{
            ...styles.statusBadge,
            ...(transfer.status === 'pending' ? styles.statusPending : styles.statusExecuted),
          }}
        >
          {getStatusLabel(transfer.status)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'פעולות',
      sortable: false,
      render: (transfer: PaymentTransfer) => (
        <div style={styles.actionsCell}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTransferClick(transfer);
            }}
            style={styles.detailsBtn}
            className="action-btn details-btn"
            title="הצג פרטים"
            aria-label="הצג פרטים"
          >
            👁️
          </button>
          {showExecuteAction && transfer.status === 'pending' && onExecute && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExecute(transfer.id);
              }}
              style={styles.executeBtn}
              className="action-btn execute-btn"
              title="בצע העברה"
              aria-label="בצע העברה"
            >
              ✓
            </button>
          )}
        </div>
      ),
    },
  ];

  if (transfers.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>אין העברות להצגה</p>
      </div>
    );
  }

  const sortedTransfers = getSortedTransfers();

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            {columns.map((column) => (
              <th 
                key={column.key} 
                style={{
                  ...styles.headerCell,
                  ...(column.sortable ? styles.sortableHeader : {}),
                }}
                onClick={() => handleSort(column.key, column.sortable)}
              >
                <div style={styles.headerContent}>
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
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedTransfers.map((transfer) => (
            <tr 
              key={transfer.id} 
              style={styles.row} 
              className="table-row clickable-row"
              onClick={() => onTransferClick(transfer)}
            >
              {columns.map((column) => (
                <td key={column.key} style={styles.cell}>
                  {column.render(transfer)}
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
  .clickable-row {
    cursor: pointer;
  }
  .clickable-row:hover {
    background: #f7fafc;
  }
  .action-btn:hover {
    transform: scale(1.1);
  }
  .execute-btn:hover {
    background: #38a169 !important;
  }
  .details-btn:hover {
    background: #718096 !important;
  }
`;
if (!document.head.querySelector('style[data-payment-transfer-table]')) {
  tableHoverStyle.setAttribute('data-payment-transfer-table', 'true');
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
  row: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'all 0.2s ease',
  },
  cell: {
    padding: '12px 16px',
    textAlign: 'right',
    color: '#4a5568',
  },
  recipientName: {
    fontWeight: '600',
    color: '#2d3748',
  },
  budgetType: {
    fontSize: '13px',
    color: '#4a5568',
  },
  count: {
    fontWeight: '500',
    color: '#4a5568',
  },
  amount: {
    fontWeight: '600',
    color: '#2d3748',
    fontSize: '15px',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  statusPending: {
    background: '#fef5e7',
    color: '#d69e2e',
  },
  statusExecuted: {
    background: '#e6f7ed',
    color: '#38a169',
  },
  actionsCell: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  detailsBtn: {
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
  executeBtn: {
    padding: '6px 10px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
    background: '#48bb78',
    color: 'white',
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
