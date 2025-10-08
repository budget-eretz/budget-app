import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isTreasurer = user?.isCircleTreasurer || user?.isGroupTreasurer;

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false); // Close mobile menu after navigation
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.container} className="nav-container">
        <div style={styles.leftSection}>
          <h1 style={styles.logo}>מערכת ניהול תקציב</h1>
          <div style={styles.navLinks} className="nav-links">
            <button
              onClick={() => handleNavigation('/dashboard')}
              style={{
                ...styles.navLink,
                ...(isActive('/dashboard') ? styles.navLinkActive : {}),
              }}
            >
              לוח בקרה
            </button>
            <button
              onClick={() => handleNavigation('/my-reimbursements')}
              style={{
                ...styles.navLink,
                ...(isActive('/my-reimbursements') ? styles.navLinkActive : {}),
              }}
            >
              ההחזרים שלי
            </button>
            <button
              onClick={() => handleNavigation('/budgets')}
              style={{
                ...styles.navLink,
                ...(isActive('/budgets') || location.pathname.startsWith('/budgets/') ? styles.navLinkActive : {}),
              }}
            >
              תקציבים
            </button>
            <button
              onClick={() => handleNavigation('/incomes')}
              style={{
                ...styles.navLink,
                ...(isActive('/incomes') ? styles.navLinkActive : {}),
              }}
            >
              הכנסות
            </button>
            {isTreasurer && (
              <>
                <button
                  onClick={() => handleNavigation('/payments')}
                  style={{
                    ...styles.navLink,
                    ...(isActive('/payments') ? styles.navLinkActive : {}),
                  }}
                >
                  אישור החזרים
                </button>
                <button
                  onClick={() => handleNavigation('/payment-transfers')}
                  style={{
                    ...styles.navLink,
                    ...(isActive('/payment-transfers') ? styles.navLinkActive : {}),
                  }}
                >
                  העברות
                </button>
              </>
            )}
            {user?.isCircleTreasurer && (
              <>
                <button
                  onClick={() => handleNavigation('/users')}
                  style={{
                    ...styles.navLink,
                    ...(isActive('/users') ? styles.navLinkActive : {}),
                  }}
                >
                  ניהול משתמשים
                </button>
                <button
                  onClick={() => handleNavigation('/groups')}
                  style={{
                    ...styles.navLink,
                    ...(isActive('/groups') ? styles.navLinkActive : {}),
                  }}
                >
                  ניהול קבוצות
                </button>
              </>
            )}
          </div>
        </div>
        <div style={styles.rightSection} className="nav-right">
          <button 
            onClick={() => handleNavigation('/profile')}
            style={{
              ...styles.profileButton,
              ...(isActive('/profile') ? styles.profileButtonActive : {}),
            }}
            className="profile-btn"
          >
            <div style={styles.userInfo} className="user-info">
              <span style={styles.userName}>{user?.fullName}</span>
              <span style={styles.userRole}>
                {user?.isCircleTreasurer ? 'גזבר מעגלי' : user?.isGroupTreasurer ? 'גזבר קבוצתי' : 'חבר'}
              </span>
            </div>
          </button>
          <button onClick={logout} style={styles.logoutBtn} className="logout-btn">
            יציאה
          </button>
        </div>
        
        {/* Mobile hamburger menu button */}
        <button 
          onClick={toggleMobileMenu} 
          style={styles.hamburger}
          className="hamburger-btn"
          aria-label="תפריט"
        >
          <div style={styles.hamburgerLine}></div>
          <div style={styles.hamburgerLine}></div>
          <div style={styles.hamburgerLine}></div>
        </button>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div style={styles.mobileMenu} className="mobile-menu">
          <button
            onClick={() => handleNavigation('/dashboard')}
            style={{
              ...styles.mobileNavLink,
              ...(isActive('/dashboard') ? styles.mobileNavLinkActive : {}),
            }}
          >
            לוח בקרה
          </button>
          <button
            onClick={() => handleNavigation('/my-reimbursements')}
            style={{
              ...styles.mobileNavLink,
              ...(isActive('/my-reimbursements') ? styles.mobileNavLinkActive : {}),
            }}
          >
            ההחזרים שלי
          </button>
          <button
            onClick={() => handleNavigation('/budgets')}
            style={{
              ...styles.mobileNavLink,
              ...(isActive('/budgets') || location.pathname.startsWith('/budgets/') ? styles.mobileNavLinkActive : {}),
            }}
          >
            תקציבים
          </button>
          <button
            onClick={() => handleNavigation('/incomes')}
            style={{
              ...styles.mobileNavLink,
              ...(isActive('/incomes') ? styles.mobileNavLinkActive : {}),
            }}
          >
            הכנסות
          </button>
          {isTreasurer && (
            <>
              <button
                onClick={() => handleNavigation('/payments')}
                style={{
                  ...styles.mobileNavLink,
                  ...(isActive('/payments') ? styles.mobileNavLinkActive : {}),
                }}
              >
                אישור החזרים
              </button>
              <button
                onClick={() => handleNavigation('/payment-transfers')}
                style={{
                  ...styles.mobileNavLink,
                  ...(isActive('/payment-transfers') ? styles.mobileNavLinkActive : {}),
                }}
              >
                העברות
              </button>
            </>
          )}
          {user?.isCircleTreasurer && (
            <>
              <button
                onClick={() => handleNavigation('/users')}
                style={{
                  ...styles.mobileNavLink,
                  ...(isActive('/users') ? styles.mobileNavLinkActive : {}),
                }}
              >
                ניהול משתמשים
              </button>
              <button
                onClick={() => handleNavigation('/groups')}
                style={{
                  ...styles.mobileNavLink,
                  ...(isActive('/groups') ? styles.mobileNavLinkActive : {}),
                }}
              >
                ניהול קבוצות
              </button>
            </>
          )}
          <button
            onClick={() => handleNavigation('/profile')}
            style={{
              ...styles.mobileNavLink,
              ...(isActive('/profile') ? styles.mobileNavLinkActive : {}),
            }}
          >
            הפרופיל שלי
          </button>
          <div style={styles.mobileUserInfo}>
            <span style={styles.mobileUserName}>{user?.fullName}</span>
            <span style={styles.mobileUserRole}>
              {user?.isCircleTreasurer ? 'גזבר מעגלי' : user?.isGroupTreasurer ? 'גזבר קבוצתי' : 'חבר'}
            </span>
          </div>
          <button onClick={logout} style={styles.mobileLogoutBtn}>
            יציאה
          </button>
        </div>
      )}
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 40px',
    maxWidth: '1400px',
    margin: '0 auto',
    position: 'relative',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
    color: '#2d3748',
  },
  navLinks: {
    display: 'flex',
    gap: '8px',
  },
  navLink: {
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    transition: 'all 0.2s',
    minHeight: '44px', // Touch-friendly size
  },
  navLinkActive: {
    background: '#667eea',
    color: 'white',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  profileButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  profileButtonActive: {
    background: '#edf2f7',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  userRole: {
    fontSize: '12px',
    color: '#718096',
  },
  logoutBtn: {
    padding: '10px 20px',
    background: '#e53e3e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    minHeight: '44px', // Touch-friendly size
  },
  hamburger: {
    display: 'none',
    flexDirection: 'column',
    gap: '4px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    minHeight: '44px',
    minWidth: '44px',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerLine: {
    width: '24px',
    height: '3px',
    background: '#2d3748',
    borderRadius: '2px',
    transition: 'all 0.3s',
  },
  mobileMenu: {
    display: 'none',
    flexDirection: 'column',
    background: 'white',
    borderTop: '1px solid #e2e8f0',
    padding: '16px',
    gap: '8px',
  },
  mobileNavLink: {
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    color: '#4a5568',
    textAlign: 'right',
    width: '100%',
    minHeight: '48px', // Larger touch target for mobile
  },
  mobileNavLinkActive: {
    background: '#667eea',
    color: 'white',
  },
  mobileUserInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    padding: '16px',
    borderTop: '1px solid #e2e8f0',
    marginTop: '8px',
  },
  mobileUserName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
  },
  mobileUserRole: {
    fontSize: '14px',
    color: '#718096',
    marginTop: '4px',
  },
  mobileLogoutBtn: {
    padding: '12px 20px',
    background: '#e53e3e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    width: '100%',
    minHeight: '48px', // Larger touch target for mobile
  },
};

// Add responsive media queries
const navMediaQueryStyle = document.createElement('style');
navMediaQueryStyle.textContent = `
  @media (max-width: 768px) {
    .nav-container {
      padding: 12px 20px !important;
    }
    
    .nav-links {
      display: none !important;
    }
    
    .nav-right {
      display: none !important;
    }
    
    .hamburger-btn {
      display: flex !important;
    }
    
    .mobile-menu {
      display: flex !important;
    }
  }
  
  @media (min-width: 769px) {
    .hamburger-btn {
      display: none !important;
    }
    
    .mobile-menu {
      display: none !important;
    }
  }
`;
if (!document.head.querySelector('style[data-nav-responsive]')) {
  navMediaQueryStyle.setAttribute('data-nav-responsive', 'true');
  document.head.appendChild(navMediaQueryStyle);
}
