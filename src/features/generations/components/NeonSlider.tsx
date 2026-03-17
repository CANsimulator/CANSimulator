import { useCallback, useRef, useState } from 'react';
import { cn } from '../../../utils/cn';

interface NeonSliderProps {
    min: number;
    max: number;
    value: number;
    onChange: (value: number) => void;
    /** Label text shown above the slider */
    label: string;
    /** Display suffix for the value (e.g. "bytes", "Hz") */
    valueSuffix?: string;
    /** Accent color class for the filled track glow */
    accentClass?: string;
    className?: string;
}

/**
 * Custom-styled range slider with cyber/neon aesthetic.
 * Features: glowing filled track, pulsing thumb, value tooltip on hover.
 */
export function NeonSlider({
    min,
    max,
    value,
    onChange,
    label,
    valueSuffix = '',
    accentClass = 'bg-cyan-400',
    className,
}: NeonSliderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);
    const percent = ((value - min) / (max - min)) * 100;

    const resolveValue = useCallback(
        (clientX: number) => {
            const track = trackRef.current;
            if (!track) return;
            const rect = track.getBoundingClientRect();
            const rawPercent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const stepped = Math.round(min + rawPercent * (max - min));
            onChange(stepped);
        },
        [min, max, onChange]
    );

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        resolveValue(e.clientX);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        resolveValue(e.clientX);
    };

    const handlePointerUp = () => {
        setIsDragging(false);
    };

    // Load-based color gradient: cyan → yellow → red
    const getLoadColor = () => {
        if (percent > 80) return 'from-red-500 to-red-400';
        if (percent > 50) return 'from-yellow-500 to-amber-400';
        return 'from-cyan-500 to-cyan-400';
    };

    return (
        <div className={cn('rounded-xl border border-white/10 bg-black/30 p-4', className)}>
            <div className="mb-3 flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    {label}
                </label>
                <span
                    className={cn(
                        'rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-sm font-bold text-white transition-all duration-150',
                        isDragging && 'border-cyan-400/40 text-cyan-200 shadow-[0_0_8px_rgba(0,243,255,0.2)]'
                    )}
                >
                    {value}
                    {valueSuffix && <span className="ml-1 text-xs text-gray-400">{valueSuffix}</span>}
                </span>
            </div>

            {/* Custom track */}
            <div
                ref={trackRef}
                className="group relative h-3 cursor-pointer rounded-full bg-white/[0.06]"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                role="slider"
                aria-label={label}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        onChange(Math.min(max, value + 1));
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        onChange(Math.max(min, value - 1));
                    }
                }}
            >
                {/* Filled track */}
                <div
                    className={cn(
                        'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-75',
                        getLoadColor()
                    )}
                    style={{ width: `${percent}%` }}
                />

                {/* Glow behind filled track */}
                <div
                    className={cn(
                        'absolute inset-y-0 left-0 rounded-full blur-sm transition-all duration-75',
                        accentClass,
                        'opacity-30'
                    )}
                    style={{ width: `${percent}%` }}
                />

                {/* Thumb */}
                <div
                    className={cn(
                        'absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-white/80 bg-dark-950 transition-all duration-100',
                        isDragging
                            ? 'scale-125 shadow-[0_0_12px_rgba(0,243,255,0.5)]'
                            : 'shadow-[0_0_6px_rgba(0,243,255,0.3)] group-hover:scale-110'
                    )}
                    style={{ left: `calc(${percent}% - 10px)` }}
                />
            </div>

            {/* Scale labels */}
            <div className="mt-2 flex justify-between text-[9px] font-semibold text-gray-600">
                <span>{min}</span>
                <span>{max}</span>
            </div>
        </div>
    );
}
