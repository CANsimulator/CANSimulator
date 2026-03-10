/**
 * Payment Types for Razorpay Integration
 */

/**
 * Display-only currency options for pricing UI.
 */
export type DisplayCurrency = 'INR' | 'USD' | 'EUR';

/**
 * Billing interval for subscriptions.
 */
export type BillingInterval = 'monthly' | 'yearly';

export interface PricingPlan {
    id: string;
    name: string;
    price: number;
    currency: DisplayCurrency;
    interval: 'monthly' | 'yearly';
    features: string[];
    isPopular?: boolean;
    isFree?: boolean;
    razorpayPlanId?: string;
}

export interface PaymentOrder {
    orderId: string;
    amount: number;
    currency: string;
    planId: string;
}

export interface RazorpayPaymentResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

export interface PaymentVerificationRequest {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    planId: string;
    userId: string;
    interval?: BillingInterval;
}

export interface PaymentVerificationResponse {
    success: boolean;
    message: string;
    subscriptionId?: string;
    subscription?: {
        planId: string;
        status: string;
        expiresAt: string;
        quota?: {
            used: number;
            limit: number;
            remaining: number;
        };
    };
}

export interface Subscription {
    id: string;
    userId: string;
    planId: string;
    status: 'active' | 'cancelled' | 'expired' | 'pending';
    razorpaySubscriptionId?: string;
    startedAt: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentHistory {
    id: string;
    userId: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    status: 'success' | 'failed' | 'pending';
    planId: string;
    createdAt: string;
}

// Razorpay Checkout Options
export interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    theme?: {
        color: string;
    };
    handler?: (response: RazorpayPaymentResponse) => void;
    modal?: {
        ondismiss?: () => void;
    };
}
