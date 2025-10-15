import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { groupsAPI } from '../services/api';
import Button from './Button';
import Modal from './Modal';

interface BudgetFormProps {
  budget?: {
    id: number;
    name: string;
    total_amount: number;
    fiscal_year?: number;
    group_id?: number;
  };
  onSubmit: (data: BudgetFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export interface BudgetFormData {
  name: string;
  totalAmount: number;
  fiscalYear?: number;
  groupId?: number;
}

interface Group {
  id: number;
  name: string;
}

export default function BudgetForm({ budget, onSubmit, onCancel, isLoading }: BudgetFormProps) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<BudgetFormData>({
    name: budget?.name || '',
    totalAmount: budget?.total_amount || 0,
    fiscalYear: budget?.fiscal_year || new Date().getFullYear(),
    groupId: budget?.group_id || undefined,
  });

  useEffect(() => {
    // Fetch groups for circle treasurer
    if (user?.isCircleTreasurer) {
      loadGroups();
    }
  }, [user]);

  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await groupsAPI.getAll();
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'שם התקציב הוא שדה חובה';
    } else if (formData.name.length > 255) {
      newErrors.name = 'שם התקציב ארוך מדי (מקסימום 255 תווים)';
    }

    if (!formData.totalAmount || formData.totalAmount <= 0) {
      newErrors.totalAmount = 'יש להזין סכום חיובי';
    }

    if (formData.fiscalYear && (formData.fiscalYear < 2000 || formData.fiscalYear > 2100)) {
      newErrors.fiscalYear = 'שנת תקציב לא תקינה';
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

  const handleChange = (field: keyof BudgetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={budget ? 'עריכת תקציב' : 'יצירת תקציב חדש'}
      size="md"
    >
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGrid} className="budget-form-grid">
          {/* Name field */}
          <div style={styles.field}>
            <label style={styles.label}>
              שם התקציב <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              style={{
                ...styles.input,
                ...(errors.name ? styles.inputError : {}),
              }}
              placeholder="לדוגמה: תקציב מעגלי 2025"
              maxLength={255}
              disabled={isLoading}
            />
            {errors.name && <span style={styles.errorText}>{errors.name}</span>}
          </div>

          {/* Total Amount field */}
          <div style={styles.field}>
            <label style={styles.label}>
              סכום כולל <span style={{ color: '#e53e3e' }}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.totalAmount || ''}
              onChange={(e) => handleChange('totalAmount', parseFloat(e.target.value) || 0)}
              style={{
                ...styles.input,
                ...(errors.totalAmount ? styles.inputError : {}),
              }}
              placeholder="0.00"
              disabled={isLoading}
            />
            {errors.totalAmount && <span style={styles.errorText}>{errors.totalAmount}</span>}
          </div>

          {/* Fiscal Year field */}
          <div style={styles.field}>
            <label style={styles.label}>שנת תקציב</label>
            <input
              type="number"
              min="2000"
              max="2100"
              value={formData.fiscalYear || ''}
              onChange={(e) => handleChange('fiscalYear', e.target.value ? parseInt(e.target.value) : undefined)}
              style={{
                ...styles.input,
                ...(errors.fiscalYear ? styles.inputError : {}),
              }}
              placeholder={new Date().getFullYear().toString()}
              disabled={isLoading}
            />
            {errors.fiscalYear && <span style={styles.errorText}>{errors.fiscalYear}</span>}
          </div>

          {/* Group field - only for circle treasurer */}
          {user?.isCircleTreasurer && (
            <div style={styles.field}>
              <label style={styles.label}>קבוצה (אופציונלי)</label>
              <select
                value={formData.groupId || ''}
                onChange={(e) => handleChange('groupId', e.target.value ? parseInt(e.target.value) : undefined)}
                style={styles.select}
                disabled={isLoading || loadingGroups}
              >
                <option value="">תקציב מעגלי (ללא קבוצה)</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <small style={{ color: '#718096', fontSize: '13px' }}>
                השאר ריק עבור תקציב מעגלי, או בחר קבוצה עבור תקציב קבוצתי
              </small>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={styles.actions} className="budget-form-actions">
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
            {budget ? 'עדכן תקציב' : 'צור תקציב'}
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
    gap: '24px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
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
  inputError: {
    borderColor: '#e53e3e',
  },
  select: {
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: 'white',
  },
  errorText: {
    color: '#e53e3e',
    fontSize: '13px',
    marginTop: '4px',
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
    .budget-form-grid {
      grid-template-columns: 1fr !important;
    }
    .budget-form-actions {
      flex-direction: column-reverse !important;
    }
    .budget-form-actions button {
      width: 100%;
    }
  }
`;
if (!document.head.querySelector('style[data-budget-form]')) {
  mediaQueryStyle.setAttribute('data-budget-form', 'true');
  document.head.appendChild(mediaQueryStyle);
}
