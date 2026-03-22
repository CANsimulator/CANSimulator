import React, { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '../../utils/cn';
import type { FrameField } from '../../services/can/can-error-catalog';

interface BitStreamVisualizerProps {
    /** The bit array to render */
    bits: number[];
    /** Which bits are erroneous — highlighted in red/pink */
    errorBitIndices: number[];
    /** CAN frame field definitions for color-coding */
    fields: FrameField[];
    /** Whether to animate bits appearing sequentially */
    animate?: boolean;
    /** Label to show above the stream */
    label: string;
    /** Visual variant */
    variant: 'correct' | 'corrupted';
}

/**
 * Renders a CAN frame as a horizontal strip of colored bit cells.
 * Error bits glow with neon-pink. Field labels shown below.
 */
export const BitStreamVisualizer: React.FC<BitStreamVisualizerProps> = ({
    bits,
    errorBitIndices,
    fields,
    animate = false,
    label,
    variant,
}) => {
    const shouldReduceMotion = useReducedMotion();
    const errorSet = useMemo(() => new Set(errorBitIndices), [errorBitIndices]);
    const finalAnimate = animate && !shouldReduceMotion;

    /** Find which field a bit belongs to */
    const getField = (bitIndex: number): FrameField | undefined => {
        return fields.find((f) => bitIndex >= f.startBit && bitIndex <= f.endBit);
    };

    /** Build field label markers — one label per contiguous field */
    const fieldLabels = useMemo(() => {
        return fields.map((f) => ({
            ...f,
            center: f.startBit + (f.endBit - f.startBit) / 2,
            width: f.endBit - f.startBit + 1,
        }));
    }, [fields]);

    return (
        <div className="space-y-1.5">
            {/* Label */}
            <div className="flex items-center gap-2">
                <div
                    className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        !shouldReduceMotion && "animate-pulse"
                    )}
                    style={{
                        backgroundColor: variant === 'correct' ? '#00ff9f' : '#ff006e',
                    }}
                />
                <span
                    className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest"
                    style={{
                        color: variant === 'correct' ? '#00ff9f' : '#ff006e',
                    }}
                >
                    {label}
                </span>
            </div>

            {/* Bit stream — horizontally scrollable */}
            <div className="relative group/stream">
                <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-dark-700 scrollbar-track-transparent no-scrollbar relative">
                    <div className="inline-flex flex-col gap-0.5 min-w-max">
                        {/* Bit cells */}
                        <div className="flex gap-px">
                            {bits.map((bit, i) => {
                                const field = getField(i);
                                const isError = errorSet.has(i) && variant === 'corrupted';
                                const baseColor = field?.color ?? '#64748b';
                                const fieldInfo = `Bit ${i}: ${bit} (${field?.name ?? 'Unknown'})`;

                                return (
                                    <div
                                        key={i}
                                        tabIndex={0}
                                        role="img"
                                        aria-label={fieldInfo}
                                        className={cn(
                                            "relative flex items-center justify-center rounded-sm font-mono text-[11px] font-black select-none transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00ff9f]/50",
                                            finalAnimate && "animate-fade-in opacity-0 [animation-fill-mode:forwards]"
                                        )}
                                        style={{
                                            width: 22,
                                            height: 28,
                                            backgroundColor: isError
                                                ? '#ff006e20'
                                                : `${baseColor}10`,
                                            border: `1px solid ${isError ? '#ff006e' : `${baseColor}30`}`,
                                            color: isError ? '#ff006e' : baseColor,
                                            boxShadow: isError
                                                ? '0 0 8px rgba(255, 0, 110, 0.4)'
                                                : 'none',
                                            animationDelay: finalAnimate ? `${i * 12}ms` : undefined,
                                        }}
                                    >
                                        {bit}
                                        {isError && !shouldReduceMotion && (
                                            <div
                                                className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ff006e] animate-pulse shadow-[0_0_4px_#ff006e]"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Field labels below the bit cells */}
                        <div className="relative h-5 mt-1">
                            {fieldLabels.map((f) => (
                                <div
                                    key={f.abbrev}
                                    className="absolute text-[9px] font-black uppercase tracking-wider text-center whitespace-nowrap cursor-help hover:opacity-100 transition-opacity"
                                    style={{
                                        left: `${f.startBit * 23}px`,
                                        width: `${f.width * 23}px`,
                                        color: `${f.color}cc`,
                                    }}
                                    aria-label={f.name}
                                >
                                    {f.abbrev}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Scroll fade indicator */}
                <div className="absolute top-0 right-0 bottom-6 w-12 bg-gradient-to-l from-white dark:from-[#0f111a] to-transparent pointer-events-none opacity-0 group-hover/stream:opacity-100 transition-opacity duration-300" />
            </div>
        </div>
    );
};
