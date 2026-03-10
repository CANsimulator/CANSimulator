/**
 * Username Validation Service (Supabase Implementation)
 */

import { supabase } from '../config/supabase';

export const isUsernameAvailable = async (username: string): Promise<boolean> => {
    try {
        const normalizedUsername = username.toLowerCase().trim();
        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', normalizedUsername)
            .maybeSingle();

        if (error) throw error;
        return !data;
    } catch (error) {
        console.error('Error checking username availability:', error);
        throw new Error('Failed to check username availability.');
    }
};

export const reserveUsername = async (username: string, userId: string): Promise<void> => {
    try {
        const normalizedUsername = username.toLowerCase().trim();
        const { error } = await supabase
            .from('profiles')
            .update({
                username: normalizedUsername,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error reserving username:', error);
        throw new Error('Failed to reserve username.');
    }
};
