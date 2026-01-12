import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reimbursementsAPI, chargesAPI, recurringTransfersAPI } from '../services/api';
import { Reimbursement, Charge, PaymentSummary, RecurringTransfer } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Navigation from '../components/Navigation';
import ReimbursementDetailsModal from '../components/ReimbursementDetailsModal';
import RecurringTransferTable from '../components/RecurringTransferTable';

type StatusFilter = 'all' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid';
type SortField = 'expense_date' | 'created_at' | 'amount' | 'fund_name' | 'description';
type SortDirection = 'asc' | 'desc';

export default function MyReimbursements() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [recurringTransfers, setRecurringTransfers] = useState<RecurringTransfer[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [sortField, setSortField] = useState<SortField>('expense_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [deleteModal, setDeleteModal] = useState<{ 
    isOpen: boolean; 
    type: 'reimbursement' | 'charge';
    item: Reimbursement | Charge | null;
  }>({
    isOpen: false,
    type: 'reimbursement',
    item: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    reimbursement: Reimbursement | null;
  }>({
    isOpen: false,
    reimbursement: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reimbResponse, chargesResponse, summaryResponse, recurringResponse] = await Promise.all([
        reimbursementsAPI.getMy(),
        chargesAPI.getMy(),
        reimbursementsAPI.getSummary(),
        recurringTransfersAPI.getMy(),
      ]);
      setReimbursements(reimbResponse.data);
      setCharges(chargesResponse.data);
      setSummary(summaryResponse.data);
      setRecurringTransfers(recurringResponse.data);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בטעינת הנתונים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditReimbursement = (reimbursement: Reimbursement) => {
    navigate('/reimbursements/new', { state: { reimbursement } });
  };

  const handleEditCharge = (charge: Charge) => {
    navigate('/charges/new', { state: { charge } });
  };

  const handleDeleteClick = (type: 'reimbursement' | 'charge', item: Reimbursement | Charge) => {
    setDeleteModal({ isOpen: true, type, item });
  };

  const handleViewDetails = (reimbursement: Reimbursement) => {
    setDetailsModal({ isOpen: true, reimbursement });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.item) return;

    setDeleteLoading(true);
    try {
      if (deleteModal.type === 'reimbursement') {
        await reimbursementsAPI.delete(deleteModal.item.id);
        showToast('בקשת ההחזר נמחקה בהצלחה', 'success');
      } else {
        await chargesAPI.delete(deleteModal.item.id);
        showToast('החיוב נמחק בהצלחה', 'success');
      }
      setDeleteModal({ isOpen: false, type: 'reimbursement', item: null });
      await loadData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה במחיקה', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    // Add safety check for NaN values
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '₪0.00';
    }
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const formatMonthYear = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', { year: 'numeric', month: 'long' });
  };

  const getMonthYearKey = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'ממתין לאישור',
      under_review: 'לבדיקה',
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
      under_review: { ...baseStyle, background: '#fff3cd', color: '#856404' },
      approved: { ...baseStyle, background: '#d4edda', color: '#155724' },
      rejected: { ...baseStyle, background: '#f8d7da', color: '#721c24' },
      paid: { ...baseStyle, background: '#d1ecf1', color: '#0c5460' },
    };

    return colorMap[status] || baseStyle;
  };

  const filteredReimbursements = reimbursements
    .filter((reimb) => {
      // Status filter
      if (statusFilter !== 'all' && reimb.status !== statusFilter) return false;
      
      // Month filter
      if (monthFilter !== 'all') {
        const reimbMonthKey = getMonthYearKey(reimb.expense_date);
        if (reimbMonthKey !== monthFilter) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'expense_date':
        case 'created_at':
          aValue = new Date(a[sortField]).getTime();
          bValue = new Date(b[sortField]).getTime();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'fund_name':
        case 'description':
          aValue = (a[sortField] || '').toLowerCase();
          bValue = (b[sortField] || '').toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Calculate filtered total
  const filteredTotal = filteredReimbursements.reduce((sum, reimb) => {
    // Handle both string and number types from API
    const amount = typeof reimb.amount === 'string' ? parseFloat(reimb.amount) : reimb.amount;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  // Calculate charges total (charges don't have filters yet, but we can add them later)
  const chargesTotal = charges.reduce((sum, charge) => {
    // Handle both string and number types from API
    const amount = typeof charge.amount === 'string' ? parseFloat(charge.amount) : charge.amount;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  // Get unique months for filter dropdown
  const availableMonths = Array.from(
    new Set(reimbursements.map(reimb => getMonthYearKey(reimb.expense_date)))
  ).sort().reverse().map(monthKey => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return {
      key: monthKey,
      label: formatMonthYear(date.toISOString())
    };
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
            <h2 style={styles.summaryTitle}>סיכום</h2>
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
              onClick={() => setStatusFilter('under_review')}
              style={{
                ...styles.filterTab,
                ...(statusFilter === 'under_review' ? styles.filterTabActive : {}),
              }}
            >
              לבדיקה ({reimbursements.filter((r) => r.status === 'under_review').length})
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

          {/* Month Filter */}
          <div style={styles.filterControls}>
            <div style={styles.monthFilter}>
              <label style={styles.filterLabel}>סינון לפי חודש:</label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">כל החודשים</option>
                {availableMonths.map(month => (
                  <option key={month.key} value={month.key}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter Summary */}
          {filteredReimbursements.length > 0 && !isNaN(filteredTotal) && (
            <div style={styles.filterSummary}>
              <span style={styles.filterSummaryText}>
                {(() => {
                  const statusText = statusFilter !== 'all' ? getStatusText(statusFilter) : null;
                  const monthText = monthFilter !== 'all' ? availableMonths.find(m => m.key === monthFilter)?.label : null;
                  
                  let message = `מציג ${filteredReimbursements.length} בקשות החזר`;
                  
                  if (statusText && monthText) {
                    message += ` בסטטוס "${statusText}" עבור ${monthText}`;
                  } else if (statusText) {
                    message += ` בסטטוס "${statusText}"`;
                  } else if (monthText) {
                    message += ` עבור ${monthText}`;
                  }
                  
                  message += ` בסך ${formatCurrency(filteredTotal)}`;
                  
                  return message;
                })()}
              </span>
            </div>
          )}

          {/* Reimbursements Table */}
          {filteredReimbursements.length === 0 ? (
            <div style={styles.emptyState}>
              <p>אין בקשות החזר להצגה</p>
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th 
                      style={{...styles.tableHeader, ...styles.sortableHeader}}
                      onClick={() => handleSort('fund_name')}
                    >
                      סעיף {getSortIcon('fund_name')}
                    </th>
                    <th 
                      style={{...styles.tableHeader, ...styles.sortableHeader}}
                      onClick={() => handleSort('description')}
                    >
                      תיאור {getSortIcon('description')}
                    </th>
                    <th 
                      style={{...styles.tableHeader, ...styles.sortableHeader}}
                      onClick={() => handleSort('amount')}
                    >
                      סכום {getSortIcon('amount')}
                    </th>
                    <th 
                      style={{...styles.tableHeader, ...styles.sortableHeader}}
                      onClick={() => handleSort('expense_date')}
                    >
                      תאריך הוצאה {getSortIcon('expense_date')}
                    </th>
                    <th 
                      style={{...styles.tableHeader, ...styles.sortableHeader}}
                      onClick={() => handleSort('created_at')}
                    >
                      תאריך הגשה {getSortIcon('created_at')}
                    </th>
                    <th style={styles.tableHeader}>מקבל תשלום</th>
                    <th style={styles.tableHeader}>סטטוס</th>
                    <th style={styles.tableHeader}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReimbursements.map((reimb) => (
                    <tr key={reimb.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{reimb.fund_name}</td>
                      <td style={styles.tableCell}>
                        <div style={styles.descriptionCell}>
                          {reimb.description}
                          {reimb.notes && (
                            <div style={styles.notesText}>{reimb.notes}</div>
                          )}
                        </div>
                      </td>
                      <td style={{ ...styles.tableCell, ...styles.amountCell }}>
                        {formatCurrency(reimb.amount)}
                      </td>
                      <td style={styles.tableCell}>{formatDate(reimb.expense_date)}</td>
                      <td style={styles.tableCell}>{formatDate(reimb.created_at)}</td>
                      <td style={styles.tableCell}>
                        {reimb.recipient_user_id && reimb.recipient_user_id !== reimb.user_id
                          ? reimb.recipient_name
                          : '-'}
                      </td>
                      <td style={styles.tableCell}>
                        <span style={getStatusStyle(reimb.status)}>{getStatusText(reimb.status)}</span>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.tableActions}>
                          <Button variant="secondary" size="sm" onClick={() => handleViewDetails(reimb)}>
                            צפה בפרטים
                          </Button>
                          {(reimb.status === 'pending' || reimb.status === 'under_review') && (
                            <>
                              <Button variant="secondary" size="sm" onClick={() => handleEditReimbursement(reimb)}>
                                ערוך
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => handleDeleteClick('reimbursement', reimb)}>
                                מחק
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Summary Row */}
                  {filteredReimbursements.length > 0 && !isNaN(filteredTotal) && (
                    <tr style={styles.summaryRow}>
                      <td style={styles.summaryCell}>
                        <strong>סה"כ</strong>
                      </td>
                      <td style={styles.summaryCell}>
                        <strong>{filteredReimbursements.length} פריטים</strong>
                      </td>
                      <td style={{ ...styles.summaryCell, ...styles.summaryAmountCell }}>
                        <strong>{formatCurrency(filteredTotal)}</strong>
                      </td>
                      <td style={styles.summaryCell}></td>
                      <td style={styles.summaryCell}></td>
                      <td style={styles.summaryCell}></td>
                      <td style={styles.summaryCell}></td>
                      <td style={styles.summaryCell}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Charges Section */}
        {charges.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>חיובים ({charges.length})</h2>
            
            {/* Charges Summary */}
            {charges.length > 0 && !isNaN(chargesTotal) && (
              <div style={styles.filterSummary}>
                <span style={styles.filterSummaryText}>
                  מציג {charges.length} חיובים בסך {formatCurrency(chargesTotal)}
                </span>
              </div>
            )}
            
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>סעיף</th>
                    <th style={styles.tableHeader}>תיאור</th>
                    <th style={styles.tableHeader}>סכום</th>
                    <th style={styles.tableHeader}>תאריך חיוב</th>
                    <th style={styles.tableHeader}>תאריך יצירה</th>
                    <th style={styles.tableHeader}>סטטוס</th>
                    <th style={styles.tableHeader}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((charge) => (
                    <tr key={charge.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{charge.fund_name}</td>
                      <td style={styles.tableCell}>
                        <div style={styles.descriptionCell}>
                          {charge.description}
                          {charge.notes && (
                            <div style={styles.notesText}>{charge.notes}</div>
                          )}
                        </div>
                      </td>
                      <td style={{ ...styles.tableCell, ...styles.chargeAmountCell }}>
                        -{formatCurrency(charge.amount)}
                      </td>
                      <td style={styles.tableCell}>{formatDate(charge.charge_date)}</td>
                      <td style={styles.tableCell}>{formatDate(charge.created_at)}</td>
                      <td style={styles.tableCell}>
                        <span style={getStatusStyle(charge.status)}>{getStatusText(charge.status)}</span>
                      </td>
                      <td style={styles.tableCell}>
                        {(charge.status === 'pending' || charge.status === 'under_review') && (
                          <div style={styles.tableActions}>
                            <Button variant="secondary" size="sm" onClick={() => handleEditCharge(charge)}>
                              ערוך
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteClick('charge', charge)}>
                              מחק
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Summary Row */}
                  {charges.length > 0 && !isNaN(chargesTotal) && (
                    <tr style={styles.summaryRow}>
                      <td style={styles.summaryCell}>
                        <strong>סה"כ</strong>
                      </td>
                      <td style={styles.summaryCell}>
                        <strong>{charges.length} פריטים</strong>
                      </td>
                      <td style={{ ...styles.summaryCell, ...styles.chargeSummaryAmountCell }}>
                        <strong>-{formatCurrency(chargesTotal)}</strong>
                      </td>
                      <td style={styles.summaryCell}></td>
                      <td style={styles.summaryCell}></td>
                      <td style={styles.summaryCell}></td>
                      <td style={styles.summaryCell}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Recurring Transfers Section */}
        {recurringTransfers.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>העברות חודשיות קבועות ({recurringTransfers.length})</h2>
            <p style={styles.sectionDescription}>
              העברות אלו מבוצעות באופן אוטומטי על ידי גזברית המעגל
            </p>
            <RecurringTransferTable
              transfers={recurringTransfers}
              showActions={false}
            />
          </section>
        )}
      </div>

      {/* Reimbursement Details Modal */}
      <ReimbursementDetailsModal
        isOpen={detailsModal.isOpen}
        onClose={() => setDetailsModal({ isOpen: false, reimbursement: null })}
        reimbursement={detailsModal.reimbursement}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: 'reimbursement', item: null })}
        title={deleteModal.type === 'reimbursement' ? 'מחיקת בקשת החזר' : 'מחיקת חיוב'}
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>
            {deleteModal.type === 'reimbursement' 
              ? 'האם אתה בטוח שברצונך למחוק את בקשת ההחזר?'
              : 'האם אתה בטוח שברצונך למחוק את החיוב?'}
          </p>
          {deleteModal.item && (
            <div style={styles.deleteModalDetails}>
              <div>
                <strong>סעיף:</strong> {deleteModal.item.fund_name}
              </div>
              <div>
                <strong>סכום:</strong> {formatCurrency(deleteModal.item.amount)}
              </div>
              <div>
                <strong>תיאור:</strong> {deleteModal.item.description}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => setDeleteModal({ isOpen: false, type: 'reimbursement', item: null })}
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
  sectionDescription: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '16px',
    fontStyle: 'italic',
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
  filterControls: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '16px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  monthFilter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    whiteSpace: 'nowrap',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
    color: '#2d3748',
    minWidth: '150px',
  },
  emptyState: {
    background: 'white',
    padding: '40px 20px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tableContainer: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  tableHeaderRow: {
    background: '#f7fafc',
    borderBottom: '2px solid #e2e8f0',
  },
  tableHeader: {
    padding: '16px 12px',
    textAlign: 'right',
    fontWeight: '600',
    color: '#4a5568',
    whiteSpace: 'nowrap',
  },
  sortableHeader: {
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.2s',
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background 0.2s',
  },
  tableCell: {
    padding: '16px 12px',
    textAlign: 'right',
    color: '#2d3748',
  },
  descriptionCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  notesText: {
    fontSize: '12px',
    color: '#718096',
    fontStyle: 'italic',
  },
  amountCell: {
    fontWeight: '600',
    color: '#667eea',
    whiteSpace: 'nowrap',
  },
  chargeAmountCell: {
    fontWeight: '600',
    color: '#e53e3e',
    whiteSpace: 'nowrap',
  },
  tableActions: {
    display: 'flex',
    gap: '8px',
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
  summaryRow: {
    borderTop: '2px solid #667eea',
    background: '#f8faff',
  },
  summaryCell: {
    padding: '16px 12px',
    textAlign: 'right',
    color: '#2d3748',
    fontSize: '14px',
  },
  summaryAmountCell: {
    fontWeight: '600',
    color: '#667eea',
    whiteSpace: 'nowrap',
    fontSize: '16px',
  },
  chargeSummaryAmountCell: {
    fontWeight: '600',
    color: '#e53e3e',
    whiteSpace: 'nowrap',
    fontSize: '16px',
  },
  filterSummary: {
    background: '#e6f3ff',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    border: '1px solid #b3d9ff',
  },
  filterSummaryText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2c5aa0',
  },
};
