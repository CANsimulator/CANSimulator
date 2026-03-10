import { useState, useEffect } from 'react';

/**
 * Detects if the viewport is mobile-sized (<768px).
 * Uses matchMedia for efficient, event-driven updates.
 * Returns false during SSR.
 */
export function useIsMobile(breakpoint = 768): boolean {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
    );

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        setIsMobile(mql.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, [breakpoint]);

    return isMobile;
}
