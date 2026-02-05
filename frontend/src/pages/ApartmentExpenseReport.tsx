import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { apartmentsAPI } from '../services/api';
import { ApartmentExpenseSummary, ApartmentExpenseDetail } from '../types';
import { useToast } from '../components/Toast';

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function ApartmentExpenseReport() {
  const [summaries, setSummaries] = useState<ApartmentExpenseSummary[]>([]);
  const [unassignedSummary, setUnassignedSummary] = useState<ApartmentExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | null>(null);
  const [apartmentDetails, setApartmentDetails] = useState<ApartmentExpenseDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { showToast } = useToast();

  const currentDate = new Date();
  const [startDate, setStartDate] = useState(
    new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterApartmentId, setFilterApartmentId] = useState<number | undefined>();

  useEffect(() => {
    loadSummaries();
  }, [startDate, endDate, filterApartmentId]);

  const loadSummaries = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (filterApartmentId) params.apartmentId = filterApartmentId;

      const response = await apartmentsAPI.getExpenseSummary(params);
      const data = response.data;

      // Separate assigned apartments from unassigned
      const assigned = data.filter((s: ApartmentExpenseSummary) => s.apartmentId !== null);
      const unassigned = data.find((s: ApartmentExpenseSummary) => s.apartmentId === null);

      setSummaries(assigned);
      setUnassignedSummary(unassigned || null);
    } catch (error: any) {
      console.error('Failed to load apartment expense summaries:', error);
      showToast(error.response?.data?.error || 'שגיאה בטעינת דוח הוצאות דירות', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadApartmentDetails = async (apartmentId: number) => {
    setDetailsLoading(true);
    setSelectedApartmentId(apartmentId);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apartmentsAPI.getExpenseDetails(apartmentId, params);
      setApartmentDetails(response.data);
    } catch (error: any) {
      console.error('Failed to load apartment expense details:', error);
      showToast(error.response?.data?.error || 'שגיאה בטעינת פרטי הוצאות', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedApartmentId(null);
    setApartmentDetails([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };

  const getExpenseTypeLabel = (type: string) => {
    switch (type) {
      case 'reimbursement': return 'החזר';
      case 'planned_expense': return 'תכנון';
      case 'direct_expense': return 'הוצאה ישירה';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.loading}>טוען...</div>
      </div>
    );
  }

  const selectedSummary = summaries.find(s => s.apartmentId === selectedApartmentId);

  return (
    <div style={styles.container}>
      <Navigation />
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>דוח הוצאות לפי דירות</h1>
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>תאריך התחלה</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>תאריך סיום</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>דירה ספציפית</label>
            <select
              value={filterApartmentId || ''}
              onChange={(e) => setFilterApartmentId(e.target.value ? Number(e.target.value) : undefined)}
              style={styles.select}
            >
              <option value="">כל הדירות</option>
              {summaries.map(s => (
                <option key={s.apartmentId} value={s.apartmentId}>
                  {s.apartmentName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Table */}
        <div style={styles.tableContainer}>
          <h2 style={styles.sectionTitle}>סיכום הוצאות לפי דירות</h2>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.tableHeader}>שם דירה</th>
                <th style={styles.tableHeader}>דיירים</th>
                <th style={styles.tableHeader}>החזרים ממתינים</th>
                <th style={styles.tableHeader}>החזרים מאושרים</th>
                <th style={styles.tableHeader}>החזרים ששולמו</th>
                <th style={styles.tableHeader}>תכנונים</th>
                <th style={styles.tableHeader}>הוצאות ישירות</th>
                <th style={styles.tableHeader}>סה"כ</th>
                <th style={styles.tableHeader}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 && (
                <tr>
                  <td colSpan={9} style={styles.emptyCell}>אין נתונים להצגה</td>
                </tr>
              )}
              {summaries.map((summary) => (
                <tr key={summary.apartmentId} style={styles.tableRow}>
                  <td style={styles.tableCell}>
                    <strong>{summary.apartmentName}</strong>
                  </td>
                  <td style={styles.tableCell}>{summary.residentCount} דיירים</td>
                  <td style={styles.tableCell}>{formatCurrency(summary.totalReimbursementsPending)}</td>
                  <td style={styles.tableCell}>{formatCurrency(summary.totalReimbursementsApproved)}</td>
                  <td style={styles.tableCell}>{formatCurrency(summary.totalReimbursementsPaid)}</td>
                  <td style={styles.tableCell}>{formatCurrency(summary.totalPlanned)}</td>
                  <td style={styles.tableCell}>{formatCurrency(summary.totalDirectExpenses)}</td>
                  <td style={{ ...styles.tableCell, fontWeight: 'bold' }}>
                    {formatCurrency(summary.grandTotal)}
                  </td>
                  <td style={styles.tableCell}>
                    <button
                      onClick={() => loadApartmentDetails(summary.apartmentId)}
                      style={styles.detailsButton}
                    >
                      פרטים
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Unassigned Expenses Table */}
        {unassignedSummary && unassignedSummary.grandTotal > 0 && (
          <div style={styles.tableContainer}>
            <h2 style={styles.sectionTitle}>הוצאות ללא דירה</h2>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.tableHeader}>החזרים ממתינים</th>
                  <th style={styles.tableHeader}>החזרים מאושרים</th>
                  <th style={styles.tableHeader}>החזרים ששולמו</th>
                  <th style={styles.tableHeader}>תכנונים</th>
                  <th style={styles.tableHeader}>הוצאות ישירות</th>
                  <th style={styles.tableHeader}>סה"כ</th>
                </tr>
              </thead>
              <tbody>
                <tr style={styles.tableRow}>
                  <td style={styles.tableCell}>{formatCurrency(unassignedSummary.totalReimbursementsPending)}</td>
                  <td style={styles.tableCell}>{formatCurrency(unassignedSummary.totalReimbursementsApproved)}</td>
                  <td style={styles.tableCell}>{formatCurrency(unassignedSummary.totalReimbursementsPaid)}</td>
                  <td style={styles.tableCell}>{formatCurrency(unassignedSummary.totalPlanned)}</td>
                  <td style={styles.tableCell}>{formatCurrency(unassignedSummary.totalDirectExpenses)}</td>
                  <td style={{ ...styles.tableCell, fontWeight: 'bold' }}>
                    {formatCurrency(unassignedSummary.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Details Modal */}
      {selectedApartmentId && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                פירוט הוצאות - {selectedSummary?.apartmentName}
              </h2>
              <button onClick={closeModal} style={styles.closeButton}>×</button>
            </div>

            {detailsLoading ? (
              <div style={styles.modalLoading}>טוען פרטים...</div>
            ) : (
              <div style={styles.modalContent}>
                {apartmentDetails.length === 0 ? (
                  <p style={styles.noData}>אין הוצאות להצגה בתקופה זו</p>
                ) : (
                  <table style={styles.detailsTable}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th style={styles.detailsTableHeader}>תאריך</th>
                        <th style={styles.detailsTableHeader}>סוג</th>
                        <th style={styles.detailsTableHeader}>סכום</th>
                        <th style={styles.detailsTableHeader}>תיאור</th>
                        <th style={styles.detailsTableHeader}>משתמש</th>
                        <th style={styles.detailsTableHeader}>סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apartmentDetails.map((detail, index) => (
                        <tr key={`${detail.type}-${detail.id}`} style={styles.detailsRow}>
                          <td style={styles.detailsCell}>{formatDate(detail.expenseDate)}</td>
                          <td style={styles.detailsCell}>{getExpenseTypeLabel(detail.type)}</td>
                          <td style={styles.detailsCell}>{formatCurrency(detail.amount)}</td>
                          <td style={styles.detailsCell}>{detail.description}</td>
                          <td style={styles.detailsCell}>{detail.userName || '-'}</td>
                          <td style={styles.detailsCell}>{detail.status || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f7fafc',
    direction: 'rtl',
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    fontSize: '18px',
    color: '#718096',
  },
  filters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    minWidth: '150px',
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    minWidth: '150px',
    cursor: 'pointer',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: '16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeaderRow: {
    backgroundColor: '#f7fafc',
  },
  tableHeader: {
    padding: '12px',
    textAlign: 'right',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    borderBottom: '2px solid #e2e8f0',
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
  },
  tableCell: {
    padding: '12px',
    fontSize: '14px',
    color: '#2d3748',
    textAlign: 'right',
  },
  emptyCell: {
    padding: '24px',
    textAlign: 'center',
    color: '#718096',
    fontSize: '14px',
  },
  detailsButton: {
    padding: '6px 12px',
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    maxWidth: '1000px',
    width: '90%',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '32px',
    color: '#718096',
    cursor: 'pointer',
    padding: 0,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  modalContent: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
  modalLoading: {
    padding: '40px',
    textAlign: 'center',
    color: '#718096',
  },
  noData: {
    textAlign: 'center',
    color: '#718096',
    padding: '40px',
  },
  detailsTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  detailsTableHeader: {
    padding: '10px',
    textAlign: 'right',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4a5568',
    borderBottom: '2px solid #e2e8f0',
    backgroundColor: '#f7fafc',
  },
  detailsRow: {
    borderBottom: '1px solid #e2e8f0',
  },
  detailsCell: {
    padding: '10px',
    fontSize: '13px',
    color: '#2d3748',
    textAlign: 'right',
  },
};
