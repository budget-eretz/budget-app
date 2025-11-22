import React from 'react';
import Modal from './Modal';
import { Reimbursement } from '../types';

interface ReimbursementDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reimbursement: Reimbursement | null;
}

const statusLabels: Record<string, string> = {
  pending: 'ממתין לאישור',
  under_review: 'לבדיקה',
  approved: 'אושר',
  rejected: 'נדחה',
  paid: 'שולם',
};

const statusColors: Record<string, string> = {
  pending: '#f59e0b',
  under_review: '#3b82f6',
  approved: '#10b981',
  rejected: '#ef4444',
  paid: '#6366f1',
};

export default function ReimbursementDetailsModal({
  isOpen,
  onClose,
  reimbursement,
}: ReimbursementDetailsModalProps) {
  if (!reimbursement) return null;

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

  const handleOpenReceipt = () => {
    if (reimbursement.receipt_url) {
      window.open(reimbursement.receipt_url, '_blank');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="פרטי החזר" size="lg">
      <div style={styles.container} className="modal-details-content">
        {/* Status Badge */}
        <div style={styles.statusSection}>
          <span
            style={{
              ...styles.statusBadge,
              backgroundColor: statusColors[reimbursement.status],
            }}
          >
            {statusLabels[reimbursement.status]}
          </span>
        </div>

        {/* Main Details */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>פרטי ההחזר</h3>
          <div style={styles.grid}>
            <DetailRow label="מספר החזר" value={`#${reimbursement.id}`} />
            <DetailRow label="סכום" value={formatCurrency(reimbursement.amount)} />
            <DetailRow label="סעיף" value={reimbursement.fund_name || '-'} />
            <DetailRow label="תאריך הוצאה" value={formatDate(reimbursement.expense_date)} />
          </div>
          <div style={styles.fullWidth}>
            <DetailRow label="תיאור" value={reimbursement.description} />
          </div>
        </div>

        {/* People Involved */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>מעורבים</h3>
          <div style={styles.grid}>
            <DetailRow label="מגיש" value={reimbursement.user_name || '-'} />
            <DetailRow
              label="מקבל תשלום"
              value={
                reimbursement.recipient_name ||
                reimbursement.user_name ||
                '-'
              }
              highlight={
                !!(reimbursement.recipient_user_id &&
                reimbursement.recipient_user_id !== reimbursement.user_id)
              }
            />
          </div>
          {reimbursement.user_email && (
            <div style={styles.fullWidth}>
              <DetailRow label="אימייל מגיש" value={reimbursement.user_email} />
            </div>
          )}
        </div>

        {/* History */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>היסטוריה</h3>
          <div style={styles.timeline}>
            <TimelineItem
              label="נוצר"
              date={formatDate(reimbursement.created_at)}
              by={reimbursement.user_name}
            />

            {reimbursement.under_review_at && (
              <TimelineItem
                label="סומן לבדיקה"
                date={formatDate(reimbursement.under_review_at)}
                by={reimbursement.reviewer_name}
                notes={reimbursement.review_notes}
              />
            )}

            {reimbursement.reviewed_at && (
              <TimelineItem
                label={
                  reimbursement.status === 'approved'
                    ? 'אושר'
                    : reimbursement.status === 'rejected'
                    ? 'נדחה'
                    : 'נבדק'
                }
                date={formatDate(reimbursement.reviewed_at)}
                by={reimbursement.reviewer_name}
                notes={reimbursement.notes}
              />
            )}

            {reimbursement.status === 'paid' && (
              <TimelineItem label="שולם" date="-" />
            )}
          </div>
        </div>

        {/* Notes */}
        {(reimbursement.notes || reimbursement.review_notes) && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>הערות</h3>
            {reimbursement.review_notes && (
              <div style={styles.noteBox}>
                <strong>הערות לבדיקה:</strong>
                <p style={styles.noteText}>{reimbursement.review_notes}</p>
              </div>
            )}
            {reimbursement.notes && (
              <div style={styles.noteBox}>
                <strong>
                  {reimbursement.status === 'rejected'
                    ? 'סיבת דחייה:'
                    : 'הערות:'}
                </strong>
                <p style={styles.noteText}>{reimbursement.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Receipt Button */}
        {reimbursement.receipt_url && (
          <div style={styles.receiptSection}>
            <button onClick={handleOpenReceipt} style={styles.receiptButton} className="receipt-button">
              📄 פתח קבלה
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

interface TimelineItemProps {
  label: string;
  date: string;
  by?: string;
  notes?: string;
}

function TimelineItem({ label, date, by, notes }: TimelineItemProps) {
  return (
    <div style={styles.timelineItem} className="timeline-item">
      <div style={styles.timelineDot} />
      <div style={styles.timelineContent}>
        <div style={styles.timelineHeader}>
          <strong>{label}</strong>
          <span style={styles.timelineDate}>{date}</span>
        </div>
        {by && <div style={styles.timelineBy}>על ידי: {by}</div>}
        {notes && <div style={styles.timelineNotes}>{notes}</div>}
      </div>
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
  fullWidth: {
    width: '100%',
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
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingRight: '8px',
  },
  timelineItem: {
    display: 'flex',
    gap: '12px',
    position: 'relative',
  },
  timelineDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    marginTop: '4px',
    flexShrink: 0,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: '8px',
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  timelineDate: {
    fontSize: '14px',
    color: '#718096',
  },
  timelineBy: {
    fontSize: '14px',
    color: '#4a5568',
    marginTop: '2px',
  },
  timelineNotes: {
    fontSize: '14px',
    color: '#4a5568',
    marginTop: '4px',
    fontStyle: 'italic',
  },
  noteBox: {
    backgroundColor: '#f7fafc',
    padding: '12px 16px',
    borderRadius: '8px',
    borderRight: '4px solid #3b82f6',
  },
  noteText: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: '#4a5568',
    lineHeight: '1.5',
  },
  receiptSection: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '8px',
  },
  receiptButton: {
    padding: '12px 32px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};
