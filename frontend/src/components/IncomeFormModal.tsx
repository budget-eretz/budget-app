import { useState, useEffect } from 'react';
import Modal from './Modal';
import { Income, IncomeCategory, BasicUser } from '../types';
import { useAuth } from '../context/AuthContext';

interface IncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: IncomeFormData) => Promise<void>;
  income?: Income | null;
  categories: IncomeCategory[];
  users: BasicUser[];
}

export interface IncomeFormData {
  amount: number;
  income_date: string;
  description: string;
  source: string;
  user_id?: number;
  categoryIds: number[];
}

export default function IncomeFormModal({
  isOpen,
  onClose,
  onSubmit,
  income,
  categories,
  users,
}: IncomeFormModalProps) {
  const { user } = useAuth();
  const isCircleTreasurer = user?.isCircleTreasurer || false;

  const [formData, setFormData] = useState<IncomeFormData>({
    amount: 0,
    income_date: new Date().toISOString().split('T')[0],
    description: '',
    source: '',
    user_id: undefined,
    categoryIds: [],
  });
  const [sourceType, setSourceType] = useState<'user' | 'other'>('user');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (income) {
        // Edit mode - populate form with existing income data
        const isUserSource = users.some(u => u.fullName === income.source);
        setSourceType(isUserSource ? 'user' : 'other');

        setFormData({
          amount: income.amount,
          income_date: income.income_date.split('T')[0],
          description: income.description || '',
          source: isUserSource ? '' : income.source,
          user_id: isUserSource ? income.user_id : undefined,
          categoryIds: income.categories?.map(c => c.id) || [],
        });
      } else {
        // Create mode - reset form
        setFormData({
          amount: 0,
          income_date: new Date().toISOString().split('T')[0],
          description: '',
          source: '',
          user_id: undefined,
          categoryIds: [],
        });
        setSourceType('user');
      }
      setErrors({});
    }
  }, [isOpen, income, users, isCircleTreasurer]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'יש להזין סכום חיובי';
    }

    if (!formData.income_date) {
      newErrors.income_date = 'יש לבחור תאריך';
    }

    if (sourceType === 'user' && !formData.user_id) {
      newErrors.source = 'יש לבחור חבר';
    }

    if (sourceType === 'other' && !formData.source.trim()) {
      newErrors.source = 'יש להזין שם מקור';
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
      const submitData: IncomeFormData = {
        ...formData,
      };

      // Set source based on type
      if (sourceType === 'user' && formData.user_id) {
        const selectedUser = users.find(u => u.id === formData.user_id);
        submitData.source = selectedUser?.fullName || '';
      } else {
        submitData.source = formData.source;
        submitData.user_id = undefined;
      }

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Error submitting income:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategorySelect = (categoryId: number) => {
    setFormData(prev => ({
      ...prev,
      categoryIds: [categoryId], // Only allow one category
    }));
  };

  const handleCategoryClear = () => {
    setFormData(prev => ({
      ...prev,
      categoryIds: [],
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={income ? 'עריכת הכנסה' : 'הוספת הכנסה חדשה'}
      size="md"
    >
      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Amount */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            סכום <span style={styles.required}>*</span>
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

        {/* Income Date */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            תאריך הכנסה <span style={styles.required}>*</span>
          </label>
          <input
            type="date"
            value={formData.income_date}
            onChange={(e) => setFormData({ ...formData, income_date: e.target.value })}
            style={{
              ...styles.input,
              ...(errors.income_date ? styles.inputError : {}),
            }}
          />
          {errors.income_date && <span style={styles.errorText}>{errors.income_date}</span>}
        </div>

        {/* Description */}
        <div style={styles.formGroup}>
          <label style={styles.label}>תיאור</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={styles.textarea}
            placeholder="תיאור ההכנסה..."
            rows={3}
          />
        </div>

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
                  setFormData({ ...formData, source: '', user_id: undefined });
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
                  setFormData({ ...formData, source: '', user_id: undefined });
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
            >
              <option value="">-- בחר חבר --</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </select>
            {errors.source && <span style={styles.errorText}>{errors.source}</span>}
          </div>
        ) : (
          <div style={styles.formGroup}>
            <label style={styles.label}>
              שם מקור <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              style={{
                ...styles.input,
                ...(errors.source ? styles.inputError : {}),
              }}
              placeholder="לדוגמה: תרומה, מענק, וכו'"
            />
            {errors.source && <span style={styles.errorText}>{errors.source}</span>}
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div style={styles.formGroup}>
            <label style={styles.label}>קטגוריה</label>
            <div style={styles.categoriesGrid}>
              <label
                style={{
                  ...styles.categoryOption,
                  ...(formData.categoryIds.length === 0 ? styles.categoryOptionSelected : {}),
                }}
              >
                <input
                  type="radio"
                  name="category"
                  checked={formData.categoryIds.length === 0}
                  onChange={handleCategoryClear}
                  style={styles.categoryRadio}
                />
                <span style={styles.noCategoryBadge}>
                  ללא קטגוריה
                </span>
              </label>
              {categories.map((category) => (
                <label
                  key={category.id}
                  style={{
                    ...styles.categoryOption,
                    ...(formData.categoryIds.includes(category.id) ? styles.categoryOptionSelected : {}),
                  }}
                >
                  <input
                    type="radio"
                    name="category"
                    checked={formData.categoryIds.includes(category.id)}
                    onChange={() => handleCategorySelect(category.id)}
                    style={styles.categoryRadio}
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
            {isSubmitting ? 'שומר...' : income ? 'עדכן' : 'הוסף'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Helper function to determine text color based on background
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
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
  categoryRadio: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  noCategoryBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    flex: 1,
    textAlign: 'center',
    backgroundColor: '#f7fafc',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
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
  helpText: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '4px',
  },
};
