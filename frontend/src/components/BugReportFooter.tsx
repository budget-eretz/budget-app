import { useEffect, useState, type CSSProperties } from 'react';

const BUG_REPORT_URL = 'https://forms.gle/DmEVfbS6xS4MzePj7';

export default function BugReportFooter() {
  const isMobile = useIsMobile();
  const linkStyle = {
    ...styles.linkBase,
    ...(isMobile ? styles.mobileLink : styles.desktopLink),
  };

  return (
    <div style={{ ...styles.container, ...(isMobile ? styles.mobileContainer : styles.desktopContainer) }}>
      <a
        href={BUG_REPORT_URL}
        target="_blank"
        rel="noreferrer"
        style={linkStyle}
        aria-label="דיווח על באגים"
      >
        {isMobile ? '🐞' : 'מצאתם באג? דווחו לנו כאן'}
      </a>
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const updateMatch = (event?: MediaQueryListEvent) => setIsMobile(event ? event.matches : mediaQuery.matches);

    updateMatch();
    mediaQuery.addEventListener('change', updateMatch);
    return () => mediaQuery.removeEventListener('change', updateMatch);
  }, []);

  return isMobile;
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '16px',
    left: '16px',
    right: 'auto',
    display: 'flex',
    justifyContent: 'flex-start',
    padding: 0,
    zIndex: 900,
    pointerEvents: 'none',
  },
  desktopContainer: {
    maxWidth: '280px',
  },
  mobileContainer: {
    maxWidth: 'auto',
  },
  linkBase: {
    pointerEvents: 'auto',
    textDecoration: 'none',
    fontWeight: 600,
    lineHeight: 1.3,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
    borderRadius: '999px',
    border: '1px solid #e2e8f0',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 120ms ease, box-shadow 120ms ease',
  },
  desktopLink: {
    background: 'rgba(255, 255, 255, 0.96)',
    padding: '10px 18px',
    color: '#1a365d',
    fontSize: '14px',
    textAlign: 'center',
    minWidth: 'fit-content',
  },
  mobileLink: {
    width: '52px',
    height: '52px',
    padding: 0,
    background: '#1a365d',
    color: '#fff',
    borderRadius: '50%',
    fontSize: '24px',
  },
};
