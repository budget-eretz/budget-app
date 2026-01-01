import React, { useState, useEffect, createContext, useContext } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

function Toast({ message, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (message.duration !== 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, message.duration || 5000);

      return () => clearTimeout(timer);
    }
  }, [message.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(message.id);
    }, 300);
  };

  const getTypeStyles = () => {
    switch (message.type) {
      case 'success':
        return {
          backgroundColor: '#c6f6d5',
          borderColor: '#68d391',
          iconColor: '#38a169',
          icon: '✓'
        };
      case 'error':
        return {
          backgroundColor: '#fed7d7',
          borderColor: '#feb2b2',
          iconColor: '#e53e3e',
          icon: '✕'
        };
      case 'warning':
        return {
          backgroundColor: '#fef5e7',
          borderColor: '#f6e05e',
          iconColor: '#d69e2e',
          icon: '⚠'
        };
      case 'info':
        return {
          backgroundColor: '#e6fffa',
          borderColor: '#81e6d9',
          iconColor: '#319795',
          icon: 'ℹ'
        };
    }
  };

  const typeStyles = getTypeStyles();

  if (!isVisible) return null;

  return (
    <div
      style={{
        ...styles.toast,
        backgroundColor: typeStyles.backgroundColor,
        borderColor: typeStyles.borderColor,
        ...(isExiting ? styles.toastExiting : styles.toastEntering)
      }}
    >
      <div style={styles.toastContent}>
        <div style={{ ...styles.toastIcon, color: typeStyles.iconColor }}>
          {typeStyles.icon}
        </div>
        <div style={styles.toastText}>
          <div style={styles.toastTitle}>{message.title}</div>
          <div style={styles.toastMessage}>{message.message}</div>
        </div>
        {message.action && (
          <button
            onClick={message.action.onClick}
            style={styles.toastAction}
          >
            {message.action.label}
          </button>
        )}
        <button
          onClick={handleClose}
          style={styles.toastClose}
        >
          ×
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  messages: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ messages, onClose }: ToastContainerProps) {
  return (
    <div style={styles.container}>
      {messages.map((message) => (
        <Toast
          key={message.id}
          message={message}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setMessages(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const clearAll = () => {
    setMessages([]);
  };

  // Simple wrapper for backward compatibility with (message, type) signature
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    addToast({ type, title: message, message: '' });
  };

  return {
    messages,
    addToast,
    removeToast,
    clearAll,
    showToast, // Simple (message, type) signature
    success: (title: string, message: string, action?: ToastMessage['action']) =>
      addToast({ type: 'success', title, message, action }),
    error: (title: string, message: string, action?: ToastMessage['action']) =>
      addToast({ type: 'error', title, message, action }),
    warning: (title: string, message: string, action?: ToastMessage['action']) =>
      addToast({ type: 'warning', title, message, action }),
    info: (title: string, message: string, action?: ToastMessage['action']) =>
      addToast({ type: 'info', title, message, action }),
  };
}

// Toast Context
interface ToastContextType {
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  success: (title: string, message: string, action?: ToastMessage['action']) => void;
  error: (title: string, message: string, action?: ToastMessage['action']) => void;
  warning: (title: string, message: string, action?: ToastMessage['action']) => void;
  info: (title: string, message: string, action?: ToastMessage['action']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast Provider Component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer messages={toast.messages} onClose={toast.removeToast} />
    </ToastContext.Provider>
  );
}

// Hook to use toast context
export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '400px',
  },
  toast: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    direction: 'rtl',
  },
  toastEntering: {
    animation: 'slideInRight 0.3s ease',
  },
  toastExiting: {
    animation: 'slideOutRight 0.3s ease',
    opacity: 0,
    transform: 'translateX(100%)',
  },
  toastContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  toastIcon: {
    fontSize: '18px',
    fontWeight: 'bold',
    flexShrink: 0,
    marginTop: '2px',
  },
  toastText: {
    flex: 1,
    minWidth: 0,
  },
  toastTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '4px',
  },
  toastMessage: {
    fontSize: '13px',
    color: '#4a5568',
    lineHeight: '1.4',
  },
  toastAction: {
    padding: '4px 12px',
    backgroundColor: 'rgba(255,255,255,0.8)',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    flexShrink: 0,
  },
  toastClose: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#718096',
    padding: '0',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};

// Add CSS animations
const animationStyle = document.createElement('style');
animationStyle.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
if (!document.head.querySelector('style[data-toast-animations]')) {
  animationStyle.setAttribute('data-toast-animations', 'true');
  document.head.appendChild(animationStyle);
}

export default Toast;