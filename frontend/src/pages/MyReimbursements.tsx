import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reimbursementsAPI, chargesAPI } from '../services/api';
import { Reimbursement, Charge, PaymentSummary } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Navigation from '../components/Navigation';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'paid';

export default function MyReimbursements() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; reimbursement: Reimbursement | null }>({
    isOpen: false,
    reimbursement: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reimbResponse, chargesResponse, summaryResponse] = await Promise.all([
        reimbursementsAPI.getMy(),
        chargesAPI.getMy(),
        reimbursementsAPI.getSummary(),
      ]);
      setReimbursements(reimbResponse.data);
      setCharges(chargesResponse.data);
      setSummary(summaryResponse.data);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בטעינת הנתונים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (reimbursement: Reimbursement) => {
    navigate('/reimbursements/new', { state: { reimbursement } });
  };

  const handleDeleteClick = (reimbursement: Reimbursement) => {
    setDeleteModal({ isOpen: true, reimbursement });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.reimbursement) return;

    setDeleteLoading(true);
    try {
      await reimbursementsAPI.delete(deleteModal.reimbursement.id);
      showToast('בקשת ההחזר נמחקה בהצלחה', 'success');
      setDeleteModal({ isOpen: false, reimbursement: null });
      await loadData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה במחיקת הבקשה', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'ממתין לאישור',
      approved: 'אושר',
      rejected: 'נדחה',
      paid: 'שולם',
    };
    return statusMap[status] || status;
  };

  const getStatusStyle = (status: string): React.CSSProperties => {
    const baseStyle = {
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
    };

    const colorMap: Record<string, React.CSSProperties> = {
      pending: { ...baseStyle, background: '#fef5e7', color: '#d68910' },
      approved: { ...baseStyle, background: '#d4edda', color: '#155724' },
      rejected: { ...baseStyle, background: '#f8d7da', color: '#721c24' },
      paid: { ...baseStyle, background: '#d1ecf1', color: '#0c5460' },
    };

    return colorMap[status] || baseStyle;
  };

  const filteredReimbursements = reimbursements.filter((reimb) => {
    if (statusFilter === 'all') return true;
    return reimb.status === statusFilter;
  });

  if (loading) {
    return <div style={styles.loading}>טוען...</div>;
  }

  return (
    <div style={styles.container}>
      <Navigation />

      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>ההחזרים שלי</h1>
          <div style={styles.headerActions}>
            <Button variant="primary" onClick={() => navigate('/reimbursements/new')}>
              + הגש בקשת החזר
            </Button>
            <Button variant="secondary" onClick={() => navigate('/charges/new')}>
              + הגש חיוב
            </Button>
          </div>
        </div>

        {/* Payment Summary Card */}
        {summary && (
          <div style={styles.summaryCard}>
            <h2 style={styles.summaryTitle}>סיכום תשלומים</h2>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>סה"כ החזרים ממתינים:</span>
                <span style={{ ...styles.summaryValue, color: '#38a169' }}>
                  {formatCurrency(summary.totalReimbursements)}
                </span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>סה"כ חיובים:</span>
                <span style={{ ...styles.summaryValue, color: '#e53e3e' }}>
                  {formatCurrency(summary.totalCharges)}
                </span>
              </div>
              <div style={{ ...styles.summaryItem, ...styles.summaryItemTotal }}>
                <span style={styles.summaryLabel}>
                  <strong>נטו לתשלום:</strong>
                </span>
                <span style={{ ...styles.summaryValue, color: '#667eea', fontWeight: 'bold' }}>
                  {formatCurrency(summary.netAmount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Reimbursements Section */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>בקשות החזר ({filteredReimbursements.length})</h2>

          {/* Status Filter Tabs */}
          <div style={styles.filterTabs}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                ...styles.filterTab,
                ...(statusFilter === 'all' ? styles.filterTabActive : {}),
              }}
            >
              הכל ({reimbursements.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              style={{
                ...styles.filterTab,
                ...(statusFilter === 'pending' ? styles.filterTabActive : {}),
              }}
            >
              ממתין ({reimbursements.filter((r) => r.status === 'pending').length})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              style={{
                ...styles.filterTab,
                ...(statusFilter === 'approved' ? styles.filterTabActive : {}),
              }}
            >
              אושר ({reimbursements.filter((r) => r.status === 'approved').length})
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              style={{
                ...styles.filterTab,
                ...(statusFilter === 'rejected' ? styles.filterTabActive : {}),
              }}
            >
              נדחה ({reimbursements.filter((r) => r.status === 'rejected').length})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              style={{
                ...styles.filterTab,
                ...(statusFilter === 'paid' ? styles.filterTabActive : {}),
              }}
            >
              שולם ({reimbursements.filter((r) => r.status === 'paid').length})
            </button>
          </div>

          {/* Reimbursements List */}
          {filteredReimbursements.length === 0 ? (
            <div style={styles.emptyState}>
              <p>אין בקשות החזר להצגה</p>
            </div>
          ) : (
            <div style={styles.cardsList}>
              {filteredReimbursements.map((reimb) => (
                <div key={reimb.id} style={styles.reimbursementCard}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.cardTitle}>{reimb.fund_name}</h3>
                      <span style={getStatusStyle(reimb.status)}>{getStatusText(reimb.status)}</span>
                    </div>
                    <div style={styles.cardAmount}>{formatCurrency(reimb.amount)}</div>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>תיאור:</span>
                      <span>{reimb.description}</span>
                    </div>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>תאריך הוצאה:</span>
                      <span>{formatDate(reimb.expense_date)}</span>
                    </div>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>תאריך הגשה:</span>
                      <span>{formatDate(reimb.created_at)}</span>
                    </div>
                    {reimb.recipient_user_id && reimb.recipient_user_id !== reimb.user_id && (
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>מקבל התשלום:</span>
                        <span style={{ fontWeight: '600' }}>{reimb.recipient_name}</span>
                      </div>
                    )}
                    {reimb.notes && (
                      <div style={styles.cardRow}>
                        <span style={styles.cardLabel}>הערות:</span>
                        <span>{reimb.notes}</span>
                      </div>
                    )}
                  </div>

                  {reimb.status === 'pending' && (
                    <div style={styles.cardActions}>
                      <Button variant="secondary" size="sm" onClick={() => handleEdit(reimb)}>
                        ערוך
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteClick(reimb)}>
                        מחק
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Charges Section */}
        {charges.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>חיובים ({charges.length})</h2>
            <div style={styles.cardsList}>
              {charges.map((charge) => (
                <div key={charge.id} style={styles.chargeCard}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3 style={styles.cardTitle}>{charge.fund_name}</h3>
                      <span style={styles.chargeLabel}>חיוב</span>
                    </div>
                    <div style={{ ...styles.cardAmount, color: '#e53e3e' }}>
                      -{formatCurrency(charge.amount)}
                    </div>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>תיאור:</span>
                      <span>{charge.description}</span>
                    </div>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>תאריך חיוב:</span>
                      <span>{formatDate(charge.charge_date)}</span>
                    </div>
                    <div style={styles.cardRow}>
                      <span style={styles.cardLabel}>תאריך יצירה:</span>
                      <span>{formatDate(charge.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, reimbursement: null })}
        title="מחיקת בקשת החזר"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>האם אתה בטוח שברצונך למחוק את בקשת ההחזר?</p>
          {deleteModal.reimbursement && (
            <div style={styles.deleteModalDetails}>
              <div>
                <strong>קופה:</strong> {deleteModal.reimbursement.fund_name}
              </div>
              <div>
                <strong>סכום:</strong> {formatCurrency(deleteModal.reimbursement.amount)}
              </div>
              <div>
                <strong>תיאור:</strong> {deleteModal.reimbursement.description}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => setDeleteModal({ isOpen: false, reimbursement: null })}
              disabled={deleteLoading}
            >
              ביטול
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} isLoading={deleteLoading}>
              מחק
            </Button>
          </div>
        </div>
      </Modal>
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
  content: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    color: '#2d3748',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  summaryCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '32px',
  },
  summaryTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#2d3748',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  summaryItemTotal: {
    paddingTop: '16px',
    borderTop: '2px solid #e2e8f0',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#718096',
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: '600',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#2d3748',
  },
  filterTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  filterTab: {
    padding: '10px 16px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    transition: 'all 0.2s',
  },
  filterTabActive: {
    background: '#667eea',
    color: 'white',
    borderColor: '#667eea',
  },
  emptyState: {
    background: 'white',
    padding: '40px 20px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  reimbursementCard: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  },
  chargeCard: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    border: '2px solid #fed7d7',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px',
    borderBottom: '1px solid #e2e8f0',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    color: '#2d3748',
  },
  cardAmount: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#667eea',
  },
  cardBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    gap: '12px',
  },
  cardLabel: {
    color: '#718096',
    fontWeight: '600',
    minWidth: '100px',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    padding: '16px 20px',
    borderTop: '1px solid #e2e8f0',
    background: '#f7fafc',
  },
  chargeLabel: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#fed7d7',
    color: '#c53030',
  },
  deleteModalDetails: {
    background: '#f7fafc',
    padding: '16px',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '14px',
  },
};
