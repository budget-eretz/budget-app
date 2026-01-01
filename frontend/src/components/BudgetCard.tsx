import React from 'react';
import { Budget } from '../types';

interface BudgetCardProps {
  budget: Budget;
  onClick: () => void;
}

// Add hover effect and responsive styles using CSS-in-JS approach
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .budget-card:hover {
    box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    .budget-card {
      padding: 16px !important;
      min-height: 160px;
    }
    .budget-card h3 {
      font-size: 16px !important;
    }
  }
`;
if (!document.head.querySelector('style[data-budget-card-responsive]')) {
  styleSheet.setAttribute('data-budget-card-responsive', 'true');
  document.head.appendChild(styleSheet);
}

const BudgetCard: React.FC<BudgetCardProps> = ({ budget, onClick }) => {
  const getHealthColor = () => {
    if (!budget.total_amount) return '#667eea';
    
    const totalIncome = budget.total_income || 0;
    const usagePercent = totalIncome / budget.total_amount;
    
    if (usagePercent >= 0.9) return '#e53e3e';
    if (usagePercent >= 0.7) return '#dd6b20';
    return '#38a169';
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="budget-card" style={styles.card} onClick={onClick}>
      <div style={styles.header}>
        <h3 style={styles.title}>{budget.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!budget.is_active && (
            <span style={styles.inactiveBadge}>לא פעיל</span>
          )}
          <div 
            style={{
              ...styles.healthIndicator,
              backgroundColor: getHealthColor(),
            }}
          />
        </div>
      </div>
      
      <p style={styles.subtitle}>
        {budget.group_name || 'תקציב מעגלי'}
      </p>
      
      <div style={styles.amountContainer}>
        <span style={styles.amount}>
          {formatAmount(budget.total_amount)}
        </span>
      </div>
      
      {budget.fiscal_year && (
        <p style={styles.fiscalYear}>
          שנת כספים: {budget.fiscal_year}
        </p>
      )}
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
    marginBottom: '8px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#2d3748',
    margin: 0,
    flex: 1,
  },
  healthIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    marginRight: '4px',
    flexShrink: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#718096',
    margin: '0 0 16px 0',
  },
  amountContainer: {
    marginBottom: '12px',
  },
  amount: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#667eea',
  },
  fiscalYear: {
    fontSize: '13px',
    color: '#a0aec0',
    margin: 0,
  },
  inactiveBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#e53e3e',
    backgroundColor: '#fed7d7',
    padding: '2px 8px',
    borderRadius: '12px',
    whiteSpace: 'nowrap',
  },
};

export default BudgetCard;
