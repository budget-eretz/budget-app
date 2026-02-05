import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsAPI, apartmentsAPI } from '../services/api';
import { Group, User, Apartment } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Navigation from '../components/Navigation';
import GroupFormModal from '../components/GroupFormModal';
import ApartmentFormModal from '../components/ApartmentFormModal';
import AssignResidentsModal from '../components/AssignResidentsModal';
import Modal from '../components/Modal';

export default function GroupManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<'groups' | 'apartments'>('groups');

  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);

  // Groups modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

  // Apartments state
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [apartmentsSearchTerm, setApartmentsSearchTerm] = useState('');
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);

  // Apartments modal states
  const [showCreateApartmentModal, setShowCreateApartmentModal] = useState(false);
  const [showEditApartmentModal, setShowEditApartmentModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [showDeleteApartmentConfirm, setShowDeleteApartmentConfirm] = useState(false);
  const [apartmentToDelete, setApartmentToDelete] = useState<Apartment | null>(null);
  const [showResidentsModal, setShowResidentsModal] = useState(false);
  const [deletingApartment, setDeletingApartment] = useState(false);

  useEffect(() => {
    // Check permissions on mount - only Circle Treasurers can access
    if (!user?.isCircleTreasurer) {
      showToast('גישה נדחתה. נדרשת הרשאת גזבר מעגלי.', 'error');
      navigate('/dashboard');
      return;
    }
    loadGroups();
    loadApartments();
  }, [user, navigate]);

  useEffect(() => {
    // Apply search filter for groups
    applyFilters();
  }, [groups, searchTerm]);

  useEffect(() => {
    // Apply search filter for apartments
    applyApartmentFilters();
  }, [apartments, apartmentsSearchTerm]);

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

  // Apartments functions
  const loadApartments = async () => {
    try {
      const response = await apartmentsAPI.getAll();
      setApartments(response.data);
    } catch (error: any) {
      console.error('Failed to load apartments:', error);
      if (error.response?.status !== 403 && error.response?.status !== 401) {
        showToast(error.response?.data?.error || 'שגיאה בטעינת דירות', 'error');
      }
    }
  };

  const applyApartmentFilters = () => {
    let filtered = [...apartments];

    if (apartmentsSearchTerm.trim()) {
      const term = apartmentsSearchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(term) ||
        (a.description && a.description.toLowerCase().includes(term))
      );
    }

    setFilteredApartments(filtered);
  };

  const handleCreateApartment = () => {
    setSelectedApartment(null);
    setShowCreateApartmentModal(true);
  };

  const handleEditApartment = (apartment: Apartment) => {
    setSelectedApartment(apartment);
    setShowEditApartmentModal(true);
  };

  const handleDeleteApartment = (apartment: Apartment) => {
    setApartmentToDelete(apartment);
    setShowDeleteApartmentConfirm(true);
  };

  const confirmDeleteApartment = async () => {
    if (!apartmentToDelete) return;

    setDeletingApartment(true);
    try {
      await apartmentsAPI.delete(apartmentToDelete.id);
      showToast('הדירה נמחקה בהצלחה', 'success');
      setShowDeleteApartmentConfirm(false);
      setApartmentToDelete(null);
      await loadApartments();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'שגיאה במחיקת הדירה';
      showToast(errorMessage, 'error');
    } finally {
      setDeletingApartment(false);
    }
  };

  const cancelDeleteApartment = () => {
    if (!deletingApartment) {
      setShowDeleteApartmentConfirm(false);
      setApartmentToDelete(null);
    }
  };

  const handleManageResidents = (apartment: Apartment) => {
    setSelectedApartment(apartment);
    setShowResidentsModal(true);
  };

  const handleCloseCreateApartmentModal = () => {
    setShowCreateApartmentModal(false);
    setSelectedApartment(null);
  };

  const handleCloseEditApartmentModal = () => {
    setShowEditApartmentModal(false);
    setSelectedApartment(null);
  };

  const handleCloseResidentsModal = () => {
    setShowResidentsModal(false);
    setSelectedApartment(null);
  };

  const handleApartmentSaved = async () => {
    await loadApartments();
  };

  const handleResidentsSaved = async () => {
    await loadApartments();
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
          <h1 style={styles.title}>ניהול קבוצות ודירות</h1>
          {activeTab === 'groups' && (
            <Button onClick={handleCreateGroup} style={styles.createButton}>
              יצירת קבוצה
            </Button>
          )}
          {activeTab === 'apartments' && (
            <Button onClick={handleCreateApartment} style={styles.createButton}>
              יצירת דירה
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('groups')}
            style={{
              ...styles.tab,
              ...(activeTab === 'groups' ? styles.tabActive : {}),
            }}
          >
            קבוצות
          </button>
          <button
            onClick={() => setActiveTab('apartments')}
            style={{
              ...styles.tab,
              ...(activeTab === 'apartments' ? styles.tabActive : {}),
            }}
          >
            דירות
          </button>
        </div>

        {/* Groups Tab Content */}
        {activeTab === 'groups' && (
          <>
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
          </>
        )}

        {/* Apartments Tab Content */}
        {activeTab === 'apartments' && (
          <>
            {/* Search Filter */}
            <div style={styles.filters}>
              <input
                type="text"
                placeholder="חיפוש לפי שם או תיאור..."
                value={apartmentsSearchTerm}
                onChange={(e) => setApartmentsSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            {/* Apartments List */}
            {filteredApartments.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>
                  {apartmentsSearchTerm
                    ? 'לא נמצאו דירות התואמות את החיפוש'
                    : 'לא נמצאו דירות. צור את הדירה הראשונה שלך כדי להתחיל.'}
                </p>
                {!apartmentsSearchTerm && (
                  <Button onClick={handleCreateApartment} style={styles.emptyCreateButton}>
                    יצירת דירה ראשונה
                  </Button>
                )}
              </div>
            ) : (
              <div style={styles.groupsGrid}>
                {filteredApartments.map(apartment => (
                  <div key={apartment.id} style={styles.groupCard}>
                    <div style={styles.groupCardHeader}>
                      <h3 style={styles.groupName}>{apartment.name}</h3>
                      <div style={styles.memberCount}>
                        {apartment.resident_count || 0} {apartment.resident_count === 1 ? 'דייר' : 'דיירים'}
                      </div>
                    </div>

                    {apartment.description && (
                      <p style={styles.groupDescription}>{apartment.description}</p>
                    )}

                    <div style={styles.groupCardActions}>
                      <Button
                        onClick={() => handleManageResidents(apartment)}
                        style={styles.viewMembersButton}
                      >
                        ניהול דיירים
                      </Button>
                      <Button
                        onClick={() => handleEditApartment(apartment)}
                        style={styles.editButton}
                      >
                        עריכה
                      </Button>
                      <Button
                        onClick={() => handleDeleteApartment(apartment)}
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
            {filteredApartments.length > 0 && (
              <div style={styles.resultsCount}>
                מציג {filteredApartments.length} מתוך {apartments.length} דירות
              </div>
            )}
          </>
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

      {/* Create Apartment Modal */}
      {showCreateApartmentModal && (
        <ApartmentFormModal
          isOpen={showCreateApartmentModal}
          onClose={handleCloseCreateApartmentModal}
          apartment={null}
          onApartmentSaved={handleApartmentSaved}
        />
      )}

      {/* Edit Apartment Modal */}
      {showEditApartmentModal && selectedApartment && (
        <ApartmentFormModal
          isOpen={showEditApartmentModal}
          onClose={handleCloseEditApartmentModal}
          apartment={selectedApartment}
          onApartmentSaved={handleApartmentSaved}
        />
      )}

      {/* Delete Apartment Confirmation Modal */}
      {showDeleteApartmentConfirm && apartmentToDelete && (
        <Modal
          isOpen={showDeleteApartmentConfirm}
          onClose={cancelDeleteApartment}
          title="מחיקת דירה"
          size="sm"
        >
          <div style={styles.deleteConfirmContent}>
            <p style={styles.deleteConfirmText}>
              האם אתה בטוח שברצונך למחוק את הדירה <strong>{apartmentToDelete.name}</strong>?
            </p>
            <p style={styles.deleteConfirmWarning}>
              פעולה זו אינה ניתנת לביטול. ניתן למחוק את הדירה רק אם אין לה הוצאות משויכות.
            </p>
            <div style={styles.deleteConfirmActions}>
              <Button
                onClick={cancelDeleteApartment}
                disabled={deletingApartment}
                style={styles.cancelButton}
              >
                ביטול
              </Button>
              <Button
                onClick={confirmDeleteApartment}
                disabled={deletingApartment}
                style={styles.confirmDeleteButton}
              >
                {deletingApartment ? 'מוחק...' : 'מחק דירה'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Manage Residents Modal */}
      {showResidentsModal && selectedApartment && (
        <AssignResidentsModal
          isOpen={showResidentsModal}
          onClose={handleCloseResidentsModal}
          apartment={selectedApartment}
          onResidentsSaved={handleResidentsSaved}
        />
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
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #e2e8f0',
  },
  tab: {
    padding: '12px 24px',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    color: '#718096',
    transition: 'all 0.2s',
    marginBottom: '-2px',
  },
  tabActive: {
    color: '#667eea',
    borderBottom: '3px solid #667eea',
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
