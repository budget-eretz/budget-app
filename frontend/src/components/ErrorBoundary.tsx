import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ReportError, parseError, getErrorActions, ERROR_CODES } from '../utils/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: (error: ReportError, retry: () => void) => ReactNode;
  onError?: (error: ReportError) => void;
}

interface State {
  hasError: boolean;
  error: ReportError | null;
  errorId: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const reportError: ReportError = {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: error.message || 'אירעה שגיאה לא צפויה',
      recoverable: true
    };

    return {
      hasError: true,
      error: reportError,
      errorId: Date.now().toString()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (this.props.onError && this.state.error) {
      this.props.onError(this.state.error);
    }

    // Log error to monitoring service if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: ''
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      return <DefaultErrorFallback error={this.state.error} onRetry={this.retry} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: ReportError;
  onRetry: () => void;
}

function DefaultErrorFallback({ error, onRetry }: DefaultErrorFallbackProps) {
  const actions = getErrorActions(error);

  const handleAction = (actionType: string) => {
    switch (actionType) {
      case 'retry':
        onRetry();
        break;
      case 'login':
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      case 'go-home':
        window.location.href = '/dashboard';
        break;
      case 'change-period':
        // This would be handled by parent component
        break;
      case 'fix-dates':
        // This would be handled by parent component
        break;
      case 'check-connection':
        // Show connection help
        alert('אנא בדוק את החיבור לאינטרנט ונסה שוב');
        break;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.errorCard}>
        <div style={styles.errorIcon}>⚠️</div>
        <h3 style={styles.errorTitle}>
          {error.code === ERROR_CODES.UNKNOWN_ERROR ? 'שגיאה לא צפויה' : 'שגיאה בטעינת הדוח'}
        </h3>
        <p style={styles.errorMessage}>{error.message}</p>
        
        {error.details && (
          <details style={styles.errorDetails}>
            <summary style={styles.errorDetailsSummary}>פרטים נוספים</summary>
            <pre style={styles.errorDetailsContent}>{error.details}</pre>
          </details>
        )}

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

        <div style={styles.helpText}>
          <p>אם הבעיה נמשכת, אנא פנה למנהל המערכת</p>
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
    minHeight: '400px',
    padding: '20px',
  },
  errorCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #fed7d7',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  errorTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#742a2a',
    margin: '0 0 12px 0',
  },
  errorMessage: {
    fontSize: '16px',
    color: '#4a5568',
    lineHeight: '1.5',
    margin: '0 0 20px 0',
  },
  errorDetails: {
    textAlign: 'right',
    marginBottom: '20px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '12px',
  },
  errorDetailsSummary: {
    cursor: 'pointer',
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: '8px',
  },
  errorDetailsContent: {
    fontSize: '12px',
    color: '#718096',
    backgroundColor: '#f7fafc',
    padding: '8px',
    borderRadius: '4px',
    overflow: 'auto',
    maxHeight: '150px',
    textAlign: 'left',
    direction: 'ltr',
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
    borderRadius: '6px',
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
    backgroundColor: '#f7fafc',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
  },
  helpText: {
    fontSize: '12px',
    color: '#718096',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '16px',
    margin: '0',
  },
};