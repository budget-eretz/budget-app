import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { User, Group } from '../types';
import { usersAPI, groupsAPI } from '../services/api';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated: () => void;
}

export default function UserEditModal({ isOpen, onClose, user, onUserUpdated }: UserEditModalProps) {
  const { showToast } = useToast();
  const { user: currentUser, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [selectedRole, setSelectedRole] = useState<'member' | 'group_treasurer' | 'circle_treasurer'>('member');
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [validationError, setValidationError] = useState<string>('');

  // Load available groups and initialize form when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadGroups();
      initializeForm();
    }
  }, [isOpen, user]);

  const loadGroups = async () => {
    try {
      const response = await groupsAPI.getAll();
      setAvailableGroups(response.data);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בטעינת קבוצות', 'error');
    }
  };

  const initializeForm = () => {
    if (!user) return;

    // Set role based on user flags
    if (user.isCircleTreasurer) {
      setSelectedRole('circle_treasurer');
    } else if (user.isGroupTreasurer) {
      setSelectedRole('group_treasurer');
    } else {
      setSelectedRole('member');
    }

    // Set selected groups
    setSelectedGroupIds(user.groups?.map(g => g.id) || []);
    setValidationError('');
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as 'member' | 'group_treasurer' | 'circle_treasurer';
    setSelectedRole(role);
    setValidationError('');
  };

  const handleGroupToggle = (groupId: number) => {
    setSelectedGroupIds(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
    setValidationError('');
  };

  const validateForm = (): boolean => {
    // Group Treasurer must have at least one group
    if (selectedRole === 'group_treasurer' && selectedGroupIds.length === 0) {
      setValidationError('גזבר קבוצתי חייב להיות משויך לפחות לקבוצה אחת');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!user) return;

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Update role
      await usersAPI.updateRole(user.id, { role: selectedRole });

      // Update group assignments
      const currentGroupIds = user.groups?.map(g => g.id) || [];
      
      // Add new groups
      const groupsToAdd = selectedGroupIds.filter(id => !currentGroupIds.includes(id));
      for (const groupId of groupsToAdd) {
        await usersAPI.assignToGroup(user.id, groupId);
      }

      // Remove old groups
      const groupsToRemove = currentGroupIds.filter(id => !selectedGroupIds.includes(id));
      for (const groupId of groupsToRemove) {
        await usersAPI.removeFromGroup(user.id, groupId);
      }

      showToast('המשתמש עודכן בהצלחה', 'success');
      
      // If the edited user is the current logged-in user, refresh their data
      if (currentUser && currentUser.id === user.id) {
        await refreshUser();
      }
      
      onUserUpdated();
      onClose();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בעדכון משתמש', 'error');
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

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`עריכת משתמש: ${user.fullName}`} size="md">
      <div style={styles.form}>
        {/* User Info */}
        <div style={styles.infoSection}>
          <div style={styles.infoRow}>
            <span style={styles.label}>אימייל:</span>
            <span style={styles.value}>{user.email}</span>
          </div>
          {user.phone && (
            <div style={styles.infoRow}>
              <span style={styles.label}>טלפון:</span>
              <span style={styles.value}>{user.phone}</span>
            </div>
          )}
        </div>

        {/* Role Selection */}
        <div style={styles.field}>
          <label style={styles.fieldLabel}>תפקיד</label>
          <select
            value={selectedRole}
            onChange={handleRoleChange}
            style={styles.select}
            disabled={loading}
          >
            <option value="member">חבר</option>
            <option value="group_treasurer">גזבר קבוצתי</option>
            <option value="circle_treasurer">גזבר מעגלי</option>
          </select>
        </div>

        {/* Group Assignment */}
        <div style={styles.field}>
          <label style={styles.fieldLabel}>
            שיוך לקבוצות
            {selectedRole === 'group_treasurer' && (
              <span style={styles.required}> (נדרש לגזבר קבוצתי)</span>
            )}
          </label>
          <div style={styles.groupList}>
            {availableGroups.length === 0 ? (
              <div style={styles.emptyState}>אין קבוצות זמינות</div>
            ) : (
              availableGroups.map(group => (
                <label key={group.id} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(group.id)}
                    onChange={() => handleGroupToggle(group.id)}
                    disabled={loading}
                    style={styles.checkbox}
                  />
                  <span style={styles.groupName}>{group.name}</span>
                  {group.description && (
                    <span style={styles.groupDescription}>{group.description}</span>
                  )}
                </label>
              ))
            )}
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
            {loading ? 'שומר...' : 'שמור שינויים'}
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
  infoSection: {
    background: '#f7fafc',
    padding: '16px',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  infoRow: {
    display: 'flex',
    gap: '8px',
  },
  label: {
    fontWeight: '600',
    color: '#4a5568',
    minWidth: '60px',
  },
  value: {
    color: '#2d3748',
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
    fontWeight: '400',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer',
  },
  groupList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '300px',
    overflowY: 'auto',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    background: '#fafafa',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  checkbox: {
    marginTop: '2px',
    cursor: 'pointer',
    width: '18px',
    height: '18px',
  },
  groupName: {
    fontWeight: '500',
    color: '#2d3748',
    flex: 1,
  },
  groupDescription: {
    fontSize: '12px',
    color: '#718096',
    marginLeft: '28px',
    display: 'block',
    marginTop: '4px',
  },
  emptyState: {
    textAlign: 'center',
    color: '#a0aec0',
    padding: '20px',
    fontSize: '14px',
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
