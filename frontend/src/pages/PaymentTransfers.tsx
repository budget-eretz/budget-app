import { useEffect, useState } from 'react';
import { PaymentTransfer, PaymentTransferDetails, PaymentTransferStats } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Navigation from '../components/Navigation';
import PaymentTransferTable from '../components/PaymentTransferTable';
import PaymentTransferDetailsModal from '../components/PaymentTransferDetailsModal';
import Modal from '../components/Modal';
import api from '../services/api';

export default function PaymentTransfers() {
  const [activeTab, setActiveTab] = useState<'pending' | 'executed'>('pending');
  const [pendingTransfers, setPendingTransfers] = useState<PaymentTransfer[]>([]);
  const [executedTransfers, setExecutedTransfers] = useState<PaymentTransfer[]>([]);
  const [stats, setStats] = useState<PaymentTransferStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransferDetails, setSelectedTransferDetails] = useState<PaymentTransferDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);
  const [transferToExecute, setTransferToExecute] = useState<number | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Filters
  const [recipientFilter, setRecipientFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load transfers and stats
      const [transfersResponse, statsResponse] = await Promise.all([
        api.get('/payment-transfers'),
        api.get('/payment-transfers/stats'),
      ]);

      const transfers = transfersResponse.data as PaymentTransfer[];
      
      // Separate by status
      setPendingTransfers(transfers.filter(t => t.status === 'pending'));
      setExecutedTransfers(transfers.filter(t => t.status === 'executed'));
      setStats(statsResponse.data);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בטעינת נתוני העברות', 'error');
      console.error('Error loading payment transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferClick = async (transfer: PaymentTransfer) => {
    setLoadingDetails(true);
    setShowDetailsModal(true);
    
    try {
      const response = await api.get(`/payment-transfers/${transfer.id}`);
      setSelectedTransferDetails(response.data);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בטעינת פרטי העברה', 'error');
      console.error('Error loading transfer details:', error);
      setShowDetailsModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExecuteClick = (transferId: number) => {
    setTransferToExecute(transferId);
    setShowExecuteConfirm(true);
  };

  const handleExecuteConfirm = async () => {
    if (!transferToExecute) return;

    try {
      await api.post(`/payment-transfers/${transferToExecute}/execute`);
      showToast('ההעברה בוצעה בהצלחה', 'success');
      setShowExecuteConfirm(false);
      setTransferToExecute(null);
      setShowDetailsModal(false);
      await loadData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בביצוע העברה', 'error');
      console.error('Error executing transfer:', error);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    const value = amount || 0;
    return `₪${value.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Apply filters
  const filterTransfers = (transfers: PaymentTransfer[]): PaymentTransfer[] => {
    return transfers.filter(transfer => {
      // Recipient filter
      if (recipientFilter && !transfer.recipientName.toLowerCase().includes(recipientFilter.toLowerCase())) {
        return false;
      }

      // Date from filter
      if (dateFromFilter && new Date(transfer.createdAt) < new Date(dateFromFilter)) {
        return false;
      }

      // Date to filter
      if (dateToFilter && new Date(transfer.createdAt) > new Date(dateToFilter)) {
        return false;
      }

      return true;
    });
  };

  const clearFilters = () => {
    setRecipientFilter('');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const hasActiveFilters = recipientFilter || dateFromFilter || dateToFilter;

  if (loading) {
    return (
      <div style={styles.loading}>
        <div className="loading-spinner"></div>
        <p style={styles.loadingText}>טוען נתונים...</p>
      </div>
    );
  }

  const currentTransfers = activeTab === 'pending' ? pendingTransfers : executedTransfers;
  const filteredTransfers = filterTransfers(currentTransfers);

  return (
    <div style={styles.container}>
      <Navigation />

      <div style={styles.content}>
        {/* Page Header with Statistics */}
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>העברות</h1>
          
          {stats && (
            <div style={styles.statsContainer}>
              <div style={styles.statCard} className="stat-card">
                <div style={styles.statLabel}>ממתינות לביצוע</div>
                <div style={styles.statValue}>{stats.pendingCount}</div>
                <div style={styles.statAmount}>{formatCurrency(stats.pendingTotalAmount)}</div>
              </div>
              <div style={styles.statCard} className="stat-card">
                <div style={styles.statLabel}>בוצעו</div>
                <div style={styles.statValue}>{stats.executedCount}</div>
                <div style={styles.statAmount}>{formatCurrency(stats.executedTotalAmount)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'pending' ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab('pending')}
          >
            ממתינות לביצוע ({pendingTransfers.length})
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'executed' ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab('executed')}
          >
            בוצעו ({executedTransfers.length})
          </button>
        </div>

        {/* Filters */}
        <div style={styles.filtersContainer}>
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>מקבל תשלום</label>
              <input
                type="text"
                style={styles.filterInput}
                placeholder="חפש לפי שם..."
                value={recipientFilter}
                onChange={(e) => setRecipientFilter(e.target.value)}
              />
            </div>
            
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>מתאריך</label>
              <input
                type="date"
                style={styles.filterInput}
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>
            
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>עד תאריך</label>
              <input
                type="date"
                style={styles.filterInput}
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
            </div>

            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="secondary"
                style={styles.clearFiltersButton}
              >
                נקה סינון
              </Button>
            )}
          </div>
        </div>

        {/* Transfer Table */}
        {filteredTransfers.length === 0 ? (
          <div style={styles.emptyState}>
            {hasActiveFilters ? (
              <>
                <p style={styles.emptyText}>לא נמצאו העברות התואמות את הסינון</p>
                <Button onClick={clearFilters} variant="secondary">נקה סינון</Button>
              </>
            ) : (
              <p style={styles.emptyText}>
                {activeTab === 'pending' 
                  ? 'אין העברות ממתינות לביצוע'
                  : 'אין העברות שבוצעו'}
              </p>
            )}
          </div>
        ) : (
          <PaymentTransferTable
            transfers={filteredTransfers}
            onTransferClick={handleTransferClick}
            onExecute={handleExecuteClick}
            showExecuteAction={activeTab === 'pending'}
          />
        )}

        {/* Details Modal */}
        {selectedTransferDetails && !loadingDetails && (
          <PaymentTransferDetailsModal
            transfer={selectedTransferDetails}
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedTransferDetails(null);
            }}
            onExecute={handleExecuteClick}
            canExecute={selectedTransferDetails.status === 'pending'}
          />
        )}

        {/* Execute Confirmation Modal */}
        <Modal
          isOpen={showExecuteConfirm}
          onClose={() => {
            setShowExecuteConfirm(false);
            setTransferToExecute(null);
          }}
          title="אישור ביצוע העברה"
        >
          <div style={styles.confirmContent}>
            <p style={styles.confirmText}>
              האם אתה בטוח שברצונך לבצע העברה זו?
            </p>
            <p style={styles.confirmSubtext}>
              כל ההחזרים המשויכים להעברה יסומנו כשולמו.
            </p>
            <div style={styles.confirmActions}>
              <Button
                onClick={handleExecuteConfirm}
                variant="primary"
              >
                אשר ביצוע
              </Button>
              <Button
                onClick={() => {
                  setShowExecuteConfirm(false);
                  setTransferToExecute(null);
                }}
                variant="secondary"
              >
                ביטול
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '20px',
  },
  loadingText: {
    fontSize: '18px',
    color: '#4a5568',
    fontWeight: '500',
  },
  container: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  content: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  pageHeader: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 0 24px 0',
    color: '#2d3748',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  statCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  statLabel: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '8px',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: '4px',
  },
  statAmount: {
    fontSize: '18px',
    color: '#667eea',
    fontWeight: '600',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #e2e8f0',
  },
  tab: {
    padding: '12px 24px',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    fontSize: '16px',
    fontWeight: '500',
    color: '#718096',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeTab: {
    color: '#667eea',
    borderBottomColor: '#667eea',
  },
  filtersContainer: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  filterRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: '1',
    minWidth: '200px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
  },
  filterInput: {
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  clearFiltersButton: {
    marginBottom: '2px',
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
    fontSize: '18px',
    color: '#718096',
    marginBottom: '20px',
  },
  confirmContent: {
    padding: '20px 0',
  },
  confirmText: {
    fontSize: '16px',
    color: '#2d3748',
    marginBottom: '12px',
    fontWeight: '500',
  },
  confirmSubtext: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '24px',
  },
  confirmActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
};
