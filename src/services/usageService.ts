/**
 * Usage Quota Service
 * Tracks and gates command/feature usage based on subscription tier
 */

import { supabase } from '../config/supabase';

export type EventType =
    | 'frame_sent'
    | 'fd_frame_sent'
    | 'arbitration_run'
    | 'error_injection'
    | 'export_pdf'
    | 'signal_decode';

/**
 * Increment the user's command counter and log the event.
 * Returns false if the user has exceeded their monthly limit.
 */
export async function trackUsage(userId: string, eventType: EventType, metadata?: Record<string, unknown>): Promise<boolean> {
    if (!supabase || !userId) return true; // Guest mode — no tracking

    // 1. Fetch current quota
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('commands_used_this_month, monthly_command_limit')
        .eq('id', userId)
        .single();

    if (error || !profile) return true; // Fail open

    // 2. Check limit
    if (profile.commands_used_this_month >= profile.monthly_command_limit) {
        return false; // Quota exceeded
    }

    // 3. Increment + log in parallel
    await Promise.all([
        supabase.rpc('increment_command_count', { user_id: userId }),
        supabase.from('usage_logs').insert({
            user_id: userId,
            event_type: eventType,
            metadata: metadata ?? {},
        }),
    ]);

    return true;
}

/**
 * Get remaining quota for the current user
 */
export async function getRemainingQuota(userId: string): Promise<{ used: number; limit: number; remaining: number } | null> {
    if (!supabase || !userId) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('commands_used_this_month, monthly_command_limit')
        .eq('id', userId)
        .single();

    if (error || !data) return null;

    return {
        used: data.commands_used_this_month,
        limit: data.monthly_command_limit,
        remaining: Math.max(0, data.monthly_command_limit - data.commands_used_this_month),
    };
}
