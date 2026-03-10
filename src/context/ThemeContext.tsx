/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useCookieConsent } from './CookieContext';
import type { ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { consent } = useCookieConsent();

    const [theme, setTheme] = useState<Theme>(() => {
        const saved = consent.functional ? localStorage.getItem('can_theme') : null;
        if (saved) return saved as Theme;
        const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
        return prefersLight ? 'light' : 'dark';
    });

    useEffect(() => {
        const el = document.documentElement;
        el.setAttribute('data-theme', theme);
        if (theme === 'dark') {
            el.classList.add('dark');
        } else {
            el.classList.remove('dark');
        }

        if (consent.functional) {
            localStorage.setItem('can_theme', theme);
        }
    }, [theme, consent.functional]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
