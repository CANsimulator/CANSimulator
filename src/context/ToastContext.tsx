/**
 * Toast Context
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

// Simplified ToastMessage for now
export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
}

interface ToastContextType {
    addToast: (toast: Omit<ToastMessage, 'id'>) => void;
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev, { ...toast, id }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
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
