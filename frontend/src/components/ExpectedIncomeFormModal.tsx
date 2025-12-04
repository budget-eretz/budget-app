import { useState, useEffect } from 'react';
import Modal from './Modal';
import { ExpectedIncome, IncomeCategory, BasicUser } from '../types';
import { useAuth } from '../context/AuthContext';

interface ExpectedIncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpectedIncomeFormData) => Promise<void>;
  expectedIncome?: ExpectedIncome | null;
  categories: IncomeCategory[];
  users: BasicUser[];
  mode: 'annual' | 'monthly';
  defaultYear?: number;
  defaultMonth?: number;
}

export interface ExpectedIncomeFormData {
  source_name: string;
  user_id?: number;
  amount: number;
  description: string;
  year: number;
  month?: number;
  frequency?: 'one-time' | 'monthly' | 'quarterly' | 'annual';
  categoryIds: number[];
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export default function ExpectedIncomeFormModal({
  isOpen,
  onClose,
  onSubmit,
  expectedIncome,
  categories,
  users,
  mode,
  defaultYear,
  defaultMonth,
}: ExpectedIncomeFormModalProps) {
  const { user } = useAuth();
  const isCircleTreasurer = user?.isCircleTreasurer || false;
  
  const [formData, setFormData] = useState<ExpectedIncomeFormData>({
    source_name: '',
    user_id: undefined,
    amount: 0,
    description: '',
    year: defaultYear || new Date().getFullYear(),
    month: defaultMonth,
    frequency: 'monthly',
    categoryIds: [],
  });
  const [sourceType, setSourceType] = useState<'user' | 'other'>('user');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (expectedIncome) {
        // Edit mode - populate form with existing data
        const isUserSource = users.some(u => u.fullName === expectedIncome.source_name);
        setSourceType(isUserSource ? 'user' : 'other');
        
        setFormData({
          source_name: isUserSource ? '' : expectedIncome.source_name,
          user_id: isUserSource ? expectedIncome.user_id : undefined,
          amount: expectedIncome.amount,
          description: expectedIncome.description || '',
          year: expectedIncome.year,
          month: expectedIncome.month,
          frequency: expectedIncome.frequency,
          categoryIds: expectedIncome.categories?.map(c => c.id) || [],
        });
      } else {
        // Create mode - reset form
        // For non-treasurers, default to their own user ID
        const defaultUserId = !isCircleTreasurer && user?.id ? user.id : undefined;
        
        setFormData({
          source_name: '',
          user_id: defaultUserId,
          amount: 0,
          description: '',
          year: defaultYear || new Date().getFullYear(),
          month: defaultMonth,
          frequency: 'monthly',
          categoryIds: [],
        });
        setSourceType('user');
      }
      setErrors({});
    }
  }, [isOpen, expectedIncome, users, mode, defaultYear, defaultMonth, isCircleTreasurer, user]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'יש להזין סכום חיובי';
    }

    if (sourceType === 'user' && !formData.user_id) {
      newErrors.source = 'יש לבחור חבר';
    }

    if (sourceType === 'other' && !formData.source_name.trim()) {
      newErrors.source = 'יש להזין שם מקור';
    }

    if (!formData.year) {
      newErrors.year = 'יש לבחור שנה';
    }

    if (mode === 'annual' && formData.frequency === 'one-time' && !formData.month) {
      newErrors.month = 'יש לבחור חודש להכנסה חד-פעמית';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare submission data
      const submitData: ExpectedIncomeFormData = {
        ...formData,
      };

      // Set source based on type
      if (sourceType === 'user' && formData.user_id) {
        const selectedUser = users.find(u => u.id === formData.user_id);
        submitData.source_name = selectedUser?.fullName || '';
      } else {
        submitData.source_name = formData.source_name;
        submitData.user_id = undefined;
      }

      // For monthly mode, ensure month is set
      if (mode === 'monthly') {
        submitData.month = formData.month || defaultMonth;
        submitData.frequency = undefined; // Not used in monthly mode
      }

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Error submitting expected income:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryToggle = (categoryId: number) => {
    setFormData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  };

  const getModalTitle = () => {
    if (expectedIncome) {
      return 'עריכת הכנסה צפויה';
    }
    return mode === 'annual' ? 'הוספת הכנסה צפויה שנתית' : 'הוספת הכנסה צפויה חודשית';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size="md"
    >
      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Source Type Selection */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            סוג מקור <span style={styles.required}>*</span>
          </label>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="user"
                checked={sourceType === 'user'}
                onChange={() => {
                  setSourceType('user');
                  setFormData({ ...formData, source_name: '', user_id: undefined });
                  setErrors({ ...errors, source: '' });
                }}
                style={styles.radio}
              />
              <span>חבר</span>
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                value="other"
                checked={sourceType === 'other'}
                onChange={() => {
                  setSourceType('other');
                  setFormData({ ...formData, source_name: '', user_id: undefined });
                  setErrors({ ...errors, source: '' });
                }}
                style={styles.radio}
              />
              <span>מקור אחר</span>
            </label>
          </div>
        </div>

        {/* Source Selection */}
        {sourceType === 'user' ? (
          <div style={styles.formGroup}>
            <label style={styles.label}>
              בחר חבר <span style={styles.required}>*</span>
            </label>
            <select
              value={formData.user_id || ''}
              onChange={(e) => setFormData({ ...formData, user_id: parseInt(e.target.value) || undefined })}
              style={{
                ...styles.select,
                ...(errors.source ? styles.inputError : {}),
              }}
              disabled={!isCircleTreasurer}
            >
              <option value="">-- בחר חבר --</option>
              {users
                .filter(u => isCircleTreasurer || u.id === user?.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
            </select>
            {errors.source && <span style={styles.errorText}>{errors.source}</span>}
            {!isCircleTreasurer && (
              <span style={styles.infoText}>ניתן להוסיף הכנסה צפויה רק על עצמך</span>
            )}
          </div>
        ) : (
          <div style={styles.formGroup}>
            <label style={styles.label}>
              שם מקור <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.source_name}
              onChange={(e) => setFormData({ ...formData, source_name: e.target.value })}
              style={{
                ...styles.input,
                ...(errors.source ? styles.inputError : {}),
              }}
              placeholder="לדוגמה: תרומה, מענק, וכו'"
            />
            {errors.source && <span style={styles.errorText}>{errors.source}</span>}
          </div>
        )}

        {/* Amount */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            {mode === 'annual' ? 'סכום שנתי' : 'סכום'} <span style={styles.required}>*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            style={{
              ...styles.input,
              ...(errors.amount ? styles.inputError : {}),
            }}
            placeholder="0.00"
          />
          {errors.amount && <span style={styles.errorText}>{errors.amount}</span>}
        </div>

        {/* Description */}
        <div style={styles.formGroup}>
          <label style={styles.label}>תיאור</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={styles.textarea}
            placeholder="תיאור ההכנסה הצפויה..."
            rows={3}
          />
        </div>

        {/* Year */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            שנה <span style={styles.required}>*</span>
          </label>
          <input
            type="number"
            min="2000"
            max="2100"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
            style={{
              ...styles.input,
              ...(errors.year ? styles.inputError : {}),
            }}
          />
          {errors.year && <span style={styles.errorText}>{errors.year}</span>}
        </div>

        {/* Frequency (Annual mode only) */}
        {mode === 'annual' && (
          <div style={styles.formGroup}>
            <label style={styles.label}>
              תדירות <span style={styles.required}>*</span>
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ 
                ...formData, 
                frequency: e.target.value as 'one-time' | 'monthly' | 'quarterly' | 'annual',
                month: e.target.value === 'one-time' ? formData.month : undefined,
              })}
              style={styles.select}
            >
              <option value="monthly">חודשי (12 פעמים בשנה)</option>
              <option value="quarterly">רבעוני (4 פעמים בשנה)</option>
              <option value="annual">שנתי (פעם אחת בשנה)</option>
              <option value="one-time">חד-פעמי (חודש ספציפי)</option>
            </select>
          </div>
        )}

        {/* Month (for one-time frequency or monthly mode) */}
        {(mode === 'annual' && formData.frequency === 'one-time') && (
          <div style={styles.formGroup}>
            <label style={styles.label}>
              חודש <span style={styles.required}>*</span>
            </label>
            <select
              value={formData.month || ''}
              onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) || undefined })}
              style={{
                ...styles.select,
                ...(errors.month ? styles.inputError : {}),
              }}
            >
              <option value="">-- בחר חודש --</option>
              {HEBREW_MONTHS.map((monthName, index) => (
                <option key={index + 1} value={index + 1}>
                  {monthName}
                </option>
              ))}
            </select>
            {errors.month && <span style={styles.errorText}>{errors.month}</span>}
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div style={styles.formGroup}>
            <label style={styles.label}>קטגוריות</label>
            <div style={styles.categoriesGrid}>
              {categories.map((category) => (
                <label
                  key={category.id}
                  style={{
                    ...styles.categoryOption,
                    ...(formData.categoryIds.includes(category.id) ? styles.categoryOptionSelected : {}),
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.categoryIds.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    style={styles.categoryCheckbox}
                  />
                  <span
                    style={{
                      ...styles.categoryBadge,
                      backgroundColor: category.color || '#e2e8f0',
                      color: getContrastColor(category.color || '#e2e8f0'),
                    }}
                  >
                    {category.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div style={styles.formActions}>
          <button
            type="button"
            onClick={onClose}
            style={styles.cancelBtn}
            disabled={isSubmitting}
          >
            ביטול
          </button>
          <button
            type="submit"
            style={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'שומר...' : expectedIncome ? 'עדכן' : 'הוסף'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Helper function to determine text color based on background
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  required: {
    color: '#e53e3e',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.2s',
    outline: 'none',
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer',
    outline: 'none',
  },
  radioGroup: {
    display: 'flex',
    gap: '20px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  radio: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  categoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '10px',
  },
  categoryOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  categoryOptionSelected: {
    borderColor: '#667eea',
    background: '#f7fafc',
  },
  categoryCheckbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  categoryBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    flex: 1,
    textAlign: 'center',
  },
  errorText: {
    fontSize: '13px',
    color: '#e53e3e',
    marginTop: '4px',
  },
  infoText: {
    fontSize: '13px',
    color: '#718096',
    marginTop: '4px',
    fontStyle: 'italic',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
    paddingTop: '20px',
    borderTop: '1px solid #e2e8f0',
  },
  cancelBtn: {
    padding: '10px 20px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    background: 'white',
    color: '#4a5568',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    background: '#667eea',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
