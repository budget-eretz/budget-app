import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import { User } from '../types';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Navigation from '../components/Navigation';
import UserEditModal from '../components/UserEditModal';

export default function UserManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'member' | 'group_treasurer' | 'circle_treasurer'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    // Check permissions on mount - only Circle Treasurers can access
    if (!user?.isCircleTreasurer) {
      showToast('גישה נדחתה. נדרשת הרשאת גזבר מעגלי.', 'error');
      navigate('/dashboard');
      return;
    }
    loadUsers();
  }, [user, navigate]);

  useEffect(() => {
    // Apply filters whenever users, searchTerm, or roleFilter changes
    applyFilters();
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.data);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      
      if (error.response?.status === 403) {
        showToast('גישה נדחתה. נדרשת הרשאת גזבר מעגלי.', 'error');
        navigate('/dashboard');
      } else if (error.response?.status === 401) {
        showToast('נדרשת הזדהות. אנא התחבר מחדש.', 'error');
        navigate('/login');
      } else {
        showToast(error.response?.data?.error || 'שגיאה בטעינת משתמשים', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.fullName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => {
        if (roleFilter === 'circle_treasurer') return u.isCircleTreasurer;
        if (roleFilter === 'group_treasurer') return u.isGroupTreasurer && !u.isCircleTreasurer;
        if (roleFilter === 'member') return !u.isCircleTreasurer && !u.isGroupTreasurer;
        return true;
      });
    }

    setFilteredUsers(filtered);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const handleUserUpdated = async () => {
    await loadUsers();
  };

  const getRoleBadge = (user: User) => {
    if (user.isCircleTreasurer) {
      return <span style={styles.badgeCircle}>גזבר מעגלי</span>;
    }
    if (user.isGroupTreasurer) {
      return <span style={styles.badgeGroup}>גזבר קבוצתי</span>;
    }
    return <span style={styles.badgeMember}>חבר</span>;
  };

  const getGroupsList = (user: User) => {
    if (!user.groups || user.groups.length === 0) {
      return <span style={styles.noGroups}>אין קבוצות</span>;
    }
    return (
      <div style={styles.groupsList}>
        {user.groups.map(group => (
          <span key={group.id} style={styles.groupTag}>
            {group.name}
          </span>
        ))}
      </div>
    );
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
          <h1 style={styles.title}>ניהול משתמשים</h1>
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <input
            type="text"
            placeholder="חיפוש לפי שם או אימייל..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            style={styles.roleSelect}
          >
            <option value="all">כל התפקידים</option>
            <option value="member">חברים</option>
            <option value="group_treasurer">גזברים קבוצתיים</option>
            <option value="circle_treasurer">גזברים מעגליים</option>
          </select>
        </div>

        {/* User Table */}
        {filteredUsers.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              {searchTerm || roleFilter !== 'all' 
                ? 'לא נמצאו משתמשים התואמים את הסינון' 
                : 'לא נמצאו משתמשים'}
            </p>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.tableHeader}>שם</th>
                  <th style={styles.tableHeader}>אימייל</th>
                  <th style={styles.tableHeader}>תפקיד</th>
                  <th style={styles.tableHeader}>קבוצות</th>
                  <th style={styles.tableHeaderActions}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <div style={styles.userName}>{u.fullName}</div>
                      {u.phone && (
                        <div style={styles.userPhone}>{u.phone}</div>
                      )}
                    </td>
                    <td style={styles.tableCell}>{u.email}</td>
                    <td style={styles.tableCell}>{getRoleBadge(u)}</td>
                    <td style={styles.tableCell}>{getGroupsList(u)}</td>
                    <td style={styles.tableCellActions}>
                      <Button 
                        onClick={() => handleEditUser(u)}
                        style={styles.editButton}
                      >
                        עריכה
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Results count */}
        <div style={styles.resultsCount}>
          מציג {filteredUsers.length} מתוך {users.length} משתמשים
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <UserEditModal
          isOpen={showEditModal}
          onClose={handleCloseModal}
          user={selectedUser}
          onUserUpdated={handleUserUpdated}
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
    marginBottom: '32px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2d3748',
    margin: 0,
  },
  filters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: '250px',
    padding: '12px 16px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
  },
  roleSelect: {
    padding: '12px 16px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
    cursor: 'pointer',
    minWidth: '180px',
  },
  tableContainer: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeaderRow: {
    background: '#f7fafc',
    borderBottom: '2px solid #e2e8f0',
  },
  tableHeader: {
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#4a5568',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableHeaderActions: {
    padding: '16px',
    textAlign: 'center',
    fontWeight: '600',
    color: '#4a5568',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background 0.2s',
  },
  tableCell: {
    padding: '16px',
    color: '#2d3748',
    fontSize: '14px',
  },
  tableCellActions: {
    padding: '16px',
    textAlign: 'center',
  },
  userName: {
    fontWeight: '500',
    color: '#2d3748',
  },
  userPhone: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '4px',
  },
  badgeCircle: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#9f7aea',
    color: 'white',
  },
  badgeGroup: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#4299e1',
    color: 'white',
  },
  badgeMember: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: '#48bb78',
    color: 'white',
  },
  groupsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  groupTag: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    background: '#edf2f7',
    color: '#4a5568',
    border: '1px solid #cbd5e0',
  },
  noGroups: {
    fontSize: '12px',
    color: '#a0aec0',
    fontStyle: 'italic',
  },
  editButton: {
    padding: '8px 16px',
    fontSize: '14px',
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
    margin: 0,
  },
  resultsCount: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#718096',
    textAlign: 'center',
  },
};
