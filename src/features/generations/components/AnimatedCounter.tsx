import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface AnimatedCounterProps {
    /** Target numeric value */
    value: number;
    /** Number of decimal places to display */
    decimals?: number;
    /** Duration of the animation in milliseconds */
    duration?: number;
    /** Optional suffix like "bytes", "%", "Mbit/s" */
    suffix?: string;
    /** Optional prefix like "$" */
    prefix?: string;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Animates a numeric value from its previous value to the new target.
 * Uses requestAnimationFrame for smooth 60fps counting.
 * Falls back to instant display when reduced-motion is preferred.
 */
export function AnimatedCounter({
    value,
    decimals = 0,
    duration = 500,
    suffix = '',
    prefix = '',
    className,
}: AnimatedCounterProps) {
    const reduceMotion = useReducedMotion();
    const [displayValue, setDisplayValue] = useState(value);
    const previousValueRef = useRef(value);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        if (reduceMotion || previousValueRef.current === value) {
            setDisplayValue(value);
            previousValueRef.current = value;
            return;
        }

        const startValue = previousValueRef.current;
        const diff = value - startValue;
        const startTime = performance.now();

        function tick(now: number) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic for smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = startValue + diff * eased;

            setDisplayValue(current);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(tick);
            } else {
                setDisplayValue(value);
            }
        }

        frameRef.current = requestAnimationFrame(tick);
        previousValueRef.current = value;

        return () => cancelAnimationFrame(frameRef.current);
    }, [value, duration, reduceMotion]);

    const formatted = displayValue.toFixed(decimals);

    return (
        <span className={className}>
            {prefix}
            {formatted}
            {suffix && <span className="ml-0.5">{suffix}</span>}
        </span>
    );
}
