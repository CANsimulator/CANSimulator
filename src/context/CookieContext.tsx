/**
 * Cookie Consent Context
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../config/supabase';

export interface CookieConsent {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
}

interface CookieContextType {
    consent: CookieConsent;
    hasResponded: boolean;
    updateConsent: (updates: Partial<CookieConsent>) => void;
    acceptAll: () => void;
    declineAll: () => void;
    resetConsent: () => void;
}

const STORAGE_KEY = 'can_cookie_consent';
const USER_ID_KEY = 'can_consent_user_id';
const BANNER_VERSION = '2026.1';

const defaultConsent: CookieConsent = {
    essential: true,
    functional: false,
    analytics: false,
};

const CookieContext = createContext<CookieContextType | undefined>(undefined);

export const CookieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [consent, setConsent] = useState<CookieConsent>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return { ...defaultConsent, ...parsed, essential: true };
            } catch (e) { }
        }
        return defaultConsent;
    });

    const [hasResponded, setHasResponded] = useState(() => !!localStorage.getItem(STORAGE_KEY));

    const logConsentEvent = useCallback(async (decision: 'accept_all' | 'reject_all' | 'custom', categories: CookieConsent) => {
        if (!supabase) return;
        try {
            let id = localStorage.getItem(USER_ID_KEY);
            if (!id) {
                id = crypto.randomUUID();
                localStorage.setItem(USER_ID_KEY, id);
            }
            await supabase.from('cookie_consent_logs').insert({
                user_id: id,
                decision,
                consent_essential: categories.essential,
                consent_functional: categories.functional,
                consent_analytics: categories.analytics,
                banner_version: BANNER_VERSION,
                user_agent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString()
            });
        } catch (err) { }
    }, []);

    const updateConsent = useCallback((updates: Partial<CookieConsent>) => {
        setConsent(prev => {
            const next = { ...prev, ...updates, essential: true };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            logConsentEvent('custom', next);
            return next;
        });
        setHasResponded(true);
    }, [logConsentEvent]);

    const acceptAll = useCallback(() => {
        const all = { essential: true, functional: true, analytics: true };
        setConsent(all);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        setHasResponded(true);
        logConsentEvent('accept_all', all);
    }, [logConsentEvent]);

    const declineAll = useCallback(() => {
        const none = { essential: true, functional: false, analytics: false };
        setConsent(none);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(none));
        setHasResponded(true);
        logConsentEvent('reject_all', none);
    }, [logConsentEvent]);

    const resetConsent = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setConsent(defaultConsent);
        setHasResponded(false);
    }, []);

    return (
        <CookieContext.Provider value={{ consent, hasResponded, updateConsent, acceptAll, declineAll, resetConsent }}>
            {children}
        </CookieContext.Provider>
    );
};

export const useCookieConsent = () => {
    const context = useContext(CookieContext);
    if (context === undefined) {
        throw new Error('useCookieConsent must be used within a CookieProvider');
    }
    return context;
};
