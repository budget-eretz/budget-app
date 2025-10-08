import { useState } from 'react';
import { IncomeCategory } from '../types';

interface CategoryManagerProps {
  categories: IncomeCategory[];
  onCreateCategory: (data: CategoryFormData) => Promise<void>;
  onUpdateCategory: (id: number, data: CategoryFormData) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  color?: string;
}

const PRESET_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange-red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export default function CategoryManager({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    color: PRESET_COLORS[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: PRESET_COLORS[0],
    });
    setErrors({});
    setIsAdding(false);
    setEditingId(null);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'יש להזין שם קטגוריה';
    }

    // Check for duplicate names (excluding current category when editing)
    const isDuplicate = categories.some(
      (cat) => cat.name.toLowerCase() === formData.name.trim().toLowerCase() && cat.id !== editingId
    );
    if (isDuplicate) {
      newErrors.name = 'שם קטגוריה זה כבר קיים';
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
      if (editingId) {
        await onUpdateCategory(editingId, formData);
      } else {
        await onCreateCategory(formData);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: IncomeCategory) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || PRESET_COLORS[0],
    });
    setIsAdding(true);
    setErrors({});
  };

  const handleDelete = async (category: IncomeCategory) => {
    const incomeCount = category.income_count || 0;
    
    let confirmMessage = `האם אתה בטוח שברצונך למחוק את הקטגוריה "${category.name}"?`;
    if (incomeCount > 0) {
      confirmMessage += `\n\nקטגוריה זו משויכת ל-${incomeCount} הכנסות. הקטגוריה תוסר מההכנסות אך ההכנסות עצמן לא יימחקו.`;
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setDeletingId(category.id);

    try {
      await onDeleteCategory(category.id);
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={styles.container}>
      {/* Category List */}
      <div style={styles.listSection}>
        <h3 style={styles.sectionTitle}>קטגוריות קיימות</h3>
        {categories.length === 0 ? (
          <div style={styles.emptyState}>
            <p>אין קטגוריות. הוסף קטגוריה ראשונה!</p>
          </div>
        ) : (
          <div style={styles.categoryList}>
            {categories.map((category) => (
              <div key={category.id} style={styles.categoryItem}>
                <div style={styles.categoryInfo}>
                  <span
                    style={{
                      ...styles.colorIndicator,
                      backgroundColor: category.color || '#e2e8f0',
                    }}
                  />
                  <div style={styles.categoryDetails}>
                    <div style={styles.categoryName}>{category.name}</div>
                    {category.description && (
                      <div style={styles.categoryDescription}>{category.description}</div>
                    )}
                    {category.income_count !== undefined && category.income_count > 0 && (
                      <div style={styles.categoryCount}>
                        {category.income_count} הכנסות משויכות
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.categoryActions}>
                  <button
                    onClick={() => handleEdit(category)}
                    style={styles.editBtn}
                    disabled={deletingId === category.id}
                    title="ערוך"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(category)}
                    style={styles.deleteBtn}
                    disabled={deletingId === category.id}
                    title="מחק"
                  >
                    {deletingId === category.id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      <div style={styles.formSection}>
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            style={styles.addBtn}
          >
            + הוסף קטגוריה חדשה
          </button>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <h3 style={styles.formTitle}>
              {editingId ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}
            </h3>

            {/* Name */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                שם קטגוריה <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  ...styles.input,
                  ...(errors.name ? styles.inputError : {}),
                }}
                placeholder="לדוגמה: דמי חבר, תרומות, מכירות"
                autoFocus
              />
              {errors.name && <span style={styles.errorText}>{errors.name}</span>}
            </div>

            {/* Description */}
            <div style={styles.formGroup}>
              <label style={styles.label}>תיאור</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={styles.textarea}
                placeholder="תיאור אופציונלי של הקטגוריה..."
                rows={2}
              />
            </div>

            {/* Color Picker */}
            <div style={styles.formGroup}>
              <label style={styles.label}>צבע</label>
              <div style={styles.colorGrid}>
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    style={{
                      ...styles.colorOption,
                      backgroundColor: color,
                      ...(formData.color === color ? styles.colorOptionSelected : {}),
                    }}
                    title={color}
                  >
                    {formData.color === color && <span style={styles.checkmark}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div style={styles.formActions}>
              <button
                type="button"
                onClick={resetForm}
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
                {isSubmitting ? 'שומר...' : editingId ? 'עדכן' : 'הוסף'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  listSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#718096',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px dashed #e2e8f0',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  categoryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s',
  },
  categoryInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  colorIndicator: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    flexShrink: 0,
    border: '2px solid white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  categoryDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  categoryName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2d3748',
  },
  categoryDescription: {
    fontSize: '13px',
    color: '#718096',
  },
  categoryCount: {
    fontSize: '12px',
    color: '#667eea',
    fontWeight: '500',
  },
  categoryActions: {
    display: 'flex',
    gap: '8px',
  },
  editBtn: {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px',
    background: '#4299e1',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  deleteBtn: {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px',
    background: '#e53e3e',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  formSection: {
    paddingTop: '24px',
    borderTop: '2px solid #e2e8f0',
  },
  addBtn: {
    width: '100%',
    padding: '14px',
    border: '2px dashed #667eea',
    borderRadius: '8px',
    background: 'white',
    color: '#667eea',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
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
    background: 'white',
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
    background: 'white',
    resize: 'vertical',
    fontFamily: 'inherit',
    outline: 'none',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '10px',
  },
  colorOption: {
    width: '100%',
    aspectRatio: '1',
    border: '3px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  colorOptionSelected: {
    borderColor: '#2d3748',
    transform: 'scale(1.1)',
  },
  checkmark: {
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
    textShadow: '0 1px 3px rgba(0,0,0,0.3)',
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
