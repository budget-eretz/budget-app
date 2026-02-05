import React from 'react';
import { RecurringTransfer } from '../types';
import { useStickyTableHeader } from '../hooks/useStickyTableHeader';

interface RecurringTransferTableProps {
  transfers: RecurringTransfer[];
  onEdit?: (transfer: RecurringTransfer) => void;
  onDelete?: (transfer: RecurringTransfer) => void;
  onToggleStatus?: (transfer: RecurringTransfer) => void;
  showActions?: boolean;
}

interface Column {
  key: string;
  label: string;
  render: (transfer: RecurringTransfer) => React.ReactNode;
}

const RecurringTransferTable: React.FC<RecurringTransferTableProps> = ({
  transfers,
  onEdit,
  onDelete,
  onToggleStatus,
  showActions = false,
}) => {
  const { tableClassName, headerCellRef } = useStickyTableHeader();
  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'monthly': return 'חודשי';
      case 'quarterly': return 'רבעוני';
      case 'annual': return 'שנתי';
      default: return frequency;
    }
  };

  const getStatusLabel = (transfer: RecurringTransfer) => {
    // If budget is inactive, show that instead of the transfer status
    if (transfer.isBudgetActive === false) {
      return 'תקציב לא פעיל';
    }
    switch (transfer.status) {
      case 'active': return 'פעיל';
      case 'paused': return 'מושהה';
      case 'cancelled': return 'בוטל';
      default: return transfer.status;
    }
  };

  const getStatusStyle = (transfer: RecurringTransfer): React.CSSProperties => {
    // If budget is inactive, use special style
    if (transfer.isBudgetActive === false) {
      return { ...styles.statusBadge, ...styles.statusBudgetInactive };
    }
    switch (transfer.status) {
      case 'active':
        return { ...styles.statusBadge, ...styles.statusActive };
      case 'paused':
        return { ...styles.statusBadge, ...styles.statusPaused };
      case 'cancelled':
        return { ...styles.statusBadge, ...styles.statusCancelled };
      default:
        return { ...styles.statusBadge, ...styles.statusCancelled };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const columns: Column[] = [
    {
      key: 'recipient',
      label: 'מקבל',
      render: (transfer: RecurringTransfer) => (
        <div>
          <div style={styles.recipientName}>{transfer.recipientName}</div>
          {transfer.recipientEmail && (
            <div style={styles.recipientEmail}>{transfer.recipientEmail}</div>
          )}
        </div>
      ),
    },
    {
      key: 'fund',
      label: 'סעיף',
      render: (transfer: RecurringTransfer) => (
        <div>
          <div style={{
            ...styles.fundName,
            ...(transfer.isBudgetActive === false ? styles.inactiveBudgetText : {})
          }}>
            {transfer.fundName}
            {transfer.isBudgetActive === false && ' ⚠️'}
          </div>
          {transfer.budgetName && (
            <div style={{
              ...styles.budgetInfo,
              ...(transfer.isBudgetActive === false ? styles.inactiveBudgetText : {})
            }}>
              {transfer.budgetName}
              {transfer.budgetType === 'group' && transfer.groupName && ` - ${transfer.groupName}`}
              {transfer.isBudgetActive === false && ' (לא פעיל)'}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'סכום',
      render: (transfer: RecurringTransfer) => (
        <span style={styles.amount}>{formatCurrency(Number(transfer.amount))}</span>
      ),
    },
    {
      key: 'description',
      label: 'תיאור',
      render: (transfer: RecurringTransfer) => (
        <span style={styles.description}>{transfer.description}</span>
      ),
    },
    {
      key: 'frequency',
      label: 'תדירות',
      render: (transfer: RecurringTransfer) => (
        <span>{getFrequencyLabel(transfer.frequency)}</span>
      ),
    },
    {
      key: 'startDate',
      label: 'תאריך התחלה',
      render: (transfer: RecurringTransfer) => (
        <span>{formatDate(transfer.startDate)}</span>
      ),
    },
    {
      key: 'endDate',
      label: 'תאריך סיום',
      render: (transfer: RecurringTransfer) => (
        <span>{transfer.endDate ? formatDate(transfer.endDate) : '-'}</span>
      ),
    },
    {
      key: 'status',
      label: 'סטטוס',
      render: (transfer: RecurringTransfer) => (
        <span style={getStatusStyle(transfer)}>
          {getStatusLabel(transfer)}
        </span>
      ),
    },
  ];

  if (showActions) {
    columns.push({
      key: 'actions',
      label: 'פעולות',
      render: (transfer: RecurringTransfer) => (
        <div style={styles.actionsCell}>
          {onToggleStatus && transfer.status !== 'cancelled' && transfer.isBudgetActive !== false && (
            <button
              onClick={() => onToggleStatus(transfer)}
              style={styles.toggleBtn}
              className="action-btn toggle-btn"
              title={transfer.status === 'active' ? 'השהה' : 'הפעל'}
              aria-label={transfer.status === 'active' ? 'השהה' : 'הפעל'}
            >
              {transfer.status === 'active' ? '⏸️' : '▶️'}
            </button>
          )}
          {onEdit && transfer.status !== 'cancelled' && (
            <button
              onClick={() => onEdit(transfer)}
              style={transfer.isBudgetActive === false ? styles.editBtnHighlight : styles.editBtn}
              className="action-btn edit-btn"
              title={transfer.isBudgetActive === false ? 'ערוך והעבר לסעיף פעיל' : 'ערוך'}
              aria-label={transfer.isBudgetActive === false ? 'ערוך והעבר לסעיף פעיל' : 'ערוך'}
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(transfer)}
              style={styles.deleteBtn}
              className="action-btn delete-btn"
              title="מחק"
              aria-label="מחק"
            >
              🗑️
            </button>
          )}
        </div>
      ),
    });
  }

  if (transfers.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>אין העברות קבועות</p>
      </div>
    );
  }

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table} className={tableClassName}>
        <thead>
          <tr style={styles.headerRow}>
            {columns.map((column, columnIndex) => (
              <th
                key={column.key}
                style={styles.headerCell}
                ref={columnIndex === 0 ? headerCellRef : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transfers.map((transfer) => (
            <tr key={transfer.id} style={styles.row} className="table-row">
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
};

// Add hover styles
const tableHoverStyle = document.createElement('style');
tableHoverStyle.textContent = `
  .table-row:hover {
    background: #f7fafc;
  }
  .action-btn:hover {
    transform: scale(1.1);
  }
  .toggle-btn:hover {
    background: #4299e1 !important;
  }
  .edit-btn:hover {
    background: #667eea !important;
  }
  .delete-btn:hover {
    background: #e53e3e !important;
  }
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
`;
if (!document.head.querySelector('style[data-recurring-transfer-table]')) {
  tableHoverStyle.setAttribute('data-recurring-transfer-table', 'true');
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
  recipientEmail: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '2px',
  },
  fundName: {
    color: '#2d3748',
  },
  budgetInfo: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '2px',
  },
  inactiveBudgetText: {
    color: '#c53030',
    textDecoration: 'line-through',
  },
  amount: {
    fontWeight: '600',
    color: '#2d3748',
    fontSize: '15px',
  },
  description: {
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'inline-block',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  statusActive: {
    background: '#e6f7ed',
    color: '#38a169',
  },
  statusPaused: {
    background: '#fef5e7',
    color: '#d69e2e',
  },
  statusCancelled: {
    background: '#f7fafc',
    color: '#718096',
  },
  statusBudgetInactive: {
    background: '#fed7d7',
    color: '#c53030',
  },
  actionsCell: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  toggleBtn: {
    padding: '6px 10px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
    background: '#63b3ed',
    color: 'white',
    minWidth: '32px',
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    padding: '6px 10px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
    background: '#7c3aed',
    color: 'white',
    minWidth: '32px',
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnHighlight: {
    padding: '6px 10px',
    border: '2px solid #c53030',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
    background: '#fc8181',
    color: 'white',
    minWidth: '32px',
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'pulse 2s infinite',
  },
  deleteBtn: {
    padding: '6px 10px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
    background: '#fc8181',
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

export default RecurringTransferTable;
