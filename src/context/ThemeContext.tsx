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
        // Always try to load theme from localStorage if possible (matching index.html inline script)
        const saved = localStorage.getItem('can_theme');
        if (saved === 'dark' || saved === 'light') return saved as Theme;
        
        // System preference as fallback
        const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
        return prefersLight ? 'light' : 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        
        // Apply class-based theme (for Tailwind)
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        
        // Apply attribute-based theme (for custom CSS/libraries)
        root.setAttribute('data-theme', theme);
        
        // Persist to storage - checking consent if present in current implementation
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
