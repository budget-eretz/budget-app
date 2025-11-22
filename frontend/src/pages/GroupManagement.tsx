import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsAPI } from '../services/api';
import { Group, User } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Navigation from '../components/Navigation';
import GroupFormModal from '../components/GroupFormModal';
import Modal from '../components/Modal';

export default function GroupManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  useEffect(() => {
    // Check permissions on mount - only Circle Treasurers can access
    if (!user?.isCircleTreasurer) {
      showToast('גישה נדחתה. נדרשת הרשאת גזבר מעגלי.', 'error');
      navigate('/dashboard');
      return;
    }
    loadGroups();
  }, [user, navigate]);

  useEffect(() => {
    // Apply search filter
    applyFilters();
  }, [groups, searchTerm]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupsAPI.getAll();
      setGroups(response.data);
    } catch (error: any) {
      console.error('Failed to load groups:', error);
      
      if (error.response?.status === 403) {
        showToast('גישה נדחתה. נדרשת הרשאת גזבר מעגלי.', 'error');
        navigate('/dashboard');
      } else if (error.response?.status === 401) {
        showToast('נדרשת הזדהות. אנא התחבר מחדש.', 'error');
        navigate('/login');
      } else {
        showToast(error.response?.data?.error || 'שגיאה בטעינת קבוצות', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...groups];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(g => 
        g.name.toLowerCase().includes(term) ||
        (g.description && g.description.toLowerCase().includes(term))
      );
    }

    setFilteredGroups(filtered);
  };

  const handleCreateGroup = () => {
    setSelectedGroup(null);
    setShowCreateModal(true);
  };

  const handleEditGroup = (group: Group) => {
    setSelectedGroup(group);
    setShowEditModal(true);
  };

  const handleDeleteGroup = (group: Group) => {
    setGroupToDelete(group);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!groupToDelete) return;

    setDeletingGroup(true);
    try {
      await groupsAPI.delete(groupToDelete.id);
      showToast('הקבוצה נמחקה בהצלחה', 'success');
      setShowDeleteConfirm(false);
      setGroupToDelete(null);
      await loadGroups();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'שגיאה במחיקת הקבוצה';
      showToast(errorMessage, 'error');
    } finally {
      setDeletingGroup(false);
    }
  };

  const cancelDelete = () => {
    if (!deletingGroup) {
      setShowDeleteConfirm(false);
      setGroupToDelete(null);
    }
  };

  const handleViewMembers = async (group: Group) => {
    setSelectedGroup(group);
    setShowMembersModal(true);
    setLoadingMembers(true);
    
    try {
      const response = await groupsAPI.getMembers(group.id);
      setGroupMembers(response.data);
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בטעינת חברי הקבוצה', 'error');
      setGroupMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setSelectedGroup(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedGroup(null);
  };

  const handleCloseMembersModal = () => {
    setShowMembersModal(false);
    setSelectedGroup(null);
    setGroupMembers([]);
  };

  const handleGroupSaved = async () => {
    await loadGroups();
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Navigation />
        <div style={styles.loading}>טוען...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Navigation />
      
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>ניהול קבוצות</h1>
          <Button onClick={handleCreateGroup} style={styles.createButton}>
            יצירת קבוצה
          </Button>
        </div>

        {/* Search Filter */}
        <div style={styles.filters}>
          <input
            type="text"
            placeholder="חיפוש לפי שם או תיאור..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Groups List */}
        {filteredGroups.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              {searchTerm 
                ? 'לא נמצאו קבוצות התואמות את החיפוש' 
                : 'לא נמצאו קבוצות. צור את הקבוצה הראשונה שלך כדי להתחיל.'}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreateGroup} style={styles.emptyCreateButton}>
                יצירת קבוצה ראשונה
              </Button>
            )}
          </div>
        ) : (
          <div style={styles.groupsGrid}>
            {filteredGroups.map(group => (
              <div key={group.id} style={styles.groupCard}>
                <div style={styles.groupCardHeader}>
                  <h3 style={styles.groupName}>{group.name}</h3>
                  <div style={styles.memberCount}>
                    {group.memberCount || 0} {group.memberCount === 1 ? 'חבר' : 'חברים'}
                  </div>
                </div>
                
                {group.description && (
                  <p style={styles.groupDescription}>{group.description}</p>
                )}
                
                <div style={styles.groupCardActions}>
                  <Button 
                    onClick={() => handleViewMembers(group)}
                    style={styles.viewMembersButton}
                  >
                    צפייה בחברים
                  </Button>
                  <Button 
                    onClick={() => handleEditGroup(group)}
                    style={styles.editButton}
                  >
                    עריכה
                  </Button>
                  <Button 
                    onClick={() => handleDeleteGroup(group)}
                    style={styles.deleteButton}
                  >
                    מחיקה
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results count */}
        {filteredGroups.length > 0 && (
          <div style={styles.resultsCount}>
            מציג {filteredGroups.length} מתוך {groups.length} קבוצות
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <GroupFormModal
          isOpen={showCreateModal}
          onClose={handleCloseCreateModal}
          group={null}
          onGroupSaved={handleGroupSaved}
        />
      )}

      {/* Edit Group Modal */}
      {showEditModal && selectedGroup && (
        <GroupFormModal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          group={selectedGroup}
          onGroupSaved={handleGroupSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && groupToDelete && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={cancelDelete}
          title="מחיקת קבוצה"
          size="sm"
        >
          <div style={styles.deleteConfirmContent}>
            <p style={styles.deleteConfirmText}>
              האם אתה בטוח שברצונך למחוק את הקבוצה <strong>{groupToDelete.name}</strong>?
            </p>
            <p style={styles.deleteConfirmWarning}>
              פעולה זו אינה ניתנת לביטול. ניתן למחוק את הקבוצה רק אם אין לה תקציבים או סעיפים משויכים.
            </p>
            <div style={styles.deleteConfirmActions}>
              <Button 
                onClick={cancelDelete} 
                disabled={deletingGroup}
                style={styles.cancelButton}
              >
                ביטול
              </Button>
              <Button 
                onClick={confirmDelete} 
                disabled={deletingGroup}
                style={styles.confirmDeleteButton}
              >
                {deletingGroup ? 'מוחק...' : 'מחק קבוצה'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Members Modal */}
      {showMembersModal && selectedGroup && (
        <Modal
          isOpen={showMembersModal}
          onClose={handleCloseMembersModal}
          title={`חברי ${selectedGroup.name}`}
          size="md"
        >
          <div style={styles.membersModalContent}>
            {loadingMembers ? (
              <div style={styles.membersLoading}>טוען חברים...</div>
            ) : groupMembers.length === 0 ? (
              <div style={styles.noMembers}>
                <p style={styles.noMembersText}>עדיין לא שויכו חברים לקבוצה זו.</p>
              </div>
            ) : (
              <div style={styles.membersList}>
                {groupMembers.map(member => (
                  <div key={member.id} style={styles.memberItem}>
                    <div style={styles.memberInfo}>
                      <div style={styles.memberName}>{member.fullName}</div>
                      <div style={styles.memberEmail}>{member.email}</div>
                      {member.phone && (
                        <div style={styles.memberPhone}>{member.phone}</div>
                      )}
                    </div>
                    <div style={styles.memberRole}>
                      {member.isCircleTreasurer ? (
                        <span style={styles.roleCircle}>גזבר מעגלי</span>
                      ) : member.isGroupTreasurer ? (
                        <span style={styles.roleGroup}>גזבר קבוצתי</span>
                      ) : (
                        <span style={styles.roleMember}>חבר</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={styles.membersModalActions}>
              <Button onClick={handleCloseMembersModal}>
                סגור
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 80px)',
    fontSize: '20px',
    color: '#718096',
    direction: 'rtl',
  },
  content: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
    direction: 'rtl',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  createButton: {
    padding: '12px 24px',
    fontSize: '16px',
  },
  filters: {
    marginBottom: '24px',
  },
  searchInput: {
    width: '100%',
    maxWidth: '500px',
    padding: '12px 16px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
  },
  groupsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  groupCard: {
    background: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'box-shadow 0.2s',
  },
  groupCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  groupName: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
    flex: 1,
  },
  memberCount: {
    fontSize: '14px',
    color: '#718096',
    background: '#edf2f7',
    padding: '4px 12px',
    borderRadius: '12px',
    whiteSpace: 'nowrap',
  },
  groupDescription: {
    fontSize: '14px',
    color: '#4a5568',
    margin: 0,
    lineHeight: '1.5',
  },
  groupCardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: 'auto',
    flexWrap: 'wrap',
  },
  viewMembersButton: {
    padding: '8px 16px',
    fontSize: '14px',
    background: '#4299e1',
    flex: 1,
    minWidth: '100px',
  },
  editButton: {
    padding: '8px 16px',
    fontSize: '14px',
    background: '#48bb78',
    flex: 1,
    minWidth: '80px',
  },
  deleteButton: {
    padding: '8px 16px',
    fontSize: '14px',
    background: '#f56565',
    flex: 1,
    minWidth: '80px',
  },
  emptyState: {
    background: 'white',
    padding: '60px 40px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  emptyText: {
    fontSize: '16px',
    color: '#718096',
    margin: '0 0 20px 0',
  },
  emptyCreateButton: {
    padding: '12px 24px',
    fontSize: '16px',
  },
  resultsCount: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#718096',
    textAlign: 'center',
  },
  deleteConfirmContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  deleteConfirmText: {
    fontSize: '16px',
    color: '#2d3748',
    margin: 0,
  },
  deleteConfirmWarning: {
    fontSize: '14px',
    color: '#718096',
    margin: 0,
    padding: '12px',
    background: '#fff5f5',
    border: '1px solid #fc8181',
    borderRadius: '6px',
  },
  deleteConfirmActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
  },
  cancelButton: {
    background: '#e2e8f0',
    color: '#2d3748',
  },
  confirmDeleteButton: {
    background: '#f56565',
  },
  membersModalContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  membersLoading: {
    textAlign: 'center',
    padding: '40px',
    color: '#718096',
    fontSize: '16px',
  },
  noMembers: {
    textAlign: 'center',
    padding: '40px',
  },
  noMembersText: {
    fontSize: '16px',
    color: '#718096',
    margin: 0,
  },
  membersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  memberItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '6px',
    gap: '16px',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '4px',
  },
  memberEmail: {
    fontSize: '14px',
    color: '#4a5568',
    marginBottom: '2px',
  },
  memberPhone: {
    fontSize: '12px',
    color: '#718096',
  },
  memberRole: {
    flexShrink: 0,
  },
  roleCircle: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#9f7aea',
    color: 'white',
  },
  roleGroup: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#4299e1',
    color: 'white',
  },
  roleMember: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#48bb78',
    color: 'white',
  },
  membersModalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
};
