import { useCallback, useEffect, useState } from 'react';

function getStickyTopPx(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--nav-height').trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useStickyTableHeader() {
  const [headerCell, setHeaderCell] = useState<HTMLTableCellElement | null>(null);
  const [isHeaderStuck, setIsHeaderStuck] = useState(false);

  const headerCellRef = useCallback((node: HTMLTableCellElement | null) => {
    setHeaderCell(node);
  }, []);

  useEffect(() => {
    if (!headerCell) return;

    let rafId = 0;
    let stickyTopPx = getStickyTopPx();

    const update = () => {
      rafId = 0;
      const top = headerCell.getBoundingClientRect().top;
      setIsHeaderStuck(top <= stickyTopPx + 1);
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    };

    const onResize = () => {
      stickyTopPx = getStickyTopPx();
      onScroll();
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [headerCell]);

  return {
    headerCellRef,
    isHeaderStuck,
    tableClassName: isHeaderStuck ? 'sticky-table scrolled' : 'sticky-table',
  };
}
