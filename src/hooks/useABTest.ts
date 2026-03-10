/**
 * useABTest - Simple A/B testing hook
 */

import { useEffect, useState } from 'react';
import { trackEvent } from '../utils/analytics';

export type Variant = 'A' | 'B';

interface ABTestConfig<T> {
    testName: string;
    variants: {
        A: T;
        B: T;
    };
}

export const useABTest = <T>(config: ABTestConfig<T>) => {
    const [variant, setVariant] = useState<Variant>('A');
    const storageKey = `ab_test_${config.testName}`;

    useEffect(() => {
        // Check if user already has a variant assigned
        const savedVariant = localStorage.getItem(storageKey) as Variant;

        if (savedVariant && (savedVariant === 'A' || savedVariant === 'B')) {
            setVariant(savedVariant);
        } else {
            // Randomly assign variant (50/50 split)
            const randomVariant: Variant = Math.random() < 0.5 ? 'A' : 'B';
            setVariant(randomVariant);
            localStorage.setItem(storageKey, randomVariant);

            // Track variant assignment
            trackEvent('ab_test_assigned', {
                testName: config.testName,
                variant: randomVariant
            });
        }
    }, [config.testName, storageKey]);

    const trackVariantEvent = (eventType: string, properties?: Record<string, unknown>) => {
        trackEvent(eventType, {
            ...properties,
            abTest: config.testName,
            variant
        });
    };

    return {
        variant,
        value: config.variants[variant],
        trackVariantEvent
    };
};
