/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthState, AuthUser, LoginCredentials, UserRole } from '../types/auth';
import * as authService from '../services/authService';
import { supabase } from '../config/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<boolean>;
    logout: () => void;
}

const defaultAuthState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true, // ← start true until auth is resolved
    error: null,
    rateLimitInfo: { attemptsRemaining: 5, isLocked: false, lockoutEndTime: null, lastAttemptTime: null },
    sessionExpiry: null,
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>(defaultAuthState);

    const fetchProfile = useCallback(async (supabaseUser: SupabaseUser): Promise<AuthUser> => {
        // supabase can be null if env vars not configured — gracefully fall back
        let profile: Record<string, unknown> | null = null;
        if (supabase) {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', supabaseUser.id)
                .single();
            profile = data;
        }

        return {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: (profile?.username as string) || 'User',
            role: (profile?.role as UserRole) || 'user',
            commandLimit: (profile?.command_limit as number) || 399,
            userType: 'beginner',
            emailVerified: !!supabaseUser.email_confirmed_at,
            twoFactorEnabled: false,
            createdAt: supabaseUser.created_at,
            currentPlan: (profile?.current_plan as string) || 'free',
            subscriptionTier: (profile?.subscription_tier as string) || 'free',
            subscriptionId: (profile?.subscription_id as string) || null,
            commandsUsedThisMonth: (profile?.commands_used_this_month as number) || 0,
            monthlyCommandLimit: (profile?.monthly_command_limit as number) || 399,
            lastQuotaReset: (profile?.last_quota_reset as string) || new Date().toISOString(),
            tierUpdatedAt: (profile?.tier_updated_at as string) || new Date().toISOString(),
        };
    }, []);

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(async (supabaseUser) => {
            if (supabaseUser) {
                setState(prev => ({ ...prev, isLoading: true }));
                try {
                    const userProfile = await fetchProfile(supabaseUser);
                    setState(prev => ({ ...prev, user: userProfile, isAuthenticated: true, isLoading: false }));
                } catch {
                    setState(prev => ({ ...prev, user: null, isAuthenticated: false, isLoading: false }));
                }
            } else {
                setState(prev => ({ ...prev, user: null, isAuthenticated: false, isLoading: false }));
            }
        });
        return () => unsubscribe();
    }, [fetchProfile]);

    const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const supabaseUser = await authService.signIn(credentials);
            const userProfile = await fetchProfile(supabaseUser);
            setState(prev => ({ ...prev, user: userProfile, isAuthenticated: true, isLoading: false }));
            return true;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Login failed';
            setState(prev => ({ 
                ...prev, 
                isLoading: false, 
                error: { code: 'INVALID_CREDENTIALS', message: msg },
                rateLimitInfo: {
                    ...prev.rateLimitInfo,
                    attemptsRemaining: Math.max(0, (prev.rateLimitInfo?.attemptsRemaining || 5) - 1),
                }
            }));
            return false;
        }
    }, [fetchProfile]);

    const logout = useCallback(async () => {
        await authService.signOut();
        setState({ ...defaultAuthState, isLoading: false }); // ensure loading is false after explicit logout
    }, []);

    return (
        <AuthContext.Provider value={{ ...state, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
