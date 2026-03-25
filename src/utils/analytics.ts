/**
 * Analytics Utility - Custom localStorage-based tracking
 * Privacy-friendly analytics without external dependencies
 */

export interface AnalyticsEvent {
    type: string;
    properties?: Record<string, any>;
    timestamp: number;
}

export interface AnalyticsSession {
    sessionId: string;
    startTime: number;
    events: AnalyticsEvent[];
    pageViews: number;
    referrer: string;
}

class Analytics {
    private sessionKey = 'can_analytics_session';
    private eventsKey = 'can_analytics_events';
    private session: AnalyticsSession | null = null;
    private pendingEvents: AnalyticsEvent[] = [];
    private flushScheduled = false;

    constructor() {
        this.initSession();
    }

    private initSession(): void {
        const existingSession = localStorage.getItem(this.sessionKey);

        if (existingSession) {
            try {
                this.session = JSON.parse(existingSession);
            } catch (e) {
                this.createNewSession();
            }
        } else {
            this.createNewSession();
        }
    }

    private createNewSession(): void {
        this.session = {
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            events: [],
            pageViews: 0,
            referrer: document.referrer || 'direct'
        };
        this.scheduleFlush();
    }

    private generateSessionId(): string {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }

    private hasConsent(): boolean {
        try {
            const consent = localStorage.getItem('can_cookie_consent');
            if (!consent) return false;
            return JSON.parse(consent).analytics === true;
        } catch {
            return false;
        }
    }

    /**
     * Batch localStorage writes to avoid blocking the main thread on interaction (INP).
     * Uses requestIdleCallback (or setTimeout fallback) to defer serialization + write.
     */
    private scheduleFlush(): void {
        if (!this.hasConsent()) return;
        if (this.flushScheduled) return;
        this.flushScheduled = true;
        const cb = () => {
            this.flushScheduled = false;
            // Flush session
            if (this.session) {
                localStorage.setItem(this.sessionKey, JSON.stringify(this.session));
            }
            // Flush pending events
            if (this.pendingEvents.length > 0) {
                let events: AnalyticsEvent[];
                try {
                    const raw = localStorage.getItem(this.eventsKey);
                    events = raw ? JSON.parse(raw) : [];
                } catch { events = []; }
                events.push(...this.pendingEvents);
                localStorage.setItem(this.eventsKey, JSON.stringify(events.slice(-100)));
                this.pendingEvents = [];
            }
        };
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(cb, { timeout: 2000 });
        } else {
            setTimeout(cb, 50);
        }
    }

    private getEvents(): AnalyticsEvent[] {
        try {
            const events = localStorage.getItem(this.eventsKey);
            return events ? JSON.parse(events) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Track a custom event — non-blocking (defers localStorage write)
     */
    trackEvent(type: string, properties?: Record<string, any>): void {
        if (!this.hasConsent()) return;

        const event: AnalyticsEvent = {
            type,
            properties: {
                ...properties,
                sessionId: this.session?.sessionId,
                page: window.location.pathname
            },
            timestamp: Date.now()
        };

        if (this.session) {
            this.session.events.push(event);
            // Cap session events to avoid bloat
            if (this.session.events.length > 100) {
                this.session.events = this.session.events.slice(-100);
            }
        }
        this.pendingEvents.push(event);
        this.scheduleFlush();

        if (import.meta.env.DEV) {
            console.log('Analytics Event:', event);
        }
    }

    /**
     * Track page view
     */
    trackPageView(path?: string): void {
        const page = path || window.location.pathname;

        if (this.session) {
            this.session.pageViews++;
            this.scheduleFlush();
        }

        this.trackEvent('page_view', { path: page });
    }

    /**
     * Track CTA button click
     */
    trackCTAClick(button: string, location: string): void {
        this.trackEvent('cta_click', { button, location });
    }

    /**
     * Track scroll depth
     */
    trackScrollDepth(depth: number): void {
        const depthPercentage = Math.round(depth * 100);
        this.trackEvent('scroll_depth', { depth: `${depthPercentage}%` });
    }

    /**
     * Track time on page
     */
    trackTimeOnPage(duration: number): void {
        this.trackEvent('time_on_page', { duration });
    }

    /**
     * Track conversion (simulator launch)
     */
    trackConversion(source: string): void {
        this.trackEvent('conversion', { source, type: 'simulator_launch' });
    }

    /**
     * Get analytics summary for reporting
     */
    getAnalyticsSummary(): {
        totalEvents: number;
        totalPageViews: number;
        sessionDuration: number;
        topEvents: Array<{ type: string; count: number }>;
    } {
        const events = this.getEvents();
        const sessionDuration = this.session
            ? Date.now() - this.session.startTime
            : 0;

        // Count event types
        const eventCounts = events.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topEvents = Object.entries(eventCounts)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            totalEvents: events.length,
            totalPageViews: this.session?.pageViews || 0,
            sessionDuration,
            topEvents
        };
    }

    /**
     * Clear analytics data
     */
    clearAnalytics(): void {
        localStorage.removeItem(this.sessionKey);
        localStorage.removeItem(this.eventsKey);
        this.createNewSession();
    }
}

// Singleton instance
export const analytics = new Analytics();

// Convenience functions
export const trackEvent = (type: string, properties?: Record<string, any>) =>
    analytics.trackEvent(type, properties);

export const trackPageView = (path?: string) =>
    analytics.trackPageView(path);

export const trackCTAClick = (button: string, location: string) =>
    analytics.trackCTAClick(button, location);

export const trackScrollDepth = (depth: number) =>
    analytics.trackScrollDepth(depth);

export const trackTimeOnPage = (duration: number) =>
    analytics.trackTimeOnPage(duration);

export const trackConversion = (source: string) =>
    analytics.trackConversion(source);

export const getAnalyticsSummary = () =>
    analytics.getAnalyticsSummary();
