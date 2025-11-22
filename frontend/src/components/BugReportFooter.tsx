import type { CSSProperties } from 'react';

const BUG_REPORT_URL = 'https://forms.gle/DmEVfbS6xS4MzePj7';

export default function BugReportFooter() {
  return (
    <div style={styles.container}>
      <a
        href={BUG_REPORT_URL}
        target="_blank"
        rel="noreferrer"
        style={styles.link}
        aria-label="דיווח על באגים"
      >
        מצאתם באג? דווחו לנו כאן
      </a>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '16px',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 16px',
    zIndex: 900,
    pointerEvents: 'none',
  },
  link: {
    pointerEvents: 'auto',
    background: 'rgba(255, 255, 255, 0.96)',
    border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
    borderRadius: '999px',
    padding: '10px 18px',
    color: '#1a365d',
    fontWeight: 600,
    textDecoration: 'none',
    fontSize: '14px',
    textAlign: 'center',
    lineHeight: 1.3,
  },
};
