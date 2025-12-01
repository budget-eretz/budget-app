import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reimbursementsAPI, chargesAPI } from '../services/api';
import { Reimbursement, ReimbursementsByStatus, Charge, ChargesByStatus, GroupByOption } from '../types';
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
  const [chargesData, setChargesData] = useState<ChargesByStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupByOption>('status'); // Will be used in task 14.3
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set()); // Will be used in task 15
  const [selectedChargeIds, setSelectedChargeIds] = useState<Set<number>>(new Set());
  const [pendingActionIds, setPendingActionIds] = useState<number[]>([]); // Store IDs for modal actions
  const [isRejectingCharge, setIsRejectingCharge] = useState(false); // Track if rejecting charge or reimbursement
  const [activeModal, setActiveModal] = useState<'details' | 'rejection' | null>(null); // Will be used in task 15.8
  const [selectedReimbursement, setSelectedReimbursement] = useState<Reimbursement | null>(null); // Will be used in task 15.8
  const isRejectingChargeRef = React.useRef(false); // Ref to track rejection type reliably
  const [activeTable, setActiveTable] = useState<string | null>(null); // Track which table has active selection
  
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
      const [reimbursementsResponse, chargesResponse] = await Promise.all([
        reimbursementsAPI.getTreasurerAll(groupBy),
        chargesAPI.getTreasurerAll(groupBy),
      ]);
      setData(reimbursementsResponse.data);
      setChargesData(chargesResponse.data);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בטעינת נתוני ההעברות', 'error');
      console.error('Error loading treasurer data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Selection logic - Task 13.3
  const handleSelect = (ids: number[], tableName: string) => {
    setSelectedIds(new Set(ids));
    setActiveTable(ids.length > 0 ? tableName : null);
  };

  const handleSelectCharges = (ids: number[], tableName: string) => {
    setSelectedChargeIds(new Set(ids));
    setActiveTable(ids.length > 0 ? tableName : null);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectedChargeIds(new Set());
    setActiveTable(null);
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
          isRejectingChargeRef.current = false;
          setPendingActionIds(targetIds);
          setIsRejectingCharge(false);
          setActiveModal('rejection');
          return; // Don't reload data yet, wait for modal confirmation

        case 'mark-review':
          await reimbursementsAPI.batchMarkForReview(targetIds);
          showToast(`${targetIds.length} החזרים סומנו לבדיקה`, 'success');
          break;

        // mark-paid action removed - now handled by payment transfers

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
    const targetIds = pendingActionIds.length > 0 ? pendingActionIds : Array.from(selectedIds);
    
    if (targetIds.length === 0) {
      showToast('לא נבחרו החזרים', 'error');
      setActiveModal(null);
      setPendingActionIds([]);
      return;
    }

    try {
      await reimbursementsAPI.batchReject(targetIds, rejectionReason);
      showToast(`${targetIds.length} החזרים נדחו`, 'success');
      
      // Close modal
      setActiveModal(null);
      setPendingActionIds([]);
      
      // Reload data
      await loadData();
      
      // Clear selection
      clearSelection();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בדחיית ההחזרים', 'error');
      console.error('Error rejecting reimbursements:', error);
    }
  };

  // Handle charge actions
  const handleChargeAction = async (action: string, ids?: number[]) => {
    const targetIds = ids || Array.from(selectedChargeIds);
    
    if (targetIds.length === 0) {
      showToast('לא נבחרו חיובים', 'error');
      return;
    }

    try {
      switch (action) {
        case 'approve':
          await chargesAPI.batchApprove(targetIds);
          showToast(`${targetIds.length} חיובים אושרו בהצלחה`, 'success');
          break;

        case 'reject':
          isRejectingChargeRef.current = true;
          setIsRejectingCharge(true);
          setPendingActionIds(targetIds);
          setActiveModal('rejection');
          return;

        case 'mark-review':
          await chargesAPI.batchMarkForReview(targetIds);
          showToast(`${targetIds.length} חיובים סומנו לבדיקה`, 'success');
          break;

        case 'return-pending':
          for (const id of targetIds) {
            await chargesAPI.returnToPending(id);
          }
          showToast(`${targetIds.length} חיובים הוחזרו לממתין`, 'success');
          break;

        default:
          showToast('פעולה לא מוכרת', 'error');
          return;
      }

      await loadData();
      clearSelection();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בביצוע הפעולה', 'error');
      console.error('Error performing charge action:', error);
    }
  };

  const handleRejectCharges = async (rejectionReason: string) => {
    const targetIds = pendingActionIds.length > 0 ? pendingActionIds : Array.from(selectedChargeIds);
    
    if (targetIds.length === 0) {
      showToast('לא נבחרו חיובים', 'error');
      setActiveModal(null);
      setPendingActionIds([]);
      setIsRejectingCharge(false);
      isRejectingChargeRef.current = false;
      return;
    }

    try {
      await chargesAPI.batchReject(targetIds, rejectionReason);
      showToast(`${targetIds.length} חיובים נדחו`, 'success');
      
      setActiveModal(null);
      setPendingActionIds([]);
      setIsRejectingCharge(false);
      isRejectingChargeRef.current = false;
      await loadData();
      clearSelection();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בדחיית החיובים', 'error');
      console.error('Error rejecting charges:', error);
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
    
    // If all selected are approved - allow returning to pending or review
    if (statuses.size === 1 && statuses.has('approved')) {
      return ['return-pending', 'mark-review'];
    }
    
    // If all selected are rejected - allow returning to pending
    if (statuses.size === 1 && statuses.has('rejected')) {
      return ['return-pending'];
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

  // Helper functions for charges
  const getAllCharges = (): Charge[] => {
    if (!chargesData) return [];
    return [
      ...chargesData.pending,
      ...chargesData.under_review,
      ...chargesData.approved,
      ...chargesData.rejected,
      ...chargesData.paid,
    ];
  };

  const getSelectedChargesTotalAmount = (): number => {
    if (selectedChargeIds.size === 0) return 0;
    
    const allCharges = getAllCharges();
    const selectedCharges = allCharges.filter(c => selectedChargeIds.has(c.id));
    
    return selectedCharges.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);
  };

  const getAvailableChargeActions = (): string[] => {
    if (selectedChargeIds.size === 0) return [];
    
    const allCharges = getAllCharges();
    const selectedCharges = allCharges.filter(c => selectedChargeIds.has(c.id));
    
    const statuses = new Set(selectedCharges.map(c => c.status));
    
    if (statuses.size === 1 && statuses.has('pending')) {
      return ['approve', 'reject', 'mark-review'];
    }
    
    if (statuses.size === 1 && statuses.has('under_review')) {
      return ['approve', 'reject', 'return-pending'];
    }
    
    if (statuses.size === 1 && statuses.has('approved')) {
      return ['return-pending', 'mark-review'];
    }
    
    if (statuses.size === 1 && statuses.has('rejected')) {
      return ['return-pending'];
    }
    
    return [];
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
          <div style={styles.titleRow}>
            <h1 style={styles.title}>אישור החזרים</h1>
            <Button onClick={() => navigate('/payment-transfers')} style={styles.transfersButton}>
              עבור להעברות →
            </Button>
          </div>
          <div style={styles.statsContainer}>
            <div style={styles.statCard} className="stat-card">
              <div style={styles.statLabel}>ממתינים לאישור</div>
              <div style={styles.statValue}>
                {data.summary.pendingCount}
                {chargesData && chargesData.summary.pendingCount > 0 && (
                  <span style={styles.chargesBadge}> +{chargesData.summary.pendingCount} חיובים</span>
                )}
              </div>
              <div style={styles.statAmount}>{formatCurrency(data.summary.totalPendingAmount)}</div>
            </div>
            <div style={styles.statCard} className="stat-card">
              <div style={styles.statLabel}>לבדיקה</div>
              <div style={styles.statValue}>
                {data.summary.underReviewCount}
                {chargesData && chargesData.summary.underReviewCount > 0 && (
                  <span style={styles.chargesBadge}> +{chargesData.summary.underReviewCount} חיובים</span>
                )}
              </div>
            </div>
            <div style={styles.statCard} className="stat-card">
              <div style={styles.statLabel}>אושרו</div>
              <div style={styles.statValue}>
                {data.summary.approvedCount}
                {chargesData && chargesData.summary.approvedCount > 0 && (
                  <span style={styles.chargesBadge}> +{chargesData.summary.approvedCount} חיובים</span>
                )}
              </div>
              <div style={styles.statAmount}>{formatCurrency(data.summary.totalApprovedAmount)}</div>
            </div>
            <div style={styles.statCard} className="stat-card">
              <div style={styles.statLabel}>נדחו</div>
              <div style={styles.statValue}>
                {data.summary.rejectedCount}
                {chargesData && chargesData.summary.rejectedCount > 0 && (
                  <span style={styles.chargesBadge}> +{chargesData.summary.rejectedCount} חיובים</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Task 15.2: FilterBar */}
        <FilterBar groupBy={groupBy} onGroupByChange={handleGroupByChange} />

        {/* Task 15.4: Pending Section */}
        <div style={styles.section} className="section-animate">
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              ממתינים לאישור ({data.pending.length})
            </h2>
            <span style={{...styles.statusBadge, ...styles.statusPending}}>⏳</span>
          </div>
          {activeTable && activeTable !== 'reimbursements-pending' ? (
            <div style={styles.blockedMessage}>
              מצב בחירה מרובה מופעל בטבלה "{activeTable}". לא ניתן לעבוד בכמה טבלאות במקביל.
            </div>
          ) : (
            <>
              {selectedIds.size > 0 && activeTable === 'reimbursements-pending' && (
                <ActionBar
                  selectedCount={selectedIds.size}
                  totalAmount={getSelectedTotalAmount()}
                  availableActions={getAvailableActions()}
                  onAction={handleAction}
                  onClearSelection={clearSelection}
                  tableName="ממתינים לאישור"
                />
              )}
              {data.pending.length === 0 ? (
                <div style={styles.emptyMessage} className="empty-message">אין החזרים ממתינים לאישור</div>
              ) : (
                <ReimbursementTable
                  reimbursements={data.pending}
                  status="pending"
                  onSelect={(ids) => handleSelect(ids, 'reimbursements-pending')}
                  selectedIds={Array.from(selectedIds)}
                  onAction={handleAction}
                  disabled={activeTable !== null && activeTable !== 'reimbursements-pending'}
                />
              )}
            </>
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
          {activeTable && activeTable !== 'reimbursements-under_review' ? (
            <div style={styles.blockedMessage}>
              מצב בחירה מרובה מופעל בטבלה "{activeTable}". לא ניתן לעבוד בכמה טבלאות במקביל.
            </div>
          ) : (
            <>
              {selectedIds.size > 0 && activeTable === 'reimbursements-under_review' && (
                <ActionBar
                  selectedCount={selectedIds.size}
                  totalAmount={getSelectedTotalAmount()}
                  availableActions={getAvailableActions()}
                  onAction={handleAction}
                  onClearSelection={clearSelection}
                  tableName="לבדיקה"
                />
              )}
              {data.under_review.length === 0 ? (
                <div style={styles.emptyMessage} className="empty-message">אין החזרים לבדיקה</div>
              ) : (
                <ReimbursementTable
                  reimbursements={data.under_review}
                  status="under_review"
                  onSelect={(ids) => handleSelect(ids, 'reimbursements-under_review')}
                  selectedIds={Array.from(selectedIds)}
                  onAction={handleAction}
                  disabled={activeTable !== null && activeTable !== 'reimbursements-under_review'}
                />
              )}
            </>
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
          {activeTable && activeTable !== 'reimbursements-approved' ? (
            <div style={styles.blockedMessage}>
              מצב בחירה מרובה מופעל בטבלה "{activeTable}". לא ניתן לעבוד בכמה טבלאות במקביל.
            </div>
          ) : (
            <>
              {data.approved.length > 0 && (
                <div style={styles.transfersButtonContainer}>
                  <Button 
                    onClick={() => navigate('/payment-transfers')} 
                    style={styles.executeTransfersButton}
                  >
                    💳 עבור לביצוע תשלומים
                  </Button>
                </div>
              )}
              {selectedIds.size > 0 && activeTable === 'reimbursements-approved' && (
                <ActionBar
                  selectedCount={selectedIds.size}
                  totalAmount={getSelectedTotalAmount()}
                  availableActions={getAvailableActions()}
                  onAction={handleAction}
                  onClearSelection={clearSelection}
                  tableName="אושרו"
                />
              )}
              {data.approved.length === 0 ? (
                <div style={styles.emptyMessage} className="empty-message">אין החזרים מאושרים</div>
              ) : (
                <ReimbursementTable
                  reimbursements={data.approved}
                  status="approved"
                  onSelect={(ids) => handleSelect(ids, 'reimbursements-approved')}
                  selectedIds={Array.from(selectedIds)}
                  onAction={handleAction}
                  showTransferInfo={true}
                  disabled={activeTable !== null && activeTable !== 'reimbursements-approved'}
                />
              )}
            </>
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
          {activeTable && activeTable !== 'reimbursements-rejected' ? (
            <div style={styles.blockedMessage}>
              מצב בחירה מרובה מופעל בטבלה "{activeTable}". לא ניתן לעבוד בכמה טבלאות במקביל.
            </div>
          ) : (
            <>
              {selectedIds.size > 0 && activeTable === 'reimbursements-rejected' && (
                <ActionBar
                  selectedCount={selectedIds.size}
                  totalAmount={getSelectedTotalAmount()}
                  availableActions={getAvailableActions()}
                  onAction={handleAction}
                  onClearSelection={clearSelection}
                  tableName="נדחו"
                />
              )}
              {data.rejected.length === 0 ? (
                <div style={styles.emptyMessage} className="empty-message">אין החזרים נדחים</div>
              ) : (
                <ReimbursementTable
                  reimbursements={data.rejected}
                  status="rejected"
                  onSelect={(ids) => handleSelect(ids, 'reimbursements-rejected')}
                  selectedIds={Array.from(selectedIds)}
                  onAction={handleAction}
                  disabled={activeTable !== null && activeTable !== 'reimbursements-rejected'}
                />
              )}
            </>
          )}
        </div>

        {/* Charges Section */}
        {chargesData && (
          <>
            <div style={styles.divider}></div>
            <h2 style={styles.chargesSectionTitle}>חיובים</h2>
            
            {/* Pending Charges */}
            <div style={styles.section} className="section-animate">
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>
                  חיובים ממתינים לאישור ({chargesData.pending.length})
                </h3>
                <span style={{...styles.statusBadge, ...styles.statusPending}}>⏳</span>
              </div>
              {activeTable && activeTable !== 'charges-pending' ? (
                <div style={styles.blockedMessage}>
                  מצב בחירה מרובה מופעל בטבלה "{activeTable}". לא ניתן לעבוד בכמה טבלאות במקביל.
                </div>
              ) : (
                <>
                  {selectedChargeIds.size > 0 && activeTable === 'charges-pending' && (
                    <ActionBar
                      selectedCount={selectedChargeIds.size}
                      totalAmount={getSelectedChargesTotalAmount()}
                      availableActions={getAvailableChargeActions()}
                      onAction={handleChargeAction}
                      onClearSelection={clearSelection}
                      tableName="חיובים ממתינים לאישור"
                    />
                  )}
                  {chargesData.pending.length === 0 ? (
                    <div style={styles.emptyMessage} className="empty-message">אין חיובים ממתינים לאישור</div>
                  ) : (
                    <ChargesTable 
                      charges={chargesData.pending} 
                      status="pending"
                      onSelect={(ids) => handleSelectCharges(ids, 'charges-pending')}
                      selectedIds={Array.from(selectedChargeIds)}
                      onAction={handleChargeAction}
                      disabled={activeTable !== null && activeTable !== 'charges-pending'}
                    />
                  )}
                </>
              )}
            </div>

            {/* Under Review Charges */}
            <div style={styles.section} className="section-animate">
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>
                  חיובים לבדיקה ({chargesData.under_review.length})
                </h3>
                <span style={{...styles.statusBadge, ...styles.statusUnderReview}}>🔍</span>
              </div>
              {activeTable && activeTable !== 'charges-under_review' ? (
                <div style={styles.blockedMessage}>
                  מצב בחירה מרובה מופעל בטבלה "{activeTable}". לא ניתן לעבוד בכמה טבלאות במקביל.
                </div>
              ) : (
                <>
                  {selectedChargeIds.size > 0 && activeTable === 'charges-under_review' && (
                    <ActionBar
                      selectedCount={selectedChargeIds.size}
                      totalAmount={getSelectedChargesTotalAmount()}
                      availableActions={getAvailableChargeActions()}
                      onAction={handleChargeAction}
                      onClearSelection={clearSelection}
                      tableName="חיובים לבדיקה"
                    />
                  )}
                  {chargesData.under_review.length === 0 ? (
                    <div style={styles.emptyMessage} className="empty-message">אין חיובים לבדיקה</div>
                  ) : (
                    <ChargesTable 
                      charges={chargesData.under_review} 
                      status="under_review"
                      onSelect={(ids) => handleSelectCharges(ids, 'charges-under_review')}
                      selectedIds={Array.from(selectedChargeIds)}
                      onAction={handleChargeAction}
                      disabled={activeTable !== null && activeTable !== 'charges-under_review'}
                    />
                  )}
                </>
              )}
            </div>

            {/* Approved Charges */}
            <div style={styles.section} className="section-animate">
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>
                  חיובים אושרו ({chargesData.approved.length})
                </h3>
                <span style={{...styles.statusBadge, ...styles.statusApproved}}>✓</span>
              </div>
              {activeTable && activeTable !== 'charges-approved' ? (
                <div style={styles.blockedMessage}>
                  מצב בחירה מרובה מופעל בטבלה "{activeTable}". לא ניתן לעבוד בכמה טבלאות במקביל.
                </div>
              ) : (
                <>
                  {selectedChargeIds.size > 0 && activeTable === 'charges-approved' && (
                    <ActionBar
                      selectedCount={selectedChargeIds.size}
                      totalAmount={getSelectedChargesTotalAmount()}
                      availableActions={getAvailableChargeActions()}
                      onAction={handleChargeAction}
                      onClearSelection={clearSelection}
                      tableName="חיובים אושרו"
                    />
                  )}
                  {chargesData.approved.length === 0 ? (
                    <div style={styles.emptyMessage} className="empty-message">אין חיובים מאושרים</div>
                  ) : (
                    <ChargesTable 
                      charges={chargesData.approved} 
                      status="approved"
                      onSelect={(ids) => handleSelectCharges(ids, 'charges-approved')}
                      selectedIds={Array.from(selectedChargeIds)}
                      onAction={handleChargeAction}
                      disabled={activeTable !== null && activeTable !== 'charges-approved'}
                    />
                  )}
                </>
              )}
            </div>

            {/* Rejected Charges */}
            <div style={styles.section} className="section-animate">
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>
                  חיובים נדחו ({chargesData.rejected.length})
                </h3>
                <span style={{...styles.statusBadge, ...styles.statusRejected}}>✗</span>
              </div>
              {activeTable && activeTable !== 'charges-rejected' ? (
                <div style={styles.blockedMessage}>
                  מצב בחירה מרובה מופעל בטבלה "{activeTable}". לא ניתן לעבוד בכמה טבלאות במקביל.
                </div>
              ) : (
                <>
                  {selectedChargeIds.size > 0 && activeTable === 'charges-rejected' && (
                    <ActionBar
                      selectedCount={selectedChargeIds.size}
                      totalAmount={getSelectedChargesTotalAmount()}
                      availableActions={getAvailableChargeActions()}
                      onAction={handleChargeAction}
                      onClearSelection={clearSelection}
                      tableName="חיובים נדחו"
                    />
                  )}
                  {chargesData.rejected.length === 0 ? (
                    <div style={styles.emptyMessage} className="empty-message">אין חיובים נדחים</div>
                  ) : (
                    <ChargesTable 
                      charges={chargesData.rejected} 
                      status="rejected"
                      onSelect={(ids) => handleSelectCharges(ids, 'charges-rejected')}
                      selectedIds={Array.from(selectedChargeIds)}
                      onAction={handleChargeAction}
                      disabled={activeTable !== null && activeTable !== 'charges-rejected'}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Task 15.8: Modals */}
        <RejectionModal
          isOpen={activeModal === 'rejection'}
          onClose={() => {
            setActiveModal(null);
            setPendingActionIds([]);
            setIsRejectingCharge(false);
            isRejectingChargeRef.current = false;
          }}
          onConfirm={(reason: string) => {
            // Use ref to check which function to use (more reliable than state)
            if (isRejectingChargeRef.current) {
              handleRejectCharges(reason);
            } else {
              handleReject(reason);
            }
          }}
          count={
            pendingActionIds.length > 0 
              ? pendingActionIds.length 
              : isRejectingCharge
                ? selectedChargeIds.size 
                : selectedIds.size
          }
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

// Charges Table Component with selection and actions
function ChargesTable({ 
  charges, 
  status, 
  onSelect, 
  selectedIds, 
  onAction,
  disabled = false,
}: { 
  charges: Charge[]; 
  status: string;
  onSelect: (ids: number[]) => void;
  selectedIds: number[];
  onAction: (action: string, ids?: number[]) => void;
  disabled?: boolean;
}) {
  const [selectAll, setSelectAll] = useState(false);

  const formatCurrency = (amount: number) => {
    return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL');
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

  const handleSelectAll = () => {
    if (disabled) return;
    if (selectAll) {
      onSelect([]);
    } else {
      onSelect(charges.map(c => c.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectOne = (id: number) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter(sid => sid !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  const getAvailableActions = (charge: Charge): string[] => {
    // For rejected charges, only allow returning to pending
    if (charge.status === 'rejected') {
      return ['return-pending'];
    }
    
    // Return all possible actions except the current status
    const allActions = ['approve', 'mark-review', 'return-pending', 'reject'];
    
    // Filter out actions that don't make sense for current status
    if (charge.status === 'pending') {
      return allActions.filter(a => a !== 'return-pending'); // Already pending
    }
    if (charge.status === 'under_review') {
      return allActions; // Can go to any status
    }
    if (charge.status === 'approved') {
      return allActions.filter(a => a !== 'approve'); // Already approved
    }
    if (charge.status === 'paid') {
      return []; // Paid charges cannot be modified
    }
    return allActions;
  };

  return (
    <div style={tableStyles.container}>
      <table style={tableStyles.table}>
        <thead>
          <tr style={tableStyles.headerRow}>
            <th style={{...tableStyles.header, width: '40px'}}>
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                style={{...tableStyles.checkbox, ...(disabled ? tableStyles.disabledCheckbox : {})}}
                disabled={disabled}
              />
            </th>
            <th style={tableStyles.header}>משתמש</th>
            <th style={tableStyles.header}>סעיף</th>
            <th style={tableStyles.header}>תיאור</th>
            <th style={tableStyles.header}>סכום</th>
            <th style={tableStyles.header}>תאריך חיוב</th>
            <th style={tableStyles.header}>סטטוס</th>
            {status === 'approved' && <th style={tableStyles.header}>העברה</th>}
            <th style={tableStyles.header}>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((charge) => {
            const actions = getAvailableActions(charge);
            return (
              <tr key={charge.id} style={tableStyles.row}>
                <td style={tableStyles.cell}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(charge.id)}
                    onChange={() => handleSelectOne(charge.id)}
                    style={{...tableStyles.checkbox, ...(disabled ? tableStyles.disabledCheckbox : {})}}
                    disabled={disabled}
                  />
                </td>
                <td style={tableStyles.cell}>{charge.user_name}</td>
                <td style={tableStyles.cell}>{charge.fund_name}</td>
                <td style={tableStyles.cell}>
                  <div>
                    {charge.description}
                    {charge.notes && (
                      <div style={tableStyles.notes}>{charge.notes}</div>
                    )}
                  </div>
                </td>
                <td style={{...tableStyles.cell, ...tableStyles.amountCell}}>
                  -{formatCurrency(charge.amount)}
                </td>
                <td style={tableStyles.cell}>{formatDate(charge.charge_date)}</td>
                <td style={tableStyles.cell}>
                  <span style={tableStyles.statusBadge}>{getStatusText(charge.status)}</span>
                </td>
                {status === 'approved' && (
                  <td style={tableStyles.cell}>
                    {charge.payment_transfer_id ? `#${charge.payment_transfer_id}` : '-'}
                  </td>
                )}
                <td style={tableStyles.cell}>
                  <div style={tableStyles.actionButtons}>
                    {actions.includes('approve') && (
                      <button
                        onClick={() => onAction('approve', [charge.id])}
                        style={{...tableStyles.actionButton, ...tableStyles.approveButton}}
                        className="action-btn approve-btn"
                        title="אשר חיוב"
                        aria-label="אשר חיוב"
                      >
                        ✓
                      </button>
                    )}
                    {actions.includes('mark-review') && (
                      <button
                        onClick={() => onAction('mark-review', [charge.id])}
                        style={{...tableStyles.actionButton, ...tableStyles.reviewButton}}
                        className="action-btn review-btn"
                        title="סמן לבדיקה"
                        aria-label="סמן לבדיקה"
                      >
                        🔍
                      </button>
                    )}
                    {actions.includes('return-pending') && (
                      <button
                        onClick={() => onAction('return-pending', [charge.id])}
                        style={{...tableStyles.actionButton, ...tableStyles.returnButton}}
                        className="action-btn return-btn"
                        title="החזר לממתין"
                        aria-label="החזר לממתין"
                      >
                        ↩️
                      </button>
                    )}
                    {actions.includes('reject') && (
                      <button
                        onClick={() => onAction('reject', [charge.id])}
                        style={{...tableStyles.actionButton, ...tableStyles.rejectButton}}
                        className="action-btn reject-btn"
                        title="דחה חיוב"
                        aria-label="דחה חיוב"
                      >
                        ✗
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const tableStyles: Record<string, React.CSSProperties> = {
  container: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
  header: {
    padding: '16px 12px',
    textAlign: 'right',
    fontWeight: '600',
    color: '#4a5568',
    fontSize: '14px',
  },
  row: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background 0.2s',
  },
  cell: {
    padding: '16px 12px',
    textAlign: 'right',
    color: '#2d3748',
    fontSize: '14px',
  },
  amountCell: {
    fontWeight: '600',
    color: '#e53e3e',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#e2e8f0',
    color: '#4a5568',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  notes: {
    fontSize: '12px',
    color: '#718096',
    fontStyle: 'italic',
    marginTop: '4px',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionButton: {
    padding: '6px 10px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
    background: '#e2e8f0',
    minWidth: '32px',
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    background: '#48bb78',
    color: 'white',
  },
  rejectButton: {
    background: '#e53e3e',
    color: 'white',
  },
  reviewButton: {
    background: '#ecc94b',
    color: 'white',
  },
  returnButton: {
    background: '#4299e1',
    color: 'white',
  },
  disabledCheckbox: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
};

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
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: 0,
    color: '#2d3748',
  },
  transfersButton: {
    fontSize: '16px',
    fontWeight: '600',
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
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
  chargesBadge: {
    fontSize: '12px',
    color: '#e53e3e',
    fontWeight: '500',
    marginRight: '8px',
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
  transfersButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  executeTransfersButton: {
    fontSize: '16px',
    fontWeight: '600',
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)',
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
  divider: {
    height: '2px',
    background: 'linear-gradient(to right, transparent, #e2e8f0, transparent)',
    margin: '48px 0',
  },
  chargesSectionTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: '24px',
    paddingBottom: '12px',
    borderBottom: '3px solid #e53e3e',
    display: 'inline-block',
  },
  blockedMessage: {
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    padding: '32px',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#92400e',
    fontSize: '16px',
    fontWeight: '600',
    border: '2px solid #fbbf24',
    boxShadow: '0 2px 8px rgba(251, 191, 36, 0.2)',
  },
};

// Add hover styles for charge action buttons and execute transfers button
const chargeButtonHoverStyle = document.createElement('style');
chargeButtonHoverStyle.textContent = `
  .action-btn:hover {
    transform: scale(1.1);
  }
  .approve-btn:hover {
    background: #38a169 !important;
  }
  .reject-btn:hover {
    background: #c53030 !important;
  }
  .review-btn:hover {
    background: #d69e2e !important;
  }
  .return-btn:hover {
    background: #3182ce !important;
  }
`;
if (!document.head.querySelector('style[data-charge-buttons]')) {
  chargeButtonHoverStyle.setAttribute('data-charge-buttons', 'true');
  document.head.appendChild(chargeButtonHoverStyle);
}
