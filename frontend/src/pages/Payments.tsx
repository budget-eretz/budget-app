import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsAPI, reimbursementsAPI } from '../services/api';
import { Reimbursement } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Navigation from '../components/Navigation';

export default function Payments() {
  const [payments, setPayments] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const response = await reportsAPI.getPaymentsList();
      setPayments(response.data.payments || []);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בטעינת רשימת ההעברות', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (reimbursementId: number) => {
    if (!confirm('האם אתה בטוח שההעברה בוצעה?')) return;

    setActionLoading(reimbursementId);
    try {
      await reimbursementsAPI.markAsPaid(reimbursementId);
      showToast('ההעברה סומנה כבוצעה בהצלחה', 'success');
      await loadPayments();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בסימון ההעברה', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

  if (loading) {
    return <div style={styles.loading}>טוען...</div>;
  }

  return (
    <div style={styles.container}>
      <Navigation />

      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.title}>רשימת העברות</h1>
            <p style={styles.subtitle}>
              {payments.length} העברות ממתינות | סה"כ: {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
        {payments.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>אין העברות ממתינות</p>
            <Button onClick={() => navigate('/dashboard')}>חזרה לדשבורד</Button>
          </div>
        ) : (
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <div>שם המבקש</div>
              <div>קופה</div>
              <div>תיאור</div>
              <div>סכום</div>
              <div>תאריך הוצאה</div>
              <div>תאריך אישור</div>
              <div>פעולות</div>
            </div>
            {payments.map((payment) => (
              <div key={payment.id} style={styles.tableRow}>
                <div style={styles.tableCell}>
                  <strong>{payment.user_name}</strong>
                  <small style={{ color: '#718096' }}>{payment.user_email}</small>
                </div>
                <div style={styles.tableCell}>{payment.fund_name}</div>
                <div style={styles.tableCell}>{payment.description}</div>
                <div style={styles.tableCell}>
                  <strong style={{ color: '#667eea' }}>{formatCurrency(payment.amount)}</strong>
                </div>
                <div style={styles.tableCell}>{formatDate(payment.expense_date)}</div>
                <div style={styles.tableCell}>
                  {payment.reviewed_at ? formatDate(payment.reviewed_at) : '-'}
                </div>
                <div style={styles.actionsCell}>
                  {payment.receipt_url && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(payment.receipt_url, '_blank')}
                    >
                      קבלה
                    </Button>
                  )}
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleMarkAsPaid(payment.id)}
                    isLoading={actionLoading === payment.id}
                    disabled={actionLoading !== null}
                  >
                    סמן כבוצע
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '20px',
  },
  container: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  pageHeader: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#718096',
    margin: '4px 0 0 0',
  },
  content: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  emptyState: {
    background: 'white',
    padding: '60px 40px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  emptyText: {
    fontSize: '18px',
    color: '#718096',
    marginBottom: '20px',
  },
  table: {
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr 2fr 1fr 1fr 1fr 1.5fr',
    padding: '16px 20px',
    background: '#f7fafc',
    fontWeight: 'bold',
    fontSize: '14px',
    borderBottom: '2px solid #e2e8f0',
    gap: '16px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr 2fr 1fr 1fr 1fr 1.5fr',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    gap: '16px',
    alignItems: 'center',
  },
  tableCell: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  actionsCell: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
};
