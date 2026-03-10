/**
 * Authentication Service (Supabase Implementation)
 */

import { supabase } from '../config/supabase';
import type { User as SupabaseUser, AuthError, AuthChangeEvent, Session } from '@supabase/supabase-js';

export interface SignUpParams {
    email: string;
    password: string;
    displayName: string;
}

export interface SignInParams {
    email: string;
    password: string;
}

const getErrorMessage = (error: AuthError): string => {
    const message = error.message.toLowerCase();
    if (message.includes('user already registered')) return 'This email is already registered.';
    if (message.includes('invalid login credentials')) return 'Invalid email or password.';
    return error.message;
};

const ensureSupabase = () => {
    if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
};

export const signUp = async ({ email, password, displayName }: SignUpParams): Promise<SupabaseUser> => {
    ensureSupabase();
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username: displayName },
            emailRedirectTo: `${window.location.origin}/simulator`
        }
    });
    if (error) throw new Error(getErrorMessage(error));
    if (!data.user) throw new Error('Failed to create user.');
    return data.user;
};

export const signIn = async ({ email, password }: SignInParams): Promise<SupabaseUser> => {
    ensureSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(getErrorMessage(error));
    if (!data.user) throw new Error('Invalid login response.');
    return data.user;
};

export const signOut = async (): Promise<void> => {
    if (!supabase) return;
    await supabase.auth.signOut();
};

export const onAuthStateChanged = (callback: (user: SupabaseUser | null) => void) => {
    if (!supabase) {
        // No Supabase configured — immediately report "no user" and return a no-op unsubscribe
        callback(null);
        return () => { };
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        callback(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
};

export const refreshUser = async (): Promise<SupabaseUser | null> => {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.refreshSession();
    return user;
};

export const signInWithGoogle = async (): Promise<void> => {
    ensureSupabase();
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
};
