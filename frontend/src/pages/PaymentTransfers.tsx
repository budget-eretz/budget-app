import { useEffect, useState } from 'react';
import { PaymentTransfer, PaymentTransferDetails, PaymentTransferStats, RecurringTransfer, DirectExpense } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Navigation from '../components/Navigation';
import PaymentTransferTable from '../components/PaymentTransferTable';
import PaymentTransferDetailsModal from '../components/PaymentTransferDetailsModal';
import RecurringTransferFormModal from '../components/RecurringTransferFormModal';
import RecurringTransferTable from '../components/RecurringTransferTable';
import DirectExpenseFormModal from '../components/DirectExpenseFormModal';
import DirectExpenseTable from '../components/DirectExpenseTable';
import Modal from '../components/Modal';
import api, { recurringTransfersAPI, directExpensesAPI, paymentTransfersAPI } from '../services/api';

export default function PaymentTransfers() {
  const [activeTab, setActiveTab] = useState<'pending' | 'executed' | 'recurring' | 'direct'>('pending');
  const [pendingTransfers, setPendingTransfers] = useState<PaymentTransfer[]>([]);
  const [executedTransfers, setExecutedTransfers] = useState<PaymentTransfer[]>([]);
  const [stats, setStats] = useState<PaymentTransferStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransferDetails, setSelectedTransferDetails] = useState<PaymentTransferDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);
  const [transferToExecute, setTransferToExecute] = useState<number | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Recurring transfers state
  const [recurringTransfers, setRecurringTransfers] = useState<RecurringTransfer[]>([]);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransfer | undefined>(undefined);
  const [savingRecurring, setSavingRecurring] = useState(false);

  // Direct expense state
  const [showDirectExpenseForm, setShowDirectExpenseForm] = useState(false);
  const [directExpenses, setDirectExpenses] = useState<DirectExpense[]>([]);
  const [editingDirectExpense, setEditingDirectExpense] = useState<DirectExpense | undefined>(undefined);

  // Generate recurring state
  const [generatingRecurring, setGeneratingRecurring] = useState(false);

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
      // Load transfers, stats, recurring transfers, and direct expenses
      const [transfersResponse, statsResponse, recurringResponse, directExpensesResponse] = await Promise.all([
        api.get('/payment-transfers'),
        api.get('/payment-transfers/stats'),
        recurringTransfersAPI.getAll(),
        directExpensesAPI.getAll(),
      ]);

      const transfers = transfersResponse.data as PaymentTransfer[];

      // Separate by status
      setPendingTransfers(transfers.filter(t => t.status === 'pending'));
      setExecutedTransfers(transfers.filter(t => t.status === 'executed'));
      setStats(statsResponse.data);
      setRecurringTransfers(recurringResponse.data);
      setDirectExpenses(directExpensesResponse.data);
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

  // Check if the transfer has negative amount (more charges than reimbursements)
  const isNegativeTransfer = () => {
    if (!transferToExecute) return false;
    const transfer = pendingTransfers.find(t => t.id === transferToExecute);
    return transfer && parseFloat(transfer.totalAmount.toString()) < 0;
  };

  const getTransferRecipientName = () => {
    if (!transferToExecute) return '';
    const transfer = pendingTransfers.find(t => t.id === transferToExecute);
    return transfer?.recipientName || '';
  };

  const getTransferAmount = () => {
    if (!transferToExecute) return 0;
    const transfer = pendingTransfers.find(t => t.id === transferToExecute);
    return transfer ? Math.abs(parseFloat(transfer.totalAmount.toString())) : 0;
  };

  const handleExecuteConfirm = async () => {
    if (!transferToExecute) return;

    try {
      const response = await api.post(`/payment-transfers/${transferToExecute}/execute`);

      // Check if this was a negative transfer (carry-forward debt)
      if (response.data.carryForwardDebt) {
        showToast(
          `יתרת חוב בסך ${formatCurrency(response.data.carryForwardDebt)} נשמרה להעברה הבאה`,
          'success'
        );
      } else {
        showToast('ההעברה בוצעה בהצלחה', 'success');
      }

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

  // Recurring transfer handlers
  const handleAddRecurring = () => {
    setEditingRecurring(undefined);
    setShowRecurringForm(true);
  };

  const handleEditRecurring = (transfer: RecurringTransfer) => {
    setEditingRecurring(transfer);
    setShowRecurringForm(true);
  };

  const handleRecurringSubmit = async (data: any) => {
    setSavingRecurring(true);
    try {
      if (editingRecurring) {
        await recurringTransfersAPI.update(editingRecurring.id, data);
        showToast('העברה קבועה עודכנה בהצלחה', 'success');
      } else {
        await recurringTransfersAPI.create(data);
        showToast('העברה קבועה נוספה בהצלחה', 'success');
      }
      setShowRecurringForm(false);
      setEditingRecurring(undefined);
      await loadData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בשמירת העברה קבועה', 'error');
      console.error('Error saving recurring transfer:', error);
    } finally {
      setSavingRecurring(false);
    }
  };

  const handleToggleRecurringStatus = async (transfer: RecurringTransfer) => {
    const newStatus = transfer.status === 'active' ? 'paused' : 'active';
    try {
      await recurringTransfersAPI.update(transfer.id, { status: newStatus });
      showToast(`העברה ${newStatus === 'active' ? 'הופעלה' : 'הושהתה'} בהצלחה`, 'success');
      await loadData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בעדכון סטטוס', 'error');
      console.error('Error toggling status:', error);
    }
  };

  const handleDeleteRecurring = async (transfer: RecurringTransfer) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ההעברה הקבועה ל-${transfer.recipientName}?`)) {
      return;
    }

    try {
      await recurringTransfersAPI.delete(transfer.id);
      showToast('העברה קבועה נמחקה בהצלחה', 'success');
      await loadData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה במחיקת העברה קבועה', 'error');
      console.error('Error deleting recurring transfer:', error);
    }
  };

  // Direct expense handlers
  const handleAddDirectExpense = () => {
    setEditingDirectExpense(undefined);
    setShowDirectExpenseForm(true);
  };

  const handleEditDirectExpense = (expense: DirectExpense) => {
    setEditingDirectExpense(expense);
    setShowDirectExpenseForm(true);
  };

  const handleDeleteDirectExpense = async (expense: DirectExpense) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את ההוצאה הישירה ל-${expense.payee}?`)) {
      return;
    }

    try {
      await directExpensesAPI.delete(expense.id);
      showToast('הוצאה ישירה נמחקה בהצלחה', 'success');
      await loadData();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה במחיקת הוצאה ישירה', 'error');
      console.error('Error deleting direct expense:', error);
    }
  };

  // Generate payment transfers for users with recurring transfers
  const handleGenerateRecurring = async () => {
    setGeneratingRecurring(true);
    try {
      const response = await paymentTransfersAPI.generateRecurring();
      if (response.data.count > 0) {
        showToast(`נוצרו/עודכנו ${response.data.count} העברות קבועות`, 'success');
        await loadData();
      } else {
        showToast('אין העברות קבועות חדשות לייצור', 'info');
      }
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה ביצירת העברות קבועות', 'error');
      console.error('Error generating recurring transfers:', error);
    } finally {
      setGeneratingRecurring(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div className="loading-spinner"></div>
        <p style={styles.loadingText}>טוען נתונים...</p>
      </div>
    );
  }

  const currentTransfers = activeTab === 'recurring' || activeTab === 'direct' ? [] : (activeTab === 'pending' ? pendingTransfers : executedTransfers);
  const filteredTransfers = activeTab === 'recurring' || activeTab === 'direct' ? [] : filterTransfers(currentTransfers);

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
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'recurring' ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab('recurring')}
          >
            העברות קבועות ({recurringTransfers.length})
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'direct' ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab('direct')}
          >
            הוצאות ישירות ({directExpenses.length})
          </button>
        </div>

        {/* Filters - only show for pending/executed tabs */}
        {activeTab !== 'recurring' && activeTab !== 'direct' && (
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
        )}

        {/* Generate Recurring Button - only show in pending tab */}
        {activeTab === 'pending' && (
          <div style={{ marginBottom: '20px' }}>
            <Button
              onClick={handleGenerateRecurring}
              variant="secondary"
              disabled={generatingRecurring}
            >
              {generatingRecurring ? 'מרענן...' : 'רענן העברות קבועות'}
            </Button>
          </div>
        )}

        {/* Add Recurring Transfer and Direct Expense Buttons - only show in recurring tab */}
        {activeTab === 'recurring' && (
          <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
            <Button onClick={handleAddRecurring} variant="primary">
              + הוסף העברה קבועה חדשה
            </Button>
            <Button onClick={handleAddDirectExpense} variant="secondary">
              + הוסף הוצאה ישירה
            </Button>
          </div>
        )}

        {/* Add Direct Expense Button - only show in direct tab */}
        {activeTab === 'direct' && (
          <div style={{ marginBottom: '20px' }}>
            <Button onClick={handleAddDirectExpense} variant="primary">
              + הוסף הוצאה ישירה חדשה
            </Button>
          </div>
        )}

        {/* Transfer Table or Recurring Transfers Table or Direct Expenses Table */}
        {activeTab === 'recurring' ? (
          <RecurringTransferTable
            transfers={recurringTransfers}
            onEdit={handleEditRecurring}
            onDelete={handleDeleteRecurring}
            onToggleStatus={handleToggleRecurringStatus}
            showActions={true}
          />
        ) : activeTab === 'direct' ? (
          <DirectExpenseTable
            expenses={directExpenses}
            onEdit={handleEditDirectExpense}
            onDelete={handleDeleteDirectExpense}
            showActions={true}
          />
        ) : filteredTransfers.length === 0 ? (
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
          title={isNegativeTransfer() ? "⚠️ יתרת חוב" : "אישור ביצוע העברה"}
        >
          <div style={styles.confirmContent}>
            {isNegativeTransfer() ? (
              <>
                <p style={styles.confirmText}>
                  נראה שלחבר.ה <strong>{getTransferRecipientName()}</strong> יש יתרת חוב למעגל בסך <strong>{formatCurrency(getTransferAmount())}</strong>.
                </p>
                <p style={styles.confirmSubtext}>
                  לכן העברה זו תמחק ויתרת החוב תעבור להעברה הבאה.
                </p>
                <p style={styles.confirmSubtext}>
                  האם את.ה מאשר.ת?
                </p>
              </>
            ) : (
              <>
                <p style={styles.confirmText}>
                  האם אתה בטוח שברצונך לבצע העברה זו?
                </p>
                <p style={styles.confirmSubtext}>
                  כל ההחזרים והחיובים המשויכים להעברה יסומנו כשולמו.
                </p>
              </>
            )}
            <div style={styles.confirmActions}>
              <Button
                onClick={handleExecuteConfirm}
                variant="primary"
              >
                {isNegativeTransfer() ? "אשר מחיקה" : "אשר ביצוע"}
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

        {/* Recurring Transfer Form Modal */}
        <RecurringTransferFormModal
          isOpen={showRecurringForm}
          onClose={() => {
            setShowRecurringForm(false);
            setEditingRecurring(undefined);
          }}
          onSubmit={handleRecurringSubmit}
          transfer={editingRecurring}
          isLoading={savingRecurring}
        />

        {/* Direct Expense Form Modal */}
        <DirectExpenseFormModal
          isOpen={showDirectExpenseForm}
          onClose={() => {
            setShowDirectExpenseForm(false);
            setEditingDirectExpense(undefined);
          }}
          onSuccess={async () => {
            await loadData();
          }}
          expense={editingDirectExpense}
        />
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
