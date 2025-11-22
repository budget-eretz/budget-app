import React, { useEffect, useState } from 'react';
import { FundAllocationHistory } from '../types';
import { monthlyAllocationsAPI } from '../services/api';
import Modal from './Modal';
import './AllocationHistoryModal.css';

interface AllocationHistoryModalProps {
  fundId: number;
  fundName: string;
  onClose: () => void;
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const CHANGE_TYPE_LABELS: Record<string, string> = {
  created: 'נוצר',
  updated: 'עודכן',
  deleted: 'נמחק'
};

const ALLOCATION_TYPE_LABELS: Record<string, string> = {
  fixed: 'קבוע',
  variable: 'משתנה'
};

const AllocationHistoryModal: React.FC<AllocationHistoryModalProps> = ({
  fundId,
  fundName,
  onClose
}) => {
  const [history, setHistory] = useState<FundAllocationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [fundId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await monthlyAllocationsAPI.getAllocationHistory(fundId);
      
      // Transform snake_case to camelCase
      const transformedHistory = response.data.map((item: any) => ({
        id: item.id,
        fundId: item.fund_id,
        year: item.year,
        month: item.month,
        allocatedAmount: item.allocated_amount,
        allocationType: item.allocation_type,
        changedBy: item.changed_by,
        changedAt: item.changed_at,
        changeType: item.change_type,
        changedByName: item.changed_by_name
      }));
      
      setHistory(transformedHistory);
    } catch (err: any) {
      console.error('Failed to load allocation history:', err);
      setError(err.response?.data?.error || 'שגיאה בטעינת היסטוריית הקצאות');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`היסטוריית הקצאות - ${fundName}`}>
      <div className="allocation-history-modal">
        {loading && <div className="loading">טוען...</div>}
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="empty-state">
            אין היסטוריית הקצאות עבור סעיף זה
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>חודש</th>
                  <th>סכום</th>
                  <th>סוג הקצאה</th>
                  <th>פעולה</th>
                  <th>בוצע על ידי</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className={`change-type-${entry.changeType}`}>
                    <td>{formatDate(entry.changedAt)}</td>
                    <td>{HEBREW_MONTHS[entry.month - 1]} {entry.year}</td>
                    <td>{formatAmount(entry.allocatedAmount)}</td>
                    <td>{ALLOCATION_TYPE_LABELS[entry.allocationType]}</td>
                    <td>
                      <span className={`change-badge change-${entry.changeType}`}>
                        {CHANGE_TYPE_LABELS[entry.changeType]}
                      </span>
                    </td>
                    <td>{entry.changedByName || 'לא ידוע'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            סגור
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AllocationHistoryModal;
