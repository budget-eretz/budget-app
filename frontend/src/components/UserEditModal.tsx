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
  
  // Form fields for new user creation
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Password reset
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isCreateMode = !user;

  // Load available groups and initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      loadGroups();
      if (user) {
        initializeForm();
      } else {
        resetForm();
      }
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

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setSelectedRole('member');
    setSelectedGroupIds([]);
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
    // Validate create mode fields
    if (isCreateMode) {
      if (!email.trim()) {
        setValidationError('נדרש אימייל');
        return false;
      }
      if (!password.trim()) {
        setValidationError('נדרשת סיסמה');
        return false;
      }
      if (password.length < 6) {
        setValidationError('הסיסמה חייבת להכיל לפחות 6 תווים');
        return false;
      }
      if (!fullName.trim()) {
        setValidationError('נדרש שם מלא');
        return false;
      }
    }

    // Group Treasurer must have at least one group
    if (selectedRole === 'group_treasurer' && selectedGroupIds.length === 0) {
      setValidationError('גזבר קבוצתי חייב להיות משויך לפחות לקבוצה אחת');
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
      if (isCreateMode) {
        // Create new user
        await usersAPI.create({
          email: email.trim(),
          password: password,
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          role: selectedRole,
          groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined
        });

        showToast('המשתמש נוצר בהצלחה', 'success');
      } else {
        // Update existing user
        // Update role
        await usersAPI.updateRole(user!.id, { role: selectedRole });

        // Update group assignments
        const currentGroupIds = user!.groups?.map(g => g.id) || [];
        
        // Add new groups
        const groupsToAdd = selectedGroupIds.filter(id => !currentGroupIds.includes(id));
        for (const groupId of groupsToAdd) {
          await usersAPI.assignToGroup(user!.id, groupId);
        }

        // Remove old groups
        const groupsToRemove = currentGroupIds.filter(id => !selectedGroupIds.includes(id));
        for (const groupId of groupsToRemove) {
          await usersAPI.removeFromGroup(user!.id, groupId);
        }

        showToast('המשתמש עודכן בהצלחה', 'success');
        
        // If the edited user is the current logged-in user, refresh their data
        if (currentUser && currentUser.id === user!.id) {
          await refreshUser();
        }
      }
      
      onUserUpdated();
      onClose();
    } catch (error: any) {
      const action = isCreateMode ? 'יצירת' : 'עדכון';
      showToast(error.response?.data?.error || `שגיאה ב${action} משתמש`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;

    if (!newPassword || newPassword.length < 6) {
      setValidationError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('הסיסמאות אינן תואמות');
      return;
    }

    setLoading(true);
    try {
      await usersAPI.resetPassword(user.id, { newPassword });
      showToast('הסיסמה אופסה בהצלחה', 'success');
      setShowPasswordReset(false);
      setNewPassword('');
      setConfirmPassword('');
      setValidationError('');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה באיפוס סיסמה', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setValidationError('');
      setShowPasswordReset(false);
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    }
  };

  const modalTitle = isCreateMode ? 'הוספת משתמש חדש' : `עריכת משתמש: ${user.fullName}`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="md">
      <div style={styles.form}>
        {/* User Info - Only show in edit mode */}
        {!isCreateMode && user && (
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
        )}

        {/* Create mode fields */}
        {isCreateMode && (
          <>
            <div style={styles.field}>
              <label style={styles.fieldLabel}>אימייל <span style={styles.required}>*</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>סיסמה <span style={styles.required}>*</span></label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>שם מלא <span style={styles.required}>*</span></label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="שם מלא"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.fieldLabel}>טלפון</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-1234567"
                style={styles.input}
                disabled={loading}
              />
            </div>
          </>
        )}

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

        {/* Password Reset Section - Only in edit mode */}
        {!isCreateMode && (
          <div style={styles.passwordResetSection}>
            <div style={styles.passwordResetHeader}>
              <h3 style={styles.passwordResetTitle}>איפוס סיסמה</h3>
              {!showPasswordReset && (
                <Button 
                  onClick={() => setShowPasswordReset(true)} 
                  style={styles.resetPasswordButton}
                  disabled={loading}
                >
                  אפס סיסמה
                </Button>
              )}
            </div>
            
            {showPasswordReset && (
              <div style={styles.passwordResetForm}>
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>סיסמה חדשה <span style={styles.required}>*</span></label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="לפחות 6 תווים"
                    style={styles.input}
                    disabled={loading}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.fieldLabel}>אימות סיסמה <span style={styles.required}>*</span></label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="הזן שוב את הסיסמה"
                    style={styles.input}
                    disabled={loading}
                  />
                </div>

                <div style={styles.passwordResetActions}>
                  <Button 
                    onClick={() => {
                      setShowPasswordReset(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      setValidationError('');
                    }}
                    disabled={loading}
                    style={styles.cancelButton}
                  >
                    ביטול
                  </Button>
                  <Button onClick={handleResetPassword} disabled={loading}>
                    {loading ? 'מאפס...' : 'אפס סיסמה'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

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
            {loading ? 'שומר...' : (isCreateMode ? 'צור משתמש' : 'שמור שינויים')}
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
  input: {
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
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
  passwordResetSection: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '20px',
    marginTop: '8px',
  },
  passwordResetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  passwordResetTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  resetPasswordButton: {
    padding: '8px 16px',
    fontSize: '14px',
    background: '#ed8936',
  },
  passwordResetForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    background: '#fffaf0',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #fbd38d',
  },
  passwordResetActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
  },
};
