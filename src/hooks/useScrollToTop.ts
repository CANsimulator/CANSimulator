import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to scroll the window to the top on every route change.
 * This is necessary for SPA navigation as React Router does not 
 * inherently manage scroll state between route transitions.
 */
export function useScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // We use window.scrollTo behavior 'instant' or 'auto' for an immediate jump.
        // It provides a more cohesive 'new page' feel in a diagnostics simulator context.
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, [pathname]);
}
