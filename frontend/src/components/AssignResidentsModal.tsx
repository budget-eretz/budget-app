import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { useToast } from './Toast';
import { Apartment, User } from '../types';
import { apartmentsAPI, usersAPI } from '../services/api';

interface AssignResidentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartment: Apartment;
  onResidentsSaved: () => void;
}

export default function AssignResidentsModal({ isOpen, onClose, apartment, onResidentsSaved }: AssignResidentsModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentResidents, setCurrentResidents] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Load users and current residents when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, apartment.id]);

  // Apply search filter
  useEffect(() => {
    applyFilter();
  }, [allUsers, searchTerm]);

  const loadData = async () => {
    setLoadingUsers(true);
    try {
      // Load all users and current apartment details in parallel
      const [usersResponse, apartmentResponse] = await Promise.all([
        usersAPI.getAll(),
        apartmentsAPI.getById(apartment.id)
      ]);

      setAllUsers(usersResponse.data);
      const apartmentData = apartmentResponse.data;
      const residents = apartmentData.residents || [];
      setCurrentResidents(residents);

      // Initialize selected user IDs with current residents
      const residentIds = new Set(residents.map((u: User) => u.id));
      setSelectedUserIds(residentIds);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בטעינת נתונים', 'error');
      setAllUsers([]);
      setCurrentResidents([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const applyFilter = () => {
    if (!searchTerm.trim()) {
      setFilteredUsers(allUsers);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = allUsers.filter(user =>
      user.fullName.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
    setFilteredUsers(filtered);
  };

  const handleToggleUser = (userId: number) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleSelectAll = () => {
    const allUserIds = new Set(filteredUsers.map(u => u.id));
    setSelectedUserIds(allUserIds);
  };

  const handleDeselectAll = () => {
    setSelectedUserIds(new Set());
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const userIds = Array.from(selectedUserIds);
      await apartmentsAPI.assignResidents(apartment.id, userIds);

      const addedCount = userIds.filter(id => !currentResidents.find(r => r.id === id)).length;
      const removedCount = currentResidents.filter(r => !userIds.includes(r.id)).length;

      let message = 'הדיירים עודכנו בהצלחה';
      if (addedCount > 0 && removedCount > 0) {
        message = `הדיירים עודכנו בהצלחה (נוספו: ${addedCount}, הוסרו: ${removedCount})`;
      } else if (addedCount > 0) {
        message = `נוספו ${addedCount} דיירים בהצלחה`;
      } else if (removedCount > 0) {
        message = `הוסרו ${removedCount} דיירים בהצלחה`;
      }

      showToast(message, 'success');
      onResidentsSaved();
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'שגיאה בעדכון דיירים';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSearchTerm('');
      onClose();
    }
  };

  const getRoleLabel = (user: User): string => {
    if (user.isCircleTreasurer) return 'גזבר מעגלי';
    if (user.isGroupTreasurer) return 'גזבר קבוצתי';
    return 'חבר';
  };

  const getRoleStyle = (user: User): React.CSSProperties => {
    if (user.isCircleTreasurer) return styles.roleCircle;
    if (user.isGroupTreasurer) return styles.roleGroup;
    return styles.roleMember;
  };

  const selectedCount = selectedUserIds.size;
  const hasChanges =
    selectedCount !== currentResidents.length ||
    !currentResidents.every(r => selectedUserIds.has(r.id));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`ניהול דיירים: ${apartment.name}`}
      size="lg"
    >
      <div style={styles.container}>
        {loadingUsers ? (
          <div style={styles.loadingState}>טוען משתמשים...</div>
        ) : (
          <>
            {/* Search and Actions Bar */}
            <div style={styles.searchBar}>
              <input
                type="text"
                placeholder="חיפוש לפי שם או אימייל..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
                disabled={loading}
              />
              <div style={styles.bulkActions}>
                <Button
                  onClick={handleSelectAll}
                  disabled={loading || filteredUsers.length === 0}
                  size="sm"
                  style={styles.bulkButton}
                >
                  בחר הכל
                </Button>
                <Button
                  onClick={handleDeselectAll}
                  disabled={loading || selectedCount === 0}
                  size="sm"
                  style={styles.bulkButton}
                >
                  בטל בחירה
                </Button>
              </div>
            </div>

            {/* Selection Summary */}
            <div style={styles.summary}>
              <span style={styles.summaryText}>
                נבחרו {selectedCount} מתוך {allUsers.length} משתמשים
              </span>
              {hasChanges && (
                <span style={styles.changesIndicator}>• שינויים לא נשמרו</span>
              )}
            </div>

            {/* Users List */}
            {filteredUsers.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>
                  {searchTerm
                    ? 'לא נמצאו משתמשים התואמים את החיפוש'
                    : 'לא נמצאו משתמשים במערכת'}
                </p>
              </div>
            ) : (
              <div style={styles.usersList}>
                {filteredUsers.map(user => {
                  const isSelected = selectedUserIds.has(user.id);
                  const wasResident = currentResidents.find(r => r.id === user.id);

                  return (
                    <div
                      key={user.id}
                      style={{
                        ...styles.userItem,
                        ...(isSelected ? styles.userItemSelected : {}),
                      }}
                      onClick={() => !loading && handleToggleUser(user.id)}
                    >
                      <div style={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleUser(user.id)}
                          disabled={loading}
                          style={styles.checkboxInput}
                        />
                      </div>

                      <div style={styles.userInfo}>
                        <div style={styles.userNameRow}>
                          <span style={styles.userName}>{user.fullName}</span>
                          {wasResident && !isSelected && (
                            <span style={styles.removalIndicator}>(יוסר)</span>
                          )}
                          {!wasResident && isSelected && (
                            <span style={styles.additionIndicator}>(חדש)</span>
                          )}
                        </div>
                        <div style={styles.userEmail}>{user.email}</div>
                        {user.phone && (
                          <div style={styles.userPhone}>{user.phone}</div>
                        )}
                      </div>

                      <div style={styles.userRole}>
                        <span style={getRoleStyle(user)}>
                          {getRoleLabel(user)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action Buttons */}
            <div style={styles.actions}>
              <Button onClick={handleClose} disabled={loading} style={styles.cancelButton}>
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || !hasChanges}
              >
                {loading ? 'שומר...' : 'שמור שינויים'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    direction: 'rtl',
  },
  loadingState: {
    textAlign: 'center',
    padding: '40px',
    color: '#718096',
    fontSize: '16px',
  },
  searchBar: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
  },
  bulkActions: {
    display: 'flex',
    gap: '8px',
  },
  bulkButton: {
    background: '#718096',
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#edf2f7',
    borderRadius: '6px',
    fontSize: '14px',
  },
  summaryText: {
    color: '#2d3748',
    fontWeight: '600',
  },
  changesIndicator: {
    color: '#dd6b20',
    fontSize: '13px',
    fontWeight: '600',
  },
  usersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '4px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#f7fafc',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid transparent',
  },
  userItemSelected: {
    background: '#ebf8ff',
    border: '2px solid #4299e1',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxInput: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  userName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#2d3748',
  },
  additionIndicator: {
    fontSize: '12px',
    color: '#38a169',
    fontWeight: '600',
  },
  removalIndicator: {
    fontSize: '12px',
    color: '#e53e3e',
    fontWeight: '600',
  },
  userEmail: {
    fontSize: '13px',
    color: '#4a5568',
    marginBottom: '2px',
  },
  userPhone: {
    fontSize: '12px',
    color: '#718096',
  },
  userRole: {
    flexShrink: 0,
  },
  roleCircle: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    background: '#9f7aea',
    color: 'white',
    whiteSpace: 'nowrap',
  },
  roleGroup: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    background: '#4299e1',
    color: 'white',
    whiteSpace: 'nowrap',
  },
  roleMember: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    background: '#48bb78',
    color: 'white',
    whiteSpace: 'nowrap',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#718096',
    margin: 0,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  cancelButton: {
    background: '#e2e8f0',
    color: '#2d3748',
  },
};
