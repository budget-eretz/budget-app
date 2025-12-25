import React from 'react';
import { ReportError, getErrorActions, getErrorSeverity, shouldShowErrorDetails } from '../utils/errorHandling';

interface ReportErrorDisplayProps {
  error: ReportError;
  onRetry?: () => void;
  onChangePeriod?: () => void;
  onGoBack?: () => void;
  reportType?: string;
  period?: string;
}

export default function ReportErrorDisplay({ 
  error, 
  onRetry, 
  onChangePeriod, 
  onGoBack,
  reportType,
  period 
}: ReportErrorDisplayProps) {
  const severity = getErrorSeverity(error);
  const actions = getErrorActions(error);
  const showDetails = shouldShowErrorDetails(error);

  const handleAction = (actionType: string) => {
    switch (actionType) {
      case 'retry':
        onRetry?.();
        break;
      case 'change-period':
        onChangePeriod?.();
        break;
      case 'go-home':
        onGoBack?.();
        break;
      case 'login':
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      case 'check-connection':
        // Show connection help
        alert('אנא בדוק את החיבור לאינטרנט ונסה שוב');
        break;
    }
  };

  const getSeverityStyles = () => {
    switch (severity) {
      case 'high':
        return {
          backgroundColor: '#fed7d7',
          borderColor: '#feb2b2',
          iconColor: '#e53e3e',
          icon: '🚨'
        };
      case 'medium':
        return {
          backgroundColor: '#fef5e7',
          borderColor: '#f6e05e',
          iconColor: '#d69e2e',
          icon: '⚠️'
        };
      case 'low':
        return {
          backgroundColor: '#e6fffa',
          borderColor: '#81e6d9',
          iconColor: '#319795',
          icon: 'ℹ️'
        };
    }
  };

  const severityStyles = getSeverityStyles();

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.errorCard,
        backgroundColor: severityStyles.backgroundColor,
        borderColor: severityStyles.borderColor
      }}>
        <div style={styles.errorHeader}>
          <span style={{ ...styles.errorIcon, color: severityStyles.iconColor }}>
            {severityStyles.icon}
          </span>
          <div style={styles.errorTitleSection}>
            <h3 style={styles.errorTitle}>שגיאה בטעינת הדוח</h3>
            {reportType && (
              <p style={styles.reportContext}>
                דוח: {reportType} {period && `• תקופה: ${period}`}
              </p>
            )}
          </div>
        </div>

        <div style={styles.errorContent}>
          <p style={styles.errorMessage}>{error.message}</p>
          
          {showDetails && error.details && (
            <div style={styles.errorDetails}>
              <details>
                <summary style={styles.errorDetailsSummary}>פרטים טכניים</summary>
                <div style={styles.errorDetailsContent}>
                  <pre>{error.details}</pre>
                </div>
              </details>
            </div>
          )}
        </div>

        <div style={styles.actions}>
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleAction(action.action)}
              style={{
                ...styles.actionButton,
                ...(action.primary ? styles.primaryButton : styles.secondaryButton)
              }}
            >
              {action.label}
            </button>
          ))}
        </div>

        {severity === 'high' && (
          <div style={styles.criticalNotice}>
            <p>⚠️ שגיאה קריטית - אנא פנה למנהל המערכת אם הבעיה נמשכת</p>
          </div>
        )}

        <div style={styles.helpSection}>
          <details>
            <summary style={styles.helpSummary}>עזרה ופתרון בעיות</summary>
            <div style={styles.helpContent}>
              <h4>צעדים לפתרון בעיות:</h4>
              <ol style={styles.helpList}>
                <li>בדוק את החיבור לאינטרנט</li>
                <li>רענן את הדף (F5)</li>
                <li>נסה לבחור תקופה אחרת</li>
                <li>התנתק והתחבר מחדש</li>
                <li>אם הבעיה נמשכת, פנה למנהל המערכת</li>
              </ol>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    padding: '20px',
  },
  errorCard: {
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '2px solid',
    maxWidth: '600px',
    width: '100%',
  },
  errorHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px',
  },
  errorIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  errorTitleSection: {
    flex: 1,
    textAlign: 'right',
  },
  errorTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: '0 0 4px 0',
  },
  reportContext: {
    fontSize: '14px',
    color: '#718096',
    margin: '0',
  },
  errorContent: {
    marginBottom: '24px',
  },
  errorMessage: {
    fontSize: '16px',
    color: '#4a5568',
    lineHeight: '1.6',
    margin: '0 0 16px 0',
    textAlign: 'right',
  },
  errorDetails: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid rgba(0,0,0,0.1)',
  },
  errorDetailsSummary: {
    cursor: 'pointer',
    fontWeight: '600',
    color: '#4a5568',
    fontSize: '14px',
  },
  errorDetailsContent: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#718096',
    backgroundColor: '#f7fafc',
    padding: '8px',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '120px',
    direction: 'ltr',
    textAlign: 'left',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  actionButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  },
  primaryButton: {
    backgroundColor: '#667eea',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: 'white',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
  },
  criticalNotice: {
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    border: '1px solid #feb2b2',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '16px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#742a2a',
    fontWeight: '600',
  },
  helpSection: {
    borderTop: '1px solid rgba(0,0,0,0.1)',
    paddingTop: '16px',
  },
  helpSummary: {
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    textAlign: 'right',
  },
  helpContent: {
    marginTop: '12px',
    textAlign: 'right',
  },
  helpList: {
    fontSize: '14px',
    color: '#718096',
    lineHeight: '1.6',
    paddingRight: '20px',
  },
};