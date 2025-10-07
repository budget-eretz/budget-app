import React from 'react';
import Modal from './Modal';
import { PaymentTransferDetails } from '../types';

interface PaymentTransferDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: PaymentTransferDetails | null;
  onExecute?: (transferId: number) => void;
  canExecute: boolean;
}

const budgetTypeLabels: Record<string, string> = {
  circle: 'מעגלי',
  group: 'קבוצתי',
};

const statusLabels: Record<string, string> = {
  pending: 'ממתינה לביצוע',
  executed: 'בוצעה',
};

const statusColors: Record<string, string> = {
  pending: '#f59e0b',
  executed: '#10b981',
};

const reimbursementStatusLabels: Record<string, string> = {
  pending: 'ממתין לאישור',
  under_review: 'לבדיקה',
  approved: 'אושר',
  rejected: 'נדחה',
  paid: 'שולם',
};

export default function PaymentTransferDetailsModal({
  isOpen,
  onClose,
  transfer,
  onExecute,
  canExecute,
}: PaymentTransferDetailsModalProps) {
  if (!transfer) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
  };

  const handleExecute = () => {
    if (onExecute && transfer.status === 'pending') {
      onExecute(transfer.id);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="פרטי העברה" size="lg">
      <div style={styles.container} className="modal-details-content">
        {/* Status Badge */}
        <div style={styles.statusSection}>
          <span
            style={{
              ...styles.statusBadge,
              backgroundColor: statusColors[transfer.status],
            }}
          >
            {statusLabels[transfer.status]}
          </span>
        </div>

        {/* Transfer Summary */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>סיכום העברה</h3>
          <div style={styles.grid}>
            <DetailRow label="מספר העברה" value={`#${transfer.id}`} />
            <DetailRow label="מקבל תשלום" value={transfer.recipientName} />
            <DetailRow label="סוג תקציב" value={budgetTypeLabels[transfer.budgetType]} />
            {transfer.groupName && (
              <DetailRow label="קבוצה" value={transfer.groupName} />
            )}
            <DetailRow label="סכום כולל" value={formatCurrency(transfer.totalAmount)} highlight />
            <DetailRow label="מספר החזרים" value={String(transfer.reimbursementCount)} />
            <DetailRow label="תאריך יצירה" value={formatDate(transfer.createdAt)} />
          </div>
        </div>

        {/* Execution Information */}
        {transfer.status === 'executed' && transfer.executedAt && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>פרטי ביצוע</h3>
            <div style={styles.grid}>
              <DetailRow label="תאריך ביצוע" value={formatDate(transfer.executedAt)} />
              {transfer.executedByName && (
                <DetailRow label="בוצע על ידי" value={transfer.executedByName} />
              )}
            </div>
          </div>
        )}

        {/* Associated Reimbursements */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            החזרים משויכים ({transfer.reimbursements.length})
          </h3>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.tableHeader}>#</th>
                  <th style={styles.tableHeader}>תיאור</th>
                  <th style={styles.tableHeader}>קופה</th>
                  <th style={styles.tableHeader}>מגיש</th>
                  <th style={styles.tableHeader}>תאריך הוצאה</th>
                  <th style={styles.tableHeader}>סכום</th>
                  <th style={styles.tableHeader}>סטטוס</th>
                  <th style={styles.tableHeader}>קבלה</th>
                </tr>
              </thead>
              <tbody>
                {transfer.reimbursements.map((reimbursement) => (
                  <tr key={reimbursement.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>#{reimbursement.id}</td>
                    <td style={styles.tableCell}>{reimbursement.description}</td>
                    <td style={styles.tableCell}>{reimbursement.fund_name || '-'}</td>
                    <td style={styles.tableCell}>{reimbursement.user_name || '-'}</td>
                    <td style={styles.tableCell}>{formatDate(reimbursement.expense_date)}</td>
                    <td style={{...styles.tableCell, ...styles.amountCell}}>
                      {formatCurrency(reimbursement.amount)}
                    </td>
                    <td style={styles.tableCell}>
                      {reimbursementStatusLabels[reimbursement.status]}
                    </td>
                    <td style={styles.tableCell}>
                      {reimbursement.receipt_url ? (
                        <a
                          href={reimbursement.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.receiptLink}
                        >
                          📄
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Execute Button */}
        {transfer.status === 'pending' && canExecute && onExecute && (
          <div style={styles.actionSection}>
            <button
              onClick={handleExecute}
              style={styles.executeButton}
              className="execute-button"
            >
              ✓ בצע העברה
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function DetailRow({ label, value, highlight }: DetailRowProps) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}:</span>
      <span
        style={{
          ...styles.detailValue,
          ...(highlight ? styles.highlightedValue : {}),
        }}
      >
        {value}
      </span>
    </div>
  );
}



const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  statusSection: {
    display: 'flex',
    justifyContent: 'center',
    paddingBottom: '16px',
    borderBottom: '1px solid #e2e8f0',
  },
  statusBadge: {
    padding: '8px 24px',
    borderRadius: '20px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
    marginBottom: '8px',
    color: '#1a202c',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  detailRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '14px',
    color: '#718096',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: '16px',
    color: '#1a202c',
    fontWeight: '500',
  },
  highlightedValue: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: '18px',
  },
  tableContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
    overflowX: 'auto',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  tableHeaderRow: {
    backgroundColor: '#f7fafc',
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
  },
  tableHeader: {
    padding: '12px 16px',
    textAlign: 'right' as const,
    fontWeight: 'bold',
    color: '#1a202c',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap' as const,
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s',
  },
  tableCell: {
    padding: '12px 16px',
    textAlign: 'right' as const,
    color: '#1a202c',
  },
  amountCell: {
    fontWeight: 'bold',
    color: '#10b981',
  },
  receiptLink: {
    fontSize: '18px',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  actionSection: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '8px',
    borderTop: '1px solid #e2e8f0',
  },
  executeButton: {
    padding: '12px 32px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};
