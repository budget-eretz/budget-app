import { useEffect, useMemo, useState } from 'react';
import Navigation from '../components/Navigation';
import { budgetsAPI, fundsAPI } from '../services/api';
import { Budget, Fund } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

interface MoveResult {
  dryRun: boolean;
  sourceFund: {
    id: number;
    name: string;
    budgetId: number;
    budgetName: string;
  };
  targetFund: {
    id: number;
    name: string;
    budgetId: number;
    budgetName: string;
  };
  moved: {
    reimbursements: number;
    plannedExpenses: number;
    directExpenses: number;
  };
}

export default function TransferMovements() {
  const { showToast } = useToast();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [sourceBudgetId, setSourceBudgetId] = useState<number | undefined>();
  const [targetBudgetId, setTargetBudgetId] = useState<number | undefined>();
  const [sourceFunds, setSourceFunds] = useState<Fund[]>([]);
  const [targetFunds, setTargetFunds] = useState<Fund[]>([]);
  const [sourceFundId, setSourceFundId] = useState<number | undefined>();
  const [targetFundId, setTargetFundId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [moveReimbursements, setMoveReimbursements] = useState(true);
  const [movePlannedExpenses, setMovePlannedExpenses] = useState(true);
  const [moveDirectExpenses, setMoveDirectExpenses] = useState(false);
  const [fromDate, setFromDate] = useState<string>('');
  const [reimbursementStatuses, setReimbursementStatuses] = useState<string[]>([]);
  const [plannedStatuses, setPlannedStatuses] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<MoveResult | null>(null);
  const [confirmationData, setConfirmationData] = useState<{
    result: MoveResult;
    payload: {
      sourceFundId: number;
      targetFundId: number;
      moveReimbursements: boolean;
      movePlannedExpenses: boolean;
      moveDirectExpenses: boolean;
      fromDate?: string;
      reimbursementStatuses?: string[];
      plannedStatuses?: string[];
    };
  } | null>(null);

  useEffect(() => {
    const loadBudgets = async () => {
      try {
        setLoading(true);
        const response = await budgetsAPI.getAll();
        setBudgets(response.data || []);
      } catch (error: any) {
        console.error('Failed to load budgets', error);
        showToast(error?.response?.data?.error || 'שגיאה בטעינת תקציבים', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadBudgets();
    // showToast reference changes every render, so avoid dependency to prevent infinite re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sourceBudgetId) {
      setSourceFunds([]);
      setSourceFundId(undefined);
      return;
    }

    const loadFunds = async () => {
      try {
        const response = await fundsAPI.getAll(sourceBudgetId);
        setSourceFunds(response.data || []);
      } catch (error: any) {
        console.error('Failed to load source funds', error);
        showToast(error?.response?.data?.error || 'שגיאה בטעינת קרנות מקור', 'error');
      }
    };

    loadFunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceBudgetId]);

  useEffect(() => {
    if (!targetBudgetId) {
      setTargetFunds([]);
      setTargetFundId(undefined);
      return;
    }

    const loadFunds = async () => {
      try {
        const response = await fundsAPI.getAll(targetBudgetId);
        setTargetFunds(response.data || []);
      } catch (error: any) {
        console.error('Failed to load target funds', error);
        showToast(error?.response?.data?.error || 'שגיאה בטעינת קרנות יעד', 'error');
      }
    };

    loadFunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetBudgetId]);

  const canRun = useMemo(() => {
    return (
      !!sourceFundId &&
      !!targetFundId &&
      !!fromDate &&
      sourceFundId !== targetFundId &&
      (moveReimbursements || movePlannedExpenses || moveDirectExpenses)
    );
  }, [sourceFundId, targetFundId, fromDate, moveReimbursements, movePlannedExpenses, moveDirectExpenses]);

  const prepareTransfer = async () => {
    if (!canRun || !sourceFundId || !targetFundId || !fromDate) {
      showToast('בחר תקציב/סעיף מקור ויעד, סמן מה להעביר והזן תאריך', 'error');
      return;
    }

    const payload = {
      sourceFundId,
      targetFundId,
      moveReimbursements,
      movePlannedExpenses,
      moveDirectExpenses,
      fromDate,
      reimbursementStatuses: reimbursementStatuses.length ? reimbursementStatuses : undefined,
      plannedStatuses: plannedStatuses.length ? plannedStatuses : undefined,
      dryRun: true,
    };

    try {
      setRunning(true);
      const response = await fundsAPI.moveItems(payload);
      setConfirmationData({ result: response.data, payload });
    } catch (error: any) {
      console.error('Failed to prepare transfer', error);
      showToast(error?.response?.data?.error || 'שגיאה בהרצת בדיקה', 'error');
    } finally {
      setRunning(false);
    }
  };

  const executeTransfer = async () => {
    if (!confirmationData) return;
    const payload = { ...confirmationData.payload, dryRun: false };

    try {
      setRunning(true);
      const response = await fundsAPI.moveItems(payload);
      setLastResult(response.data);
      showToast('העברה בוצעה', 'success');
      setConfirmationData(null);
    } catch (error: any) {
      console.error('Failed to execute transfer', error);
      showToast(error?.response?.data?.error || 'העברה נכשלה', 'error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={styles.container}>
      <Navigation />

      <div style={styles.content}>
        <div style={styles.header}>
          <div>
            <p style={styles.kicker}>כלי גזבר מעגל</p>
            <h1 style={styles.title}>העברת תנועות בין תקציבים</h1>
            <p style={styles.subtitle}>
              מעביר החזרים, תכנונים והוצאות ישירות בין קרנות (בין תקציבים) בלי לבקש מהמשתמשים לערוך כלום.
            </p>
          </div>
          <div style={styles.actions}>
            <Button
              variant="primary"
              onClick={prepareTransfer}
              disabled={!canRun || running}
              isLoading={running}
            >
              העבר תנועות
            </Button>
          </div>
        </div>

        <div style={styles.cardGrid}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>הגדר מקור</h3>
            <label style={styles.label}>תקציב מקור</label>
            <select
              style={styles.select}
              value={sourceBudgetId || ''}
              onChange={(e) => setSourceBudgetId(e.target.value ? parseInt(e.target.value) : undefined)}
              disabled={loading || running}
            >
              <option value="">בחר תקציב</option>
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.fiscal_year ? `(${b.fiscal_year})` : ''} {b.group_name ? `- ${b.group_name}` : ''}
                </option>
              ))}
            </select>

            <label style={styles.label}>סעיף מקור</label>
            <select
              style={styles.select}
              value={sourceFundId || ''}
              onChange={(e) => setSourceFundId(e.target.value ? parseInt(e.target.value) : undefined)}
              disabled={!sourceBudgetId || running}
            >
              <option value="">בחר סעיף</option>
              {sourceFunds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (תקציב #{f.budget_id})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>הגדר יעד</h3>
            <label style={styles.label}>תקציב יעד</label>
            <select
              style={styles.select}
              value={targetBudgetId || ''}
              onChange={(e) => setTargetBudgetId(e.target.value ? parseInt(e.target.value) : undefined)}
              disabled={loading || running}
            >
              <option value="">בחר תקציב</option>
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.fiscal_year ? `(${b.fiscal_year})` : ''} {b.group_name ? `- ${b.group_name}` : ''}
                </option>
              ))}
            </select>

            <label style={styles.label}>סעיף יעד</label>
            <select
              style={styles.select}
              value={targetFundId || ''}
              onChange={(e) => setTargetFundId(e.target.value ? parseInt(e.target.value) : undefined)}
              disabled={!targetBudgetId || running}
            >
              <option value="">בחר סעיף</option>
              {targetFunds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (תקציב #{f.budget_id})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>מה להעביר?</h3>
            <div style={styles.checkboxRow}>
              <input
                type="checkbox"
                id="moveReimbursements"
                checked={moveReimbursements}
                onChange={(e) => setMoveReimbursements(e.target.checked)}
                disabled={running}
              />
              <label htmlFor="moveReimbursements" style={styles.checkboxLabel}>החזרים</label>
            </div>
            <div style={styles.checkboxRow}>
              <input
                type="checkbox"
                id="movePlannedExpenses"
                checked={movePlannedExpenses}
                onChange={(e) => setMovePlannedExpenses(e.target.checked)}
                disabled={running}
              />
              <label htmlFor="movePlannedExpenses" style={styles.checkboxLabel}>תכנונים</label>
            </div>
            <div style={styles.checkboxRow}>
              <input
                type="checkbox"
                id="moveDirectExpenses"
                checked={moveDirectExpenses}
                onChange={(e) => setMoveDirectExpenses(e.target.checked)}
                disabled={running}
              />
              <label htmlFor="moveDirectExpenses" style={styles.checkboxLabel}>הוצאות ישירות</label>
            </div>

            <label style={styles.label} htmlFor="fromDate">ממתי להעביר</label>
            <input
              id="fromDate"
              type="date"
              style={styles.input}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              disabled={running}
            />

            <div style={styles.subCard}>
              <p style={styles.subCardTitle}>איזה החזרים?</p>
              <div style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="status-pending"
                  checked={reimbursementStatuses.includes('pending')}
                  onChange={(e) =>
                    setReimbursementStatuses((prev) =>
                      e.target.checked ? [...prev, 'pending'] : prev.filter((s) => s !== 'pending')
                    )
                  }
                  disabled={running}
                />
                <label htmlFor="status-pending" style={styles.checkboxLabel}>ממתין</label>
              </div>
              <div style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="status-under_review"
                  checked={reimbursementStatuses.includes('under_review')}
                  onChange={(e) =>
                    setReimbursementStatuses((prev) =>
                      e.target.checked ? [...prev, 'under_review'] : prev.filter((s) => s !== 'under_review')
                    )
                  }
                  disabled={running}
                />
                <label htmlFor="status-under_review" style={styles.checkboxLabel}>בבדיקה</label>
              </div>
              <div style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="status-approved"
                  checked={reimbursementStatuses.includes('approved')}
                  onChange={(e) =>
                    setReimbursementStatuses((prev) =>
                      e.target.checked ? [...prev, 'approved'] : prev.filter((s) => s !== 'approved')
                    )
                  }
                  disabled={running}
                />
                <label htmlFor="status-approved" style={styles.checkboxLabel}>אושר</label>
              </div>
              <div style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="status-paid"
                  checked={reimbursementStatuses.includes('paid')}
                  onChange={(e) =>
                    setReimbursementStatuses((prev) =>
                      e.target.checked ? [...prev, 'paid'] : prev.filter((s) => s !== 'paid')
                    )
                  }
                  disabled={running}
                />
                <label htmlFor="status-paid" style={styles.checkboxLabel}>שולם</label>
              </div>
              <small style={styles.hint}>אם לא נבחר, מעביר כל הסטטוסים.</small>
            </div>

            <div style={styles.subCard}>
              <p style={styles.subCardTitle}>איזה תכנונים?</p>
              <div style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="planned-status-planned"
                  checked={plannedStatuses.includes('planned')}
                  onChange={(e) =>
                    setPlannedStatuses((prev) =>
                      e.target.checked ? [...prev, 'planned'] : prev.filter((s) => s !== 'planned')
                    )
                  }
                  disabled={running}
                />
                <label htmlFor="planned-status-planned" style={styles.checkboxLabel}>מתוכנן</label>
              </div>
              <div style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="planned-status-executed"
                  checked={plannedStatuses.includes('executed')}
                  onChange={(e) =>
                    setPlannedStatuses((prev) =>
                      e.target.checked ? [...prev, 'executed'] : prev.filter((s) => s !== 'executed')
                    )
                  }
                  disabled={running}
                />
                <label htmlFor="planned-status-executed" style={styles.checkboxLabel}>בוצע</label>
              </div>
              <div style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="planned-status-cancelled"
                  checked={plannedStatuses.includes('cancelled')}
                  onChange={(e) =>
                    setPlannedStatuses((prev) =>
                      e.target.checked ? [...prev, 'cancelled'] : prev.filter((s) => s !== 'cancelled')
                    )
                  }
                  disabled={running}
                />
                <label htmlFor="planned-status-cancelled" style={styles.checkboxLabel}>בוטל</label>
              </div>
              <small style={styles.hint}>אם לא נבחר, מעביר כל הסטטוסים.</small>
            </div>

            <p style={styles.hint}>
              חובה לבחור תאריך ממתי להעביר. הכמות להצגה תופיע באישור לפני ביצוע.
            </p>

            {!canRun && (
              <p style={styles.warningText}>
                בחר תקציב וסעיף מקור/יעד, סמן מה להעביר והזן תאריך.
              </p>
            )}
          </div>
        </div>

        {lastResult && (
          <div style={styles.resultCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={styles.kicker}>{lastResult.dryRun ? 'תצוגה מוקדמת' : 'בוצע'}</p>
                <h3 style={styles.resultTitle}>
                  {lastResult.sourceFund.name} → {lastResult.targetFund.name}
                </h3>
                <p style={styles.resultSubtitle}>
                  {lastResult.sourceFund.budgetName} → {lastResult.targetFund.budgetName}
                </p>
              </div>
              <span style={styles.badge}>{lastResult.dryRun ? 'Dry Run' : 'בוצע'}</span>
            </div>

            <div style={styles.resultGrid}>
              <div style={styles.metric}>
                <p style={styles.metricLabel}>החזרים</p>
                <p style={styles.metricValue}>{lastResult.moved.reimbursements}</p>
              </div>
              <div style={styles.metric}>
                <p style={styles.metricLabel}>תכנונים</p>
                <p style={styles.metricValue}>{lastResult.moved.plannedExpenses}</p>
              </div>
              <div style={styles.metric}>
                <p style={styles.metricLabel}>הוצאות ישירות</p>
                <p style={styles.metricValue}>{lastResult.moved.directExpenses}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {confirmationData && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmationData(null)}
          title="אישור העברת תנועות"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p>
              אתה עומד להעביר{' '}
              <strong>{confirmationData.result.moved.reimbursements}</strong> החזרים,{' '}
              <strong>{confirmationData.result.moved.plannedExpenses}</strong> תכנונים,{' '}
              <strong>{confirmationData.result.moved.directExpenses}</strong> הוצאות ישירות.
            </p>
            <p>
              מקור: <strong>{confirmationData.result.sourceFund.budgetName}</strong> /{' '}
              <strong>{confirmationData.result.sourceFund.name}</strong>
              <br />
              יעד: <strong>{confirmationData.result.targetFund.budgetName}</strong> /{' '}
              <strong>{confirmationData.result.targetFund.name}</strong>
            </p>
            <p>
              ממתי: <strong>{fromDate}</strong>
              {reimbursementStatuses.length > 0 && (
                <>
                  <br />
                  סטטוסי החזרים: <strong>{reimbursementStatuses.join(', ')}</strong>
                </>
              )}
              {plannedStatuses.length > 0 && (
                <>
                  <br />
                  סטטוסי תכנונים: <strong>{plannedStatuses.join(', ')}</strong>
                </>
              )}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setConfirmationData(null)} disabled={running}>
                ביטול
              </Button>
              <Button variant="primary" onClick={executeTransfer} isLoading={running}>
                אשר והעבר
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    color: '#1a202c',
  },
  subtitle: {
    margin: '8px 0 0 0',
    color: '#4a5568',
    maxWidth: '720px',
  },
  kicker: {
    margin: 0,
    color: '#718096',
    fontSize: '14px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
    marginTop: '16px',
    alignItems: 'start',
  },
  card: {
    background: '#fff',
    borderRadius: '10px',
    padding: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  cardTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    color: '#2d3748',
  },
  label: {
    fontWeight: 600,
    fontSize: '14px',
    margin: '12px 0 6px 0',
    color: '#2d3748',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '14px',
    outline: 'none',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '10px',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#2d3748',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    fontSize: '14px',
    outline: 'none',
  },
  hint: {
    color: '#4a5568',
    fontSize: '13px',
    marginTop: '12px',
  },
  warningText: {
    color: '#e53e3e',
    fontSize: '13px',
    marginTop: '12px',
  },
  resultCard: {
    marginTop: '20px',
    background: '#fff',
    borderRadius: '10px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginTop: '12px',
  },
  resultTitle: {
    margin: '6px 0 0 0',
    fontSize: '20px',
    color: '#1a202c',
  },
  resultSubtitle: {
    margin: 0,
    color: '#4a5568',
    fontSize: '14px',
  },
  badge: {
    background: '#e6fffa',
    color: '#0f766e',
    padding: '6px 10px',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '12px',
    textTransform: 'uppercase',
  },
  metric: {
    padding: '12px',
    borderRadius: '8px',
    background: '#f8fafc',
    border: '1px solid #edf2f7',
  },
  metricLabel: {
    margin: 0,
    color: '#4a5568',
    fontSize: '13px',
  },
  metricValue: {
    margin: '4px 0 0 0',
    fontSize: '22px',
    fontWeight: 700,
    color: '#2d3748',
  },
  subCard: {
    marginTop: '12px',
    padding: '12px',
    borderRadius: '8px',
    background: '#f8fafc',
    border: '1px solid #edf2f7',
  },
  subCardTitle: {
    margin: 0,
    fontWeight: 600,
    color: '#2d3748',
  },
};
