import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportsAPI } from '../services/api';
import { Dashboard as DashboardType } from '../types';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await reportsAPI.getDashboard();
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>טוען...</div>;
  }

  if (!dashboard) {
    return <div style={styles.error}>שגיאה בטעינת הנתונים</div>;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>מערכת ניהול תקציב</h1>
          <p style={styles.subtitle}>שלום, {user?.fullName}</p>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>יציאה</button>
      </header>

      <div style={styles.content}>
        {/* Budgets Overview */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>תקציבים</h2>
          <div style={styles.grid}>
            {dashboard.budgets.map(budget => (
              <div key={budget.id} style={styles.card}>
                <h3 style={styles.cardTitle}>{budget.name}</h3>
                <p style={styles.cardSubtitle}>
                  {budget.group_name || 'תקציב מעגלי'}
                </p>
                <div style={styles.amount}>{formatCurrency(budget.total_amount)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Funds Overview */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>קופות</h2>
          <div style={styles.grid}>
            {dashboard.funds.map(fund => (
              <div key={fund.id} style={styles.card}>
                <h3 style={styles.cardTitle}>{fund.name}</h3>
                <div style={styles.fundDetails}>
                  <div style={styles.fundRow}>
                    <span>מקורי:</span>
                    <span>{formatCurrency(fund.allocated_amount)}</span>
                  </div>
                  <div style={styles.fundRow}>
                    <span>יצא:</span>
                    <span style={{ color: '#e53e3e' }}>{formatCurrency(fund.spent_amount || 0)}</span>
                  </div>
                  <div style={styles.fundRow}>
                    <span>מתוכנן:</span>
                    <span style={{ color: '#dd6b20' }}>{formatCurrency(fund.planned_amount || 0)}</span>
                  </div>
                  <div style={{ ...styles.fundRow, ...styles.fundRowTotal }}>
                    <span><strong>זמין:</strong></span>
                    <span style={{ color: '#38a169' }}><strong>{formatCurrency(fund.available_amount || 0)}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pending Reimbursements (for treasurers) */}
        {dashboard.pendingReimbursements && dashboard.pendingReimbursements.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>בקשות החזר ממתינות ({dashboard.pendingReimbursements.length})</h2>
            <div style={styles.table}>
              {dashboard.pendingReimbursements.map(reimb => (
                <div key={reimb.id} style={styles.tableRow}>
                  <div style={styles.tableCell}>
                    <strong>{reimb.user_name}</strong>
                    <small style={{ color: '#718096' }}>{reimb.fund_name}</small>
                  </div>
                  <div style={styles.tableCell}>{reimb.description}</div>
                  <div style={styles.tableCell}>{formatCurrency(reimb.amount)}</div>
                  <div style={styles.tableCell}>
                    <span style={styles.statusPending}>ממתין</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Planned Expenses */}
        {dashboard.myPlannedExpenses.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>התכנונים שלי ({dashboard.myPlannedExpenses.length})</h2>
            <div style={styles.table}>
              {dashboard.myPlannedExpenses.map(expense => (
                <div key={expense.id} style={styles.tableRow}>
                  <div style={styles.tableCell}>{expense.fund_name}</div>
                  <div style={styles.tableCell}>{expense.description}</div>
                  <div style={styles.tableCell}>{formatCurrency(expense.amount)}</div>
                  <div style={styles.tableCell}>
                    {expense.planned_date ? new Date(expense.planned_date).toLocaleDateString('he-IL') : 'ללא תאריך'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Recent Reimbursements */}
        {dashboard.myReimbursements.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>ההחזרים שלי (אחרונים)</h2>
            <div style={styles.table}>
              {dashboard.myReimbursements.slice(0, 5).map(reimb => (
                <div key={reimb.id} style={styles.tableRow}>
                  <div style={styles.tableCell}>{reimb.fund_name}</div>
                  <div style={styles.tableCell}>{reimb.description}</div>
                  <div style={styles.tableCell}>{formatCurrency(reimb.amount)}</div>
                  <div style={styles.tableCell}>
                    <span style={getStatusStyle(reimb.status)}>{getStatusText(reimb.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function getStatusText(status: string) {
  const statusMap: Record<string, string> = {
    pending: 'ממתין',
    approved: 'אושר',
    rejected: 'נדחה',
    paid: 'שולם',
  };
  return statusMap[status] || status;
}

function getStatusStyle(status: string): React.CSSProperties {
  const baseStyle = {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  };

  const colorMap: Record<string, React.CSSProperties> = {
    pending: { ...baseStyle, background: '#fef5e7', color: '#d68910' },
    approved: { ...baseStyle, background: '#d4edda', color: '#155724' },
    rejected: { ...baseStyle, background: '#f8d7da', color: '#721c24' },
    paid: { ...baseStyle, background: '#d1ecf1', color: '#0c5460' },
  };

  return colorMap[status] || baseStyle;
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '20px',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '20px',
    color: '#e53e3e',
  },
  container: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  header: {
    background: 'white',
    padding: '20px 40px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#718096',
    margin: '4px 0 0 0',
  },
  logoutBtn: {
    padding: '8px 20px',
    background: '#e53e3e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  content: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#2d3748',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
  },
  cardSubtitle: {
    fontSize: '14px',
    color: '#718096',
    margin: '0 0 16px 0',
  },
  amount: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#667eea',
  },
  fundDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fundRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  fundRowTotal: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #e2e8f0',
  },
  table: {
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 3fr 1fr 1fr',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    gap: '16px',
  },
  tableCell: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  statusPending: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#fef5e7',
    color: '#d68910',
    display: 'inline-block',
  },
};
