/**
 * Email Service (Resend)
 * Server-side only — call via a Supabase Edge Function or Vercel API route.
 * This module exports the payload shapes used by the frontend to call
 * the /api/send-email endpoint.
 */

export interface WelcomeEmailPayload {
    to: string;
    userName: string;
}

export interface ContactFormPayload {
    from: string;
    name: string;
    subject: string;
    message: string;
}

// ---------------------------------------------------------------
// Frontend helper — calls your backend API route (Edge Function)
// ---------------------------------------------------------------
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export async function sendWelcomeEmail(payload: WelcomeEmailPayload): Promise<void> {
    await fetch(`${API_BASE}/api/emails/welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

export async function sendContactEmail(payload: ContactFormPayload): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await fetch(`${API_BASE}/api/emails/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
