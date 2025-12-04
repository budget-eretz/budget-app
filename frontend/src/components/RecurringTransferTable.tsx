import React from 'react';
import { RecurringTransfer } from '../types';

interface RecurringTransferTableProps {
  transfers: RecurringTransfer[];
  onEdit?: (transfer: RecurringTransfer) => void;
  onDelete?: (transfer: RecurringTransfer) => void;
  onToggleStatus?: (transfer: RecurringTransfer) => void;
  showActions?: boolean;
}

const RecurringTransferTable: React.FC<RecurringTransferTableProps> = ({
  transfers,
  onEdit,
  onDelete,
  onToggleStatus,
  showActions = false,
}) => {
  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'monthly': return 'חודשי';
      case 'quarterly': return 'רבעוני';
      case 'annual': return 'שנתי';
      default: return frequency;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'פעיל';
      case 'paused': return 'מושהה';
      case 'cancelled': return 'בוטל';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  if (transfers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        אין העברות קבועות
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-right border-b">מקבל</th>
            <th className="px-4 py-2 text-right border-b">קופה</th>
            <th className="px-4 py-2 text-right border-b">סכום</th>
            <th className="px-4 py-2 text-right border-b">תיאור</th>
            <th className="px-4 py-2 text-right border-b">תדירות</th>
            <th className="px-4 py-2 text-right border-b">תאריך התחלה</th>
            <th className="px-4 py-2 text-right border-b">תאריך סיום</th>
            <th className="px-4 py-2 text-right border-b">סטטוס</th>
            {showActions && <th className="px-4 py-2 text-right border-b">פעולות</th>}
          </tr>
        </thead>
        <tbody>
          {transfers.map((transfer) => (
            <tr key={transfer.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border-b">
                <div>
                  <div className="font-medium">{transfer.recipientName}</div>
                  {transfer.recipientEmail && (
                    <div className="text-xs text-gray-500">{transfer.recipientEmail}</div>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 border-b">
                <div>
                  <div>{transfer.fundName}</div>
                  {transfer.budgetName && (
                    <div className="text-xs text-gray-500">
                      {transfer.budgetName}
                      {transfer.budgetType === 'group' && transfer.groupName && ` - ${transfer.groupName}`}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-2 border-b font-medium">
                ₪{transfer.amount.toFixed(2)}
              </td>
              <td className="px-4 py-2 border-b">{transfer.description}</td>
              <td className="px-4 py-2 border-b">{getFrequencyLabel(transfer.frequency)}</td>
              <td className="px-4 py-2 border-b">{formatDate(transfer.startDate)}</td>
              <td className="px-4 py-2 border-b">
                {transfer.endDate ? formatDate(transfer.endDate) : '-'}
              </td>
              <td className="px-4 py-2 border-b">
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(transfer.status)}`}>
                  {getStatusLabel(transfer.status)}
                </span>
              </td>
              {showActions && (
                <td className="px-4 py-2 border-b">
                  <div className="flex gap-2">
                    {onToggleStatus && transfer.status !== 'cancelled' && (
                      <button
                        onClick={() => onToggleStatus(transfer)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                        title={transfer.status === 'active' ? 'השהה' : 'הפעל'}
                      >
                        {transfer.status === 'active' ? '⏸️' : '▶️'}
                      </button>
                    )}
                    {onEdit && transfer.status !== 'cancelled' && (
                      <button
                        onClick={() => onEdit(transfer)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        ✏️ ערוך
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(transfer)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        🗑️ מחק
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RecurringTransferTable;
