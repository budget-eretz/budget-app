import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MonthlyFundStatus } from '../types';

interface MonthlyFundStatusCardProps {
  status: MonthlyFundStatus;
}

// Add hover effect and responsive styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .monthly-fund-status-card:hover {
    box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    .monthly-fund-status-card {
      padding: 16px !important;
    }
    .monthly-fund-status-card h3 {
      font-size: 16px !important;
    }
  }
`;
if (!document.head.querySelector('style[data-monthly-fund-status-card]')) {
  styleSheet.setAttribute('data-monthly-fund-status-card', 'true');
  document.head.appendChild(styleSheet);
}

const MonthlyFundStatusCard: React.FC<MonthlyFundStatusCardProps> = ({ status }) => {
  const navigate = useNavigate();

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleClick = () => {
    navigate(`/funds/${status.fundId}/monthly`);
  };

  // Calculate usage percentage (actual execution)
  const usagePercent = status.allocated > 0 
    ? (status.actual.spent / status.allocated) * 100 
    : 0;

  // Get progress bar color based on usage
  const getProgressColor = () => {
    if (usagePercent >= 90) return '#e53e3e';
    if (usagePercent >= 70) return '#dd6b20';
    return '#38a169';
  };

  // Get remaining amount color
  const getRemainingColor = () => {
    if (status.actual.remaining < 0) return '#e53e3e';
    if (usagePercent >= 70) return '#dd6b20';
    return '#38a169';
  };

  // Get variance color
  const getVarianceColor = () => {
    if (status.variance.percentage > 110) return '#e53e3e';
    if (status.variance.percentage < 90) return '#38a169';
    return '#dd6b20';
  };

  return (
    <div 
      className="monthly-fund-status-card" 
      style={styles.card}
      onClick={handleClick}
    >
      <div style={styles.header}>
        <h3 style={styles.title}>{status.fundName}</h3>
        {status.allocationType && (
          <span style={styles.badge}>
            {status.allocationType === 'fixed' ? 'קבוע' : 'משתנה'}
          </span>
        )}
      </div>

      <div style={styles.amountsContainer}>
        <div style={styles.amountRow}>
          <span style={styles.label}>מוקצה לחודש:</span>
          <span style={styles.value}>{formatAmount(status.allocated)}</span>
        </div>
        <div style={styles.amountRow}>
          <span style={styles.label}>הוצא:</span>
          <span style={{...styles.value, color: '#e53e3e'}}>
            {formatAmount(status.actual.spent)}
          </span>
        </div>
        <div style={{...styles.amountRow, ...styles.remainingRow}}>
          <span style={styles.label}>נותר:</span>
          <span style={{
            ...styles.value, 
            ...styles.remainingValue,
            color: getRemainingColor(),
          }}>
            {formatAmount(status.actual.remaining)}
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

      {/* Variance Section */}
      {status.variance.planned > 0 && (
        <div style={styles.varianceContainer}>
          <div style={styles.varianceRow}>
            <span style={styles.label}>תוכנן:</span>
            <span style={{...styles.value, color: '#3182ce'}}>
              {formatAmount(status.variance.planned)}
            </span>
          </div>
          <div style={styles.varianceRow}>
            <span style={styles.label}>סטייה:</span>
            <span style={{
              ...styles.value,
              color: getVarianceColor(),
              fontWeight: 700,
            }}>
              {status.variance.difference > 0 ? '+' : ''}
              {formatAmount(status.variance.difference)}
              {' '}
              ({status.variance.percentage.toFixed(0)}%)
            </span>
          </div>
        </div>
      )}

      <div style={styles.footer}>
        <span style={styles.footerText}>לחץ לפרטים מלאים</span>
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
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    border: '1px solid #e2e8f0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '8px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#2d3748',
    margin: 0,
    flex: 1,
  },
  badge: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#667eea',
    backgroundColor: '#eef2ff',
    padding: '4px 10px',
    borderRadius: '12px',
    whiteSpace: 'nowrap',
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
  remainingRow: {
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
  remainingValue: {
    fontSize: '16px',
    fontWeight: 700,
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
  varianceContainer: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
  },
  varianceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  footer: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '13px',
    color: '#667eea',
    fontWeight: 500,
  },
};

export default MonthlyFundStatusCard;
