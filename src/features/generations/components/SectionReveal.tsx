import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface SectionRevealProps {
    children: ReactNode;
    className?: string;
    /** Delay in seconds before animation starts */
    delay?: number;
    /** HTML element id for anchor links */
    id?: string;
}

/**
 * Scroll-triggered section reveal wrapper.
 * Fades + slides children up when they enter the viewport.
 * Respects `prefers-reduced-motion` — renders static content when enabled.
 */
export function SectionReveal({
    children,
    className,
    delay = 0,
    id,
}: SectionRevealProps) {
    const reduceMotion = useReducedMotion();

    if (reduceMotion) {
        return (
            <section id={id} className={className}>
                {children}
            </section>
        );
    }

    return (
        <motion.section
            id={id}
            className={className}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{
                duration: 0.45,
                delay,
                ease: [0.25, 0.46, 0.45, 0.94],
            }}
        >
            {children}
        </motion.section>
    );
}
