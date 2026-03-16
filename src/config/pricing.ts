/**
 * Pricing & Regional Configuration
 * Centralized source of truth for plans, currencies, and regions.
 */

import type { PricingPlan, DisplayCurrency } from '../types/payment';

export type PricingPlanId = 'free' | 'pro' | 'team' | 'enterprise';

export const DISPLAY_CURRENCY_OPTIONS: DisplayCurrency[] = ['INR', 'USD', 'EUR'];

export const PRICING_PLANS: PricingPlan[] = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'INR',
        interval: 'monthly',
        isFree: true,
        features: [
            'Basic CAN Simulator Access',
            '500 Messages / Day',
            'Standard CAN 2.0A/B Support',
            'Real-time Bus Monitor',
            'Community Documentation',
            'Email Support',
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 9,
        currency: 'USD',
        interval: 'monthly',
        isPopular: true,
        features: [
            'Full CAN & CAN FD Access',
            '64-byte Payload Support',
            'Advanced Error Injection',
            'Bus Arbitration Visualizer',
            'Export Trace (BLF/ASC/CSV)',
            'Priority Email Support',
            '10,000 Messages / Day',
        ],
    },
    {
        id: 'team',
        name: 'Team',
        price: 29,
        currency: 'USD',
        interval: 'monthly',
        features: [
            'Everything in Pro',
            'Multi-node Simulation',
            'Signal Database (DBC) Support',
            'Team Collaboration Spaces',
            '100,000 Messages / Day',
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 99,
        currency: 'USD',
        interval: 'monthly',
        features: [
            'Everything in Team',
            'Single Sign-On (SSO / SAML)',
            'Custom CAN FD Bit-timings',
            'Admin Security Console',
            'Dedicated Account Manager',
            'Unlimited Messages',
        ],
    },
];
