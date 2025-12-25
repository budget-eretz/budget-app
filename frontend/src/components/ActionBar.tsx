import React from 'react';

interface ActionBarProps {
  selectedCount: number;
  totalAmount: number;
  availableActions: string[];
  onAction: (action: string) => void;
  onClearSelection: () => void;
  tableName?: string; // Name of the table for display
}

const ActionBar: React.FC<ActionBarProps> = ({
  selectedCount,
  totalAmount,
  availableActions,
  onAction,
  onClearSelection,
  tableName,
}) => {
  if (selectedCount === 0) {
    return null;
  }

  const actionLabels: Record<string, string> = {
    approve: 'אשר נבחרים',
    reject: 'דחה נבחרים',
    'mark-review': 'סמן לבדיקה',
    'mark-paid': 'סמן כשולם',
    'return-pending': 'החזרה למצב ממתין',
  };

  const actionStyles: Record<string, string> = {
    approve: 'action-approve',
    reject: 'action-reject',
    'mark-review': 'action-review',
    'mark-paid': 'action-paid',
    'return-pending': 'action-return',
  };

  return (
    <div className="action-bar">
      <div className="action-bar-content">
        <div className="action-bar-info">
          <span className="selected-count">
            {selectedCount} נבחרו
          </span>
          <span className="total-amount">
            סכום כולל: ₪{(totalAmount || 0).toFixed(2)}
          </span>
          <button
            className="action-button action-clear"
            onClick={onClearSelection}
            title="בטל בחירה"
          >
            ✕ בטל בחירה
          </button>
        </div>
        <div className="action-bar-buttons">
          {availableActions.map((action) => (
            <button
              key={action}
              className={`action-button ${actionStyles[action] || ''}`}
              onClick={() => onAction(action)}
            >
              {actionLabels[action] || action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActionBar;
