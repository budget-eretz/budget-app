import { useState } from 'react';
import Button from './Button';
import Modal from './Modal';

interface FundFormProps {
  fund?: {
    id: number;
    name: string;
    allocated_amount: number;
    description?: string;
  };
  budgetId: number;
  availableBudgetAmount: number;
  onSubmit: (data: FundFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export interface FundFormData {
  name: string;
  allocatedAmount: number;
  description?: string;
}

export default function FundForm({ 
  fund, 
  budgetId, 
  availableBudgetAmount, 
  onSubmit, 
  onCancel, 
  isLoading 
}: FundFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showWarning, setShowWarning] = useState(false);

  const [formData, setFormData] = useState<FundFormData>({
    name: fund?.name || '',
    allocatedAmount: fund?.allocated_amount || 0,
    description: fund?.description || '',
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'שם הקופה הוא שדה חובה';
    } else if (formData.name.length > 255) {
      newErrors.name = 'שם הקופה ארוך מדי (מקסימום 255 תווים)';
    }

    if (!formData.allocatedAmount || formData.allocatedAmount <= 0) {
      newErrors.allocatedAmount = 'יש להזין סכום חיובי';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'התיאור ארוך מדי (מקסימום 1000 תווים)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleChange = (field: keyof FundFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Check if allocated amount exceeds available budget
    if (field === 'allocatedAmount') {
      const amount = parseFloat(value) || 0;
      // When editing, add back the current fund's allocation to available amount
      const adjustedAvailable = fund 
        ? availableBudgetAmount + fund.allocated_amount 
        : availableBudgetAmount;
      setShowWarning(amount > adjustedAvailable);
    }
  };

  // Calculate adjusted available amount for display
  const displayAvailableAmount = fund 
    ? availableBudgetAmount + fund.allocated_amount 
    : availableBudgetAmount;

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={fund ? 'עריכת קופה' : 'יצירת קופה חדשה'}
      size="md"
    >
      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Available Budget Info */}
        <div style={styles.infoBox}>
          <div style={styles.infoLabel}>תקציב זמין להקצאה:</div>
          <div style={styles.infoAmount}>
            ₪{displayAvailableAmount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Name field */}
        <div style={styles.field}>
          <label style={styles.label}>
            שם הקופה <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            style={{
              ...styles.input,
              ...(errors.name ? styles.inputError : {}),
            }}
            placeholder="לדוגמה: קופת פעילויות"
            maxLength={255}
            disabled={isLoading}
          />
          {errors.name && <span style={styles.errorText}>{errors.name}</span>}
        </div>

        {/* Allocated Amount field */}
        <div style={styles.field}>
          <label style={styles.label}>
            סכום מוקצה <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={formData.allocatedAmount || ''}
            onChange={(e) => handleChange('allocatedAmount', parseFloat(e.target.value) || 0)}
            style={{
              ...styles.input,
              ...(errors.allocatedAmount ? styles.inputError : {}),
            }}
            placeholder="0.00"
            disabled={isLoading}
          />
          {errors.allocatedAmount && <span style={styles.errorText}>{errors.allocatedAmount}</span>}
          {showWarning && (
            <div style={styles.warningBox}>
              <span style={styles.warningIcon}>⚠️</span>
              <span style={styles.warningText}>
                הסכום המוקצה עולה על התקציב הזמין. ניתן להמשיך, אך זה עלול ליצור חריגה בתקציב.
              </span>
            </div>
          )}
        </div>

        {/* Description field */}
        <div style={styles.field}>
          <label style={styles.label}>תיאור (אופציונלי)</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            style={{
              ...styles.textarea,
              ...(errors.description ? styles.inputError : {}),
            }}
            placeholder="תיאור מפורט של מטרת הקופה..."
            maxLength={1000}
            rows={4}
            disabled={isLoading}
          />
          {errors.description && <span style={styles.errorText}>{errors.description}</span>}
          <small style={{ color: '#718096', fontSize: '13px' }}>
            {formData.description?.length || 0}/1000 תווים
          </small>
        </div>

        {/* Action buttons */}
        <div style={styles.actions} className="fund-form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            ביטול
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
          >
            {fund ? 'עדכן קופה' : 'צור קופה'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  infoBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  infoLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
  },
  infoAmount: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#667eea',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  input: {
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  textarea: {
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  errorText: {
    color: '#e53e3e',
    fontSize: '13px',
    marginTop: '4px',
  },
  warningBox: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#fffaf0',
    border: '1px solid #fbd38d',
    borderRadius: '6px',
    marginTop: '8px',
  },
  warningIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  warningText: {
    fontSize: '13px',
    color: '#744210',
    lineHeight: '1.5',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
};

// Add media query styles
const mediaQueryStyle = document.createElement('style');
mediaQueryStyle.textContent = `
  @media (max-width: 768px) {
    .fund-form-actions {
      flex-direction: column-reverse !important;
    }
    .fund-form-actions button {
      width: 100%;
    }
  }
`;
if (!document.head.querySelector('style[data-fund-form]')) {
  mediaQueryStyle.setAttribute('data-fund-form', 'true');
  document.head.appendChild(mediaQueryStyle);
}
