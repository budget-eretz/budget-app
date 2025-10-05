import React from 'react';
import { Fund } from '../types';

interface FundCardProps {
  fund: Fund;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions: boolean;
}

// Add hover effect and responsive styles using CSS-in-JS approach
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .fund-card:hover {
    box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
  }
  .fund-action-btn {
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }
  .fund-action-btn:hover {
    opacity: 1;
  }
  
  @media (max-width: 768px) {
    .fund-card {
      padding: 16px !important;
    }
    .fund-card h3 {
      font-size: 16px !important;
    }
    .fund-action-btn {
      font-size: 20px !important;
      padding: 8px !important;
      min-width: 44px;
      min-height: 44px;
    }
  }
`;
if (!document.head.querySelector('style[data-fund-card-responsive]')) {
  styleSheet.setAttribute('data-fund-card-responsive', 'true');
  document.head.appendChild(styleSheet);
}

const FundCard: React.FC<FundCardProps> = ({ fund, onEdit, onDelete, showActions }) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const spentAmount = fund.spent_amount || 0;
  const plannedAmount = fund.planned_amount || 0;
  const availableAmount = fund.available_amount || fund.allocated_amount;
  const usedAmount = spentAmount + plannedAmount;
  const usagePercent = fund.allocated_amount > 0 
    ? (usedAmount / fund.allocated_amount) * 100 
    : 0;

  const getProgressColor = () => {
    if (usagePercent >= 90) return '#e53e3e';
    if (usagePercent >= 70) return '#dd6b20';
    return '#38a169';
  };

  return (
    <div className="fund-card" style={styles.card}>
      <div style={styles.header}>
        <h3 style={styles.title}>{fund.name}</h3>
        {showActions && (
          <div style={styles.actions}>
            {onEdit && (
              <button
                className="fund-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                style={styles.actionButton}
                title="ערוך"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                className="fund-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                style={{...styles.actionButton, ...styles.deleteButton}}
                title="מחק"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      <div style={styles.amountsContainer}>
        <div style={styles.amountRow}>
          <span style={styles.label}>מוקצה:</span>
          <span style={styles.value}>{formatAmount(fund.allocated_amount)}</span>
        </div>
        <div style={styles.amountRow}>
          <span style={styles.label}>הוצא:</span>
          <span style={{...styles.value, color: '#e53e3e'}}>
            {formatAmount(spentAmount)}
          </span>
        </div>
        <div style={styles.amountRow}>
          <span style={styles.label}>מתוכנן:</span>
          <span style={{...styles.value, color: '#dd6b20'}}>
            {formatAmount(plannedAmount)}
          </span>
        </div>
        <div style={{...styles.amountRow, ...styles.availableRow}}>
          <span style={styles.label}>זמין:</span>
          <span style={{...styles.value, ...styles.availableValue}}>
            {formatAmount(availableAmount)}
          </span>
        </div>
      </div>

      <div style={styles.progressContainer}>
        <div style={styles.progressBar}>
          <div 
            style={{
              ...styles.progressFill,
              width: `${Math.min(usagePercent, 100)}%`,
              backgroundColor: getProgressColor(),
            }}
          />
        </div>
        <span style={styles.progressText}>
          {usagePercent.toFixed(0)}% בשימוש
        </span>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
    position: 'relative',
    border: '1px solid #e2e8f0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#2d3748',
    margin: 0,
    flex: 1,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginRight: '8px',
  },
  actionButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px',
  },
  deleteButton: {
    color: '#e53e3e',
  },
  amountsContainer: {
    marginBottom: '16px',
  },
  amountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  availableRow: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
  },
  label: {
    fontSize: '14px',
    color: '#718096',
  },
  value: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#2d3748',
  },
  availableValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#38a169',
  },
  progressContainer: {
    marginTop: '12px',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease',
    borderRadius: '4px',
  },
  progressText: {
    fontSize: '12px',
    color: '#a0aec0',
  },
};

export default FundCard;
