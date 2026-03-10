/**
 * Razorpay Service
 * Handles subscription plan creation, checkout, and webhook verification
 */

// ----------------------------------------------------------------
// Plan Definitions (IDs should match your Razorpay Dashboard)
// ----------------------------------------------------------------
export const PLANS = {
    free: {
        id: 'free',
        name: 'Free',
        monthlyCommandLimit: 399,
        razorpayPlanId: null,
        priceInr: 0,
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        monthlyCommandLimit: 5000,
        razorpayPlanId: import.meta.env.VITE_RAZORPAY_PLAN_PRO,
        priceInr: 999,
    },
    team: {
        id: 'team',
        name: 'Team',
        monthlyCommandLimit: 25000,
        razorpayPlanId: import.meta.env.VITE_RAZORPAY_PLAN_TEAM,
        priceInr: 2999,
    },
} as const;

export type PlanId = keyof typeof PLANS;

// ----------------------------------------------------------------
// Client-side checkout helper
// Uses the Razorpay JS SDK loaded via CDN or react-razorpay
// ----------------------------------------------------------------
export interface CheckoutOptions {
    planId: PlanId;
    userName: string;
    userEmail: string;
    prefillContact?: string;
    onSuccess: (paymentId: string, subscriptionId: string) => void;
    onDismiss?: () => void;
}

export function openRazorpayCheckout(opts: CheckoutOptions): void {
    const plan = PLANS[opts.planId];
    if (!plan || !plan.razorpayPlanId) {
        console.warn('[razorpay] No plan ID configured for:', opts.planId);
        return;
    }

    const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        subscription_id: '', // Set after creating subscription on backend
        name: 'CAN Simulator',
        description: `${plan.name} Plan — ₹${plan.priceInr}/mo`,
        image: '/logo.svg',
        prefill: {
            name: opts.userName,
            email: opts.userEmail,
            contact: opts.prefillContact || '',
        },
        theme: {
            color: '#00f3ff',
        },
        handler: (response: { razorpay_payment_id: string; razorpay_subscription_id: string }) => {
            opts.onSuccess(response.razorpay_payment_id, response.razorpay_subscription_id);
        },
        modal: {
            ondismiss: opts.onDismiss,
        },
    };

    // @ts-ignore — Razorpay loaded globally from CDN
    const rzp = new window.Razorpay(options);
    rzp.open();
}
