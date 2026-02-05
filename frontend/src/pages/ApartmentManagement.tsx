import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apartmentsAPI } from '../services/api';
import { Apartment, ApartmentWithResidents } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Navigation from '../components/Navigation';
import ApartmentFormModal from '../components/ApartmentFormModal';
import AssignResidentsModal from '../components/AssignResidentsModal';
import Modal from '../components/Modal';

export default function ApartmentManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    loadApartments();
  }, [user, navigate]);

  useEffect(() => {
    // Apply search filter
    applyFilters();
  }, [apartments, searchTerm]);

  const loadApartments = async () => {
    try {
      setLoading(true);
      const response = await apartmentsAPI.getAll();
      setApartments(response.data);
    } catch (error: any) {
      console.error('Failed to load apartments:', error);

      if (error.response?.status === 403) {
        showToast('גישה נדחתה. נדרשת הרשאת גזבר מעגלי.', 'error');
        navigate('/dashboard');
      } else if (error.response?.status === 401) {
        showToast('נדרשת הזדהות. אנא התחבר מחדש.', 'error');
        navigate('/login');
      } else {
        showToast(error.response?.data?.error || 'שגיאה בטעינת דירות', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...apartments];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(term) ||
        (a.description && a.description.toLowerCase().includes(term))
      );
    }

    setFilteredApartments(filtered);
  };

  const handleCreateApartment = () => {
    setSelectedApartment(null);
    setShowCreateModal(true);
  };

  const handleEditApartment = (apartment: Apartment) => {
    setSelectedApartment(apartment);
    setShowEditModal(true);
  };

  const handleDeleteApartment = (apartment: Apartment) => {
    setApartmentToDelete(apartment);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!apartmentToDelete) return;

    setDeletingApartment(true);
    try {
      await apartmentsAPI.delete(apartmentToDelete.id);
      showToast('הדירה נמחקה בהצלחה', 'success');
      setShowDeleteConfirm(false);
      setApartmentToDelete(null);
      await loadApartments();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'שגיאה במחיקת הדירה';
      showToast(errorMessage, 'error');
    } finally {
      setDeletingApartment(false);
    }
  };

  const cancelDelete = () => {
    if (!deletingApartment) {
      setShowDeleteConfirm(false);
      setApartmentToDelete(null);
    }
  };

  const handleManageResidents = (apartment: Apartment) => {
    setSelectedApartment(apartment);
    setShowResidentsModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setSelectedApartment(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
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
          <h1 style={styles.title}>ניהול דירות</h1>
          <Button onClick={handleCreateApartment} style={styles.createButton}>
            יצירת דירה
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

        {/* Apartments List */}
        {filteredApartments.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              {searchTerm
                ? 'לא נמצאו דירות התואמות את החיפוש'
                : 'לא נמצאו דירות. צור את הדירה הראשונה שלך כדי להתחיל.'}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreateApartment} style={styles.emptyCreateButton}>
                יצירת דירה ראשונה
              </Button>
            )}
          </div>
        ) : (
          <div style={styles.apartmentsGrid}>
            {filteredApartments.map(apartment => (
              <div key={apartment.id} style={styles.apartmentCard}>
                <div style={styles.apartmentCardHeader}>
                  <h3 style={styles.apartmentName}>{apartment.name}</h3>
                  <div style={styles.residentCount}>
                    {apartment.residentCount || 0} {apartment.residentCount === 1 ? 'דייר' : 'דיירים'}
                  </div>
                </div>

                {apartment.description && (
                  <p style={styles.apartmentDescription}>{apartment.description}</p>
                )}

                <div style={styles.apartmentCardActions}>
                  <Button
                    onClick={() => handleManageResidents(apartment)}
                    style={styles.manageResidentsButton}
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
      </div>

      {/* Create Apartment Modal */}
      {showCreateModal && (
        <ApartmentFormModal
          isOpen={showCreateModal}
          onClose={handleCloseCreateModal}
          apartment={null}
          onApartmentSaved={handleApartmentSaved}
        />
      )}

      {/* Edit Apartment Modal */}
      {showEditModal && selectedApartment && (
        <ApartmentFormModal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          apartment={selectedApartment}
          onApartmentSaved={handleApartmentSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && apartmentToDelete && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={cancelDelete}
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
                onClick={cancelDelete}
                disabled={deletingApartment}
                style={styles.cancelButton}
              >
                ביטול
              </Button>
              <Button
                onClick={confirmDelete}
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
  apartmentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  apartmentCard: {
    background: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'box-shadow 0.2s',
  },
  apartmentCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  apartmentName: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
    flex: 1,
  },
  residentCount: {
    fontSize: '14px',
    color: '#718096',
    background: '#edf2f7',
    padding: '4px 12px',
    borderRadius: '12px',
    whiteSpace: 'nowrap',
  },
  apartmentDescription: {
    fontSize: '14px',
    color: '#4a5568',
    margin: 0,
    lineHeight: '1.5',
  },
  apartmentCardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: 'auto',
    flexWrap: 'wrap',
  },
  manageResidentsButton: {
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
};
