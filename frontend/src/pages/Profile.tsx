import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Navigation from '../components/Navigation';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      showToast('שם מלא הוא שדה חובה', 'error');
      return;
    }

    setLoading(true);
    try {
      await usersAPI.updateOwnProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined
      });

      await refreshUser();
      showToast('הפרופיל עודכן בהצלחה', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בעדכון פרופיל', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('יש למלא את כל השדות', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('הסיסמה החדשה חייבת להכיל לפחות 6 תווים', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('הסיסמאות אינן תואמות', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      await usersAPI.changeOwnPassword({
        currentPassword,
        newPassword
      });

      showToast('הסיסמה שונתה בהצלחה', 'success');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'שגיאה בשינוי סיסמה', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <Navigation />
      
      <div style={styles.content}>
        <h1 style={styles.title}>הפרופיל שלי</h1>

        {/* Profile Info Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>פרטים אישיים</h2>
          
          <form onSubmit={handleUpdateProfile} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>אימייל</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                style={{ ...styles.input, ...styles.inputDisabled }}
              />
              <span style={styles.hint}>לא ניתן לשנות את כתובת האימייל</span>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>שם מלא <span style={styles.required}>*</span></label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>טלפון</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-1234567"
                style={styles.input}
                disabled={loading}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>תפקיד</label>
              <input
                type="text"
                value={
                  user?.isCircleTreasurer 
                    ? 'גזבר מעגלי' 
                    : user?.isGroupTreasurer 
                    ? 'גזבר קבוצתי' 
                    : 'חבר'
                }
                disabled
                style={{ ...styles.input, ...styles.inputDisabled }}
              />
            </div>

            <Button type="submit" disabled={loading} style={styles.saveButton}>
              {loading ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </form>
        </div>

        {/* Password Change Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>שינוי סיסמה</h2>
          
          {!showPasswordForm ? (
            <Button onClick={() => setShowPasswordForm(true)} style={styles.changePasswordButton}>
              שנה סיסמה
            </Button>
          ) : (
            <form onSubmit={handleChangePassword} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.label}>סיסמה נוכחית <span style={styles.required}>*</span></label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={styles.input}
                  disabled={passwordLoading}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>סיסמה חדשה <span style={styles.required}>*</span></label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="לפחות 6 תווים"
                  style={styles.input}
                  disabled={passwordLoading}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>אימות סיסמה חדשה <span style={styles.required}>*</span></label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="הזן שוב את הסיסמה החדשה"
                  style={styles.input}
                  disabled={passwordLoading}
                />
              </div>

              <div style={styles.buttonGroup}>
                <Button 
                  type="button" 
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={passwordLoading}
                  style={styles.cancelButton}
                >
                  ביטול
                </Button>
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? 'משנה סיסמה...' : 'שנה סיסמה'}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Groups Info Card */}
        {user?.groups && user.groups.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>הקבוצות שלי</h2>
            <div style={styles.groupsList}>
              {user.groups.map((group: any) => (
                <div key={group.id} style={styles.groupItem}>
                  <div style={styles.groupName}>{group.name}</div>
                  {group.description && (
                    <div style={styles.groupDescription}>{group.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f7fafc',
  },
  content: {
    padding: '40px',
    maxWidth: '800px',
    margin: '0 auto',
    direction: 'rtl',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: '32px',
  },
  card: {
    background: 'white',
    borderRadius: '8px',
    padding: '32px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '24px',
    marginTop: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontWeight: '600',
    color: '#2d3748',
    fontSize: '14px',
  },
  required: {
    color: '#e53e3e',
  },
  input: {
    padding: '12px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'white',
  },
  inputDisabled: {
    background: '#f7fafc',
    color: '#718096',
    cursor: 'not-allowed',
  },
  hint: {
    fontSize: '12px',
    color: '#718096',
    fontStyle: 'italic',
  },
  saveButton: {
    marginTop: '8px',
    padding: '12px 24px',
    fontSize: '16px',
  },
  changePasswordButton: {
    padding: '12px 24px',
    fontSize: '16px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  cancelButton: {
    background: '#e2e8f0',
    color: '#2d3748',
  },
  groupsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  groupItem: {
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  groupName: {
    fontWeight: '600',
    color: '#2d3748',
    fontSize: '16px',
  },
  groupDescription: {
    fontSize: '14px',
    color: '#718096',
    marginTop: '4px',
  },
};
