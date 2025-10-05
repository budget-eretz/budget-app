import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { maxWidth: '400px' },
    md: { maxWidth: '600px' },
    lg: { maxWidth: '800px' },
  };

  return (
    <div style={styles.overlay} onClick={onClose} className="modal-overlay">
      <div
        style={{ ...styles.modal, ...sizeStyles[size] }}
        onClick={(e) => e.stopPropagation()}
        className={`modal-content modal-${size}`}
      >
        <div style={styles.header} className="modal-header">
          <h2 style={styles.title}>{title}</h2>
          <button onClick={onClose} style={styles.closeBtn} className="modal-close-btn">
            ✕
          </button>
        </div>
        <div style={styles.content} className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// Add responsive styles for modals on mobile
const modalMediaQueryStyle = document.createElement('style');
modalMediaQueryStyle.textContent = `
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0 !important;
      align-items: flex-end !important;
    }
    .modal-content {
      max-width: 100% !important;
      max-height: 95vh !important;
      border-radius: 12px 12px 0 0 !important;
      margin: 0 !important;
    }
    .modal-header {
      padding: 16px 20px !important;
    }
    .modal-header h2 {
      font-size: 18px !important;
    }
    .modal-close-btn {
      min-width: 44px !important;
      min-height: 44px !important;
      font-size: 28px !important;
    }
    .modal-body {
      padding: 20px !important;
    }
  }
`;
if (!document.head.querySelector('style[data-modal-responsive]')) {
  modalMediaQueryStyle.setAttribute('data-modal-responsive', 'true');
  document.head.appendChild(modalMediaQueryStyle);
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    background: 'white',
    borderRadius: '8px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#718096',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  content: {
    padding: '24px',
  },
};
