import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    border: 'none',
    borderRadius: '6px',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s',
    opacity: disabled || isLoading ? 0.6 : 1,
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: '#667eea',
      color: 'white',
    },
    secondary: {
      background: '#718096',
      color: 'white',
    },
    success: {
      background: '#38a169',
      color: 'white',
    },
    danger: {
      background: '#e53e3e',
      color: 'white',
    },
    warning: {
      background: '#dd6b20',
      color: 'white',
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: '6px 12px',
      fontSize: '13px',
      minHeight: '36px',
    },
    md: {
      padding: '8px 16px',
      fontSize: '14px',
      minHeight: '40px',
    },
    lg: {
      padding: '12px 24px',
      fontSize: '16px',
      minHeight: '48px',
    },
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`btn-${variant} btn-${size} ${props.className || ''}`}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...props.style,
      }}
    >
      {isLoading ? 'טוען...' : children}
    </button>
  );
}

// Add responsive styles for touch-friendly buttons on mobile
const buttonMediaQueryStyle = document.createElement('style');
buttonMediaQueryStyle.textContent = `
  @media (max-width: 768px) {
    button.btn-sm {
      min-height: 44px !important;
      padding: 10px 16px !important;
      font-size: 14px !important;
    }
    button.btn-md {
      min-height: 48px !important;
      padding: 12px 20px !important;
      font-size: 16px !important;
    }
    button.btn-lg {
      min-height: 52px !important;
      padding: 14px 28px !important;
      font-size: 18px !important;
    }
  }
`;
if (!document.head.querySelector('style[data-button-responsive]')) {
  buttonMediaQueryStyle.setAttribute('data-button-responsive', 'true');
  document.head.appendChild(buttonMediaQueryStyle);
}
