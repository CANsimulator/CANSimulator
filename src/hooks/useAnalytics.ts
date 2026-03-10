/**
 * useAnalytics Hook - React hook for analytics tracking
 */

import { useEffect, useRef } from 'react';
import { trackPageView, trackScrollDepth, trackTimeOnPage } from '../utils/analytics';

export const useAnalytics = (pageName?: string) => {
    const startTimeRef = useRef<number>(Date.now());
    const scrollDepthsTracked = useRef<Set<number>>(new Set());

    // Track page view on mount
    useEffect(() => {
        trackPageView(pageName);
    }, [pageName]);

    // Track scroll depth
    useEffect(() => {
        const handleScroll = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;
            const scrollPercent = (scrollTop + windowHeight) / documentHeight;

            // Track at 25%, 50%, 75%, 100% milestones
            const milestones = [0.25, 0.5, 0.75, 1.0];
            milestones.forEach(milestone => {
                if (scrollPercent >= milestone && !scrollDepthsTracked.current.has(milestone)) {
                    scrollDepthsTracked.current.add(milestone);
                    trackScrollDepth(milestone);
                }
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Track time on page when unmounting
    useEffect(() => {
        return () => {
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            trackTimeOnPage(duration);
        };
    }, []);

    return {
        // Hook doesn't need to return anything, tracking is automatic
    };
};
