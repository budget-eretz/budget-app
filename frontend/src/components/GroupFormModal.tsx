import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { useToast } from './Toast';
import { Group } from '../types';
import { groupsAPI } from '../services/api';

interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null; // null for create mode, Group for edit mode
  onGroupSaved: () => void;
}

export default function GroupFormModal({ isOpen, onClose, group, onGroupSaved }: GroupFormModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string>('');

  const isEditMode = group !== null;

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (group) {
        // Edit mode - populate with existing data
        setName(group.name);
        setDescription(group.description || '');
      } else {
        // Create mode - reset form
        setName('');
        setDescription('');
      }
      setValidationError('');
    }
  }, [isOpen, group]);

  const validateForm = (): boolean => {
    // Name is required
    if (!name.trim()) {
      setValidationError('שם הקבוצה הוא שדה חובה');
      return false;
    }

    // Name length validation
    if (name.trim().length < 2) {
      setValidationError('שם הקבוצה חייב להכיל לפחות 2 תווים');
      return false;
    }

    if (name.trim().length > 100) {
      setValidationError('שם הקבוצה לא יכול לעלות על 100 תווים');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
      };

      if (isEditMode) {
        // Update existing group
        await groupsAPI.update(group.id, data);
        showToast('הקבוצה עודכנה בהצלחה', 'success');
      } else {
        // Create new group
        await groupsAPI.create(data);
        showToast('הקבוצה נוצרה בהצלחה', 'success');
      }

      onGroupSaved();
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 
        (isEditMode ? 'שגיאה בעדכון הקבוצה' : 'שגיאה ביצירת הקבוצה');
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setValidationError('');
      onClose();
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setValidationError('');
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={isEditMode ? `עריכת קבוצה: ${group.name}` : 'יצירת קבוצה חדשה'} 
      size="md"
    >
      <div style={styles.form}>
        {/* Name Field */}
        <div style={styles.field}>
          <label style={styles.fieldLabel}>
            שם הקבוצה <span style={styles.required}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="הזן שם קבוצה"
            style={styles.input}
            disabled={loading}
            maxLength={100}
            autoFocus
          />
          <div style={styles.hint}>
            {name.length}/100 תווים
          </div>
        </div>

        {/* Description Field */}
        <div style={styles.field}>
          <label style={styles.fieldLabel}>
            תיאור <span style={styles.optional}>(אופציונלי)</span>
          </label>
          <textarea
            value={description}
            onChange={handleDescriptionChange}
            placeholder="הזן תיאור קבוצה"
            style={styles.textarea}
            disabled={loading}
            rows={4}
            maxLength={500}
          />
          <div style={styles.hint}>
            {description.length}/500 תווים
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div style={styles.errorMessage}>
            {validationError}
          </div>
        )}

        {/* Action Buttons */}
        <div style={styles.actions}>
          <Button onClick={handleClose} disabled={loading} style={styles.cancelButton}>
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (isEditMode ? 'מעדכן...' : 'יוצר...') : (isEditMode ? 'עדכן קבוצה' : 'צור קבוצה')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    direction: 'rtl',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fieldLabel: {
    fontWeight: '600',
    color: '#2d3748',
    fontSize: '14px',
  },
  required: {
    color: '#e53e3e',
    fontSize: '12px',
  },
  optional: {
    color: '#718096',
    fontSize: '12px',
    fontWeight: '400',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
    transition: 'border-color 0.2s',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  hint: {
    fontSize: '12px',
    color: '#a0aec0',
    textAlign: 'right' as const,
  },
  errorMessage: {
    background: '#fff5f5',
    border: '1px solid #fc8181',
    borderRadius: '6px',
    padding: '12px',
    color: '#c53030',
    fontSize: '14px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
  },
  cancelButton: {
    background: '#e2e8f0',
    color: '#2d3748',
  },
};
