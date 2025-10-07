import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reimbursementsAPI } from '../services/api';
import { Reimbursement, ReimbursementsByStatus, GroupByOption } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Navigation from '../components/Navigation';
import RejectionModal from '../components/RejectionModal';
import FilterBar from '../components/FilterBar';
import ActionBar from '../components/ActionBar';
import ReimbursementTable from '../components/ReimbursementTable';
import ReimbursementDetailsModal from '../components/ReimbursementDetailsModal';

export default function Payments() {
  // State management - Task 13.1
  const [data, setData] = useState<ReimbursementsByStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupByOption>('status'); // Will be used in task 14.3
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set()); // Will be used in task 15
  const [activeModal, setActiveModal] = useState<'details' | 'rejection' | null>(null); // Will be used in task 15.8
  const [selectedReimbursement, setSelectedReimbursement] = useState<Reimbursement | null>(null); // Will be used in task 15.8
  
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Load data on mount and when groupBy changes
  useEffect(() => {
    loadData();
  }, [groupBy]);

  // Data loading function
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await reimbursementsAPI.getTreasurerAll(groupBy);
      setData(response.data);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בטעינת נתוני ההעברות', 'error');
      console.error('Error loading treasurer data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Selection logic - Task 13.3
  const handleSelect = (ids: number[]) => {
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Task 14.1: Handle actions on selected reimbursements
  const handleAction = async (action: string, ids?: number[]) => {
    const targetIds = ids || Array.from(selectedIds);
    
    if (targetIds.length === 0) {
      showToast('לא נבחרו החזרים', 'error');
      return;
    }

    // Handle details action separately
    if (action === 'details' && targetIds.length === 1) {
      const reimbursement = getAllReimbursements().find(r => r.id === targetIds[0]);
      if (reimbursement) {
        setSelectedReimbursement(reimbursement);
        setActiveModal('details');
      }
      return;
    }

    try {
      switch (action) {
        case 'approve':
          await reimbursementsAPI.batchApprove(targetIds);
          showToast(`${targetIds.length} החזרים אושרו בהצלחה`, 'success');
          break;

        case 'reject':
          // This will be handled by handleReject (Task 14.2)
          // Open rejection modal instead of direct action
          setActiveModal('rejection');
          return; // Don't reload data yet, wait for modal confirmation

        case 'mark-review':
          await reimbursementsAPI.batchMarkForReview(targetIds);
          showToast(`${targetIds.length} החזרים סומנו לבדיקה`, 'success');
          break;

        case 'mark-paid':
          await reimbursementsAPI.batchMarkAsPaid(targetIds);
          showToast(`${targetIds.length} החזרים סומנו כשולמו`, 'success');
          break;

        case 'return-pending':
          // Return each reimbursement to pending status
          for (const id of targetIds) {
            await reimbursementsAPI.returnToPending(id);
          }
          showToast(`${targetIds.length} החזרים הוחזרו לממתין`, 'success');
          break;

        default:
          showToast('פעולה לא מוכרת', 'error');
          return;
      }

      // Reload data after successful action
      await loadData();
      
      // Clear selection
      clearSelection();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בביצוע הפעולה', 'error');
      console.error('Error performing action:', error);
    }
  };

  // Task 14.2: Handle rejection with reason
  const handleReject = async (rejectionReason: string) => {
    const targetIds = Array.from(selectedIds);
    
    if (targetIds.length === 0) {
      showToast('לא נבחרו החזרים', 'error');
      setActiveModal(null);
      return;
    }

    try {
      await reimbursementsAPI.batchReject(targetIds, rejectionReason);
      showToast(`${targetIds.length} החזרים נדחו`, 'success');
      
      // Close modal
      setActiveModal(null);
      
      // Reload data
      await loadData();
      
      // Clear selection
      clearSelection();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בדחיית ההחזרים', 'error');
      console.error('Error rejecting reimbursements:', error);
    }
  };

  // Task 14.3: Handle groupBy change
  const handleGroupByChange = (newGroupBy: GroupByOption) => {
    setGroupBy(newGroupBy);
    // Data will be reloaded automatically via useEffect
  };

  // Helper function to get all reimbursements as a flat array
  const getAllReimbursements = (): Reimbursement[] => {
    if (!data) return [];
    return [
      ...data.pending,
      ...data.under_review,
      ...data.approved,
      ...data.rejected,
      ...data.paid,
    ];
  };

  // Helper function to calculate available actions based on selected reimbursements
  const getAvailableActions = (): string[] => {
    if (selectedIds.size === 0) return [];
    
    const allReimbursements = getAllReimbursements();
    const selectedReimbursements = allReimbursements.filter(r => selectedIds.has(r.id));
    
    // Get unique statuses of selected reimbursements
    const statuses = new Set(selectedReimbursements.map(r => r.status));
    
    // If all selected are pending
    if (statuses.size === 1 && statuses.has('pending')) {
      return ['approve', 'reject', 'mark-review'];
    }
    
    // If all selected are under_review
    if (statuses.size === 1 && statuses.has('under_review')) {
      return ['approve', 'reject', 'return-pending'];
    }
    
    // If all selected are approved
    if (statuses.size === 1 && statuses.has('approved')) {
      return ['mark-paid'];
    }
    
    // Mixed statuses or other statuses - no batch actions available
    return [];
  };

  // Helper function to calculate total amount of selected reimbursements
  const getSelectedTotalAmount = (): number => {
    if (selectedIds.size === 0) return 0;
    
    const allReimbursements = getAllReimbursements();
    const selectedReimbursements = allReimbursements.filter(r => selectedIds.has(r.id));
    
    return selectedReimbursements.reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);
  };

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div className="loading-spinner"></div>
        <p style={styles.loadingText}>טוען נתונים...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.content}>
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>לא ניתן לטעון נתונים</p>
            <Button onClick={() => navigate('/dashboard')}>חזרה לדשבורד</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Navigation />

      <div style={styles.content}>
        {/* Task 15.1: PageHeader */}
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>ניהול העברות</h1>
          <div style={styles.statsContainer}>
            <div style={styles.statCard} className="stat-card">
              <div style={styles.statLabel}>ממתינים לאישור</div>
              <div style={styles.statValue}>{data.summary.pendingCount}</div>
              <div style={styles.statAmount}>{formatCurrency(data.summary.totalPendingAmount)}</div>
            </div>
            <div style={styles.statCard} className="stat-card">
              <div style={styles.statLabel}>לבדיקה</div>
              <div style={styles.statValue}>{data.summary.underReviewCount}</div>
            </div>
            <div style={styles.statCard} className="stat-card">
              <div style={styles.statLabel}>אושרו</div>
              <div style={styles.statValue}>{data.summary.approvedCount}</div>
              <div style={styles.statAmount}>{formatCurrency(data.summary.totalApprovedAmount)}</div>
            </div>
            <div style={styles.statCard} className="stat-card">
              <div style={styles.statLabel}>נדחו</div>
              <div style={styles.statValue}>{data.summary.rejectedCount}</div>
            </div>
          </div>
        </div>

        {/* Task 15.2: FilterBar */}
        <FilterBar groupBy={groupBy} onGroupByChange={handleGroupByChange} />

        {/* Task 15.3: ActionBar (conditional) */}
        {selectedIds.size > 0 && (
          <ActionBar
            selectedCount={selectedIds.size}
            totalAmount={getSelectedTotalAmount()}
            availableActions={getAvailableActions()}
            onAction={handleAction}
          />
        )}

        {/* Task 15.4: Pending Section */}
        <div style={styles.section} className="section-animate">
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              ממתינים לאישור ({data.pending.length})
            </h2>
            <span style={{...styles.statusBadge, ...styles.statusPending}}>⏳</span>
          </div>
          {data.pending.length === 0 ? (
            <div style={styles.emptyMessage} className="empty-message">אין החזרים ממתינים לאישור</div>
          ) : (
            <ReimbursementTable
              reimbursements={data.pending}
              status="pending"
              onSelect={handleSelect}
              selectedIds={Array.from(selectedIds)}
              onAction={handleAction}
            />
          )}
        </div>

        {/* Task 15.5: Under Review Section */}
        <div style={styles.section} className="section-animate">
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              לבדיקה ({data.under_review.length})
            </h2>
            <span style={{...styles.statusBadge, ...styles.statusUnderReview}}>🔍</span>
          </div>
          {data.under_review.length === 0 ? (
            <div style={styles.emptyMessage} className="empty-message">אין החזרים לבדיקה</div>
          ) : (
            <ReimbursementTable
              reimbursements={data.under_review}
              status="under_review"
              onSelect={handleSelect}
              selectedIds={Array.from(selectedIds)}
              onAction={handleAction}
            />
          )}
        </div>

        {/* Task 15.6: Approved Section */}
        <div style={styles.section} className="section-animate">
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              אושרו ({data.approved.length})
            </h2>
            <span style={{...styles.statusBadge, ...styles.statusApproved}}>✓</span>
          </div>
          {data.approved.length === 0 ? (
            <div style={styles.emptyMessage} className="empty-message">אין החזרים מאושרים</div>
          ) : (
            <ReimbursementTable
              reimbursements={data.approved}
              status="approved"
              onSelect={handleSelect}
              selectedIds={Array.from(selectedIds)}
              onAction={handleAction}
            />
          )}
        </div>

        {/* Task 15.7: Rejected Section */}
        <div style={styles.section} className="section-animate">
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              נדחו ({data.rejected.length})
            </h2>
            <span style={{...styles.statusBadge, ...styles.statusRejected}}>✗</span>
          </div>
          {data.rejected.length === 0 ? (
            <div style={styles.emptyMessage} className="empty-message">אין החזרים נדחים</div>
          ) : (
            <ReimbursementTable
              reimbursements={data.rejected}
              status="rejected"
              onSelect={handleSelect}
              selectedIds={Array.from(selectedIds)}
              onAction={handleAction}
            />
          )}
        </div>

        {/* Task 15.8: Modals */}
        <RejectionModal
          isOpen={activeModal === 'rejection'}
          onClose={() => setActiveModal(null)}
          onConfirm={handleReject}
          count={selectedIds.size}
        />

        {selectedReimbursement && (
          <ReimbursementDetailsModal
            isOpen={activeModal === 'details'}
            onClose={() => {
              setActiveModal(null);
              setSelectedReimbursement(null);
            }}
            reimbursement={selectedReimbursement}
          />
        )}
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
  // Task 15.1: PageHeader styles
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  statCard: {
    background: 'white',
    padding: '20px',
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
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: '4px',
  },
  statAmount: {
    fontSize: '16px',
    color: '#667eea',
    fontWeight: '600',
  },
  // Task 15.4-15.7: Section styles
  section: {
    marginBottom: '32px',
  },
  sectionHeader: {
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  emptyMessage: {
    background: 'white',
    padding: '40px',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#718096',
    fontSize: '16px',
    border: '1px solid #e2e8f0',
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
  // Task 16.1: Status badge styles
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '16px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPending: {
    background: '#fef3c7',
    color: '#92400e',
  },
  statusUnderReview: {
    background: '#dbeafe',
    color: '#1e40af',
  },
  statusApproved: {
    background: '#d1fae5',
    color: '#065f46',
  },
  statusRejected: {
    background: '#fee2e2',
    color: '#991b1b',
  },
};
