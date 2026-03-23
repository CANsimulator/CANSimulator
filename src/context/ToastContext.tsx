/**
 * Toast Context
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

// Simplified ToastMessage for now
export interface ToastMessage {
    id: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
    duration?: number;
}

interface ToastContextType {
    addToast: (toast: Omit<ToastMessage, 'id'>) => void;
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
        const id = crypto.randomUUID();
        setToasts(prev => {
            const newToasts = [...prev.slice(-4), { ...toast, id }]; // Max 5 total
            return newToasts;
        });
        
        // Auto-dismiss after duration (default 5000ms, set to 0 to disable)
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, toasts, removeToast }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
