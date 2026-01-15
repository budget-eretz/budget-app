import React from 'react';
import { DirectExpense } from '../types';

interface DirectExpenseTableProps {
  expenses: DirectExpense[];
  onEdit?: (expense: DirectExpense) => void;
  onDelete?: (expense: DirectExpense) => void;
  showActions?: boolean;
}

const DirectExpenseTable: React.FC<DirectExpenseTableProps> = ({
  expenses,
  onEdit,
  onDelete,
  showActions = false,
}) => {
  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  if (expenses.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>אין הוצאות ישירות</p>
      </div>
    );
  }

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.headerCell}>תאריך</th>
            <th style={styles.headerCell}>סעיף</th>
            <th style={styles.headerCell}>למי שולם</th>
            <th style={styles.headerCell}>תיאור</th>
            <th style={styles.headerCell}>סכום</th>
            <th style={styles.headerCell}>נוצר על ידי</th>
            <th style={styles.headerCell}>קבלה</th>
            {showActions && <th style={styles.headerCell}>פעולות</th>}
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id} style={styles.row}>
              <td style={styles.cell}>{formatDate(expense.expenseDate || (expense as any).expense_date)}</td>
              <td style={styles.cell}>{expense.fundName || (expense as any).fund_name || `סעיף ${expense.fundId || (expense as any).fund_id}`}</td>
              <td style={styles.cell}>{expense.payee}</td>
              <td style={styles.cell}>{expense.description}</td>
              <td style={styles.cell}>
                <span style={styles.amount}>{formatCurrency(expense.amount)}</span>
              </td>
              <td style={styles.cell}>{expense.createdByName || (expense as any).created_by_name || `משתמש ${expense.createdBy || (expense as any).created_by}`}</td>
              <td style={styles.cell}>
                {(expense.receiptUrl || (expense as any).receipt_url) ? (
                  <a
                    href={expense.receiptUrl || (expense as any).receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.receiptLink}
                  >
                    צפה בקבלה
                  </a>
                ) : (
                  <span style={styles.noReceipt}>אין קבלה</span>
                )}
              </td>
              {showActions && (
                <td style={styles.cell}>
                  <div style={styles.actions}>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(expense)}
                        style={styles.editButton}
                        title="ערוך"
                      >
                        ✏️
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(expense)}
                        style={styles.deleteButton}
                        title="מחק"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  tableContainer: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headerRow: {
    background: '#f7fafc',
    borderBottom: '2px solid #e2e8f0',
  },
  headerCell: {
    padding: '16px',
    textAlign: 'right',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
  },
  row: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
  },
  cell: {
    padding: '16px',
    textAlign: 'right',
    fontSize: '14px',
    color: '#2d3748',
  },
  amount: {
    fontWeight: '600',
    color: '#667eea',
  },
  receiptLink: {
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '500',
  },
  noReceipt: {
    color: '#a0aec0',
    fontSize: '13px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
  },
  editButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '4px',
    transition: 'transform 0.2s',
  },
  deleteButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '4px',
    transition: 'transform 0.2s',
  },
  emptyState: {
    background: 'white',
    padding: '60px 40px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  emptyText: {
    fontSize: '16px',
    color: '#718096',
  },
};

export default DirectExpenseTable;
