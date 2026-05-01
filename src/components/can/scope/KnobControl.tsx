import React, { useRef, useCallback } from 'react';

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
    const s = polarToCartesian(cx, cy, r, endDeg);
    const e = polarToCartesian(cx, cy, r, startDeg);
    const largeArc = (endDeg - startDeg) <= 180 ? 0 : 1;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 0 ${e.x} ${e.y}`;
}

interface KnobProps {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (v: number) => void;
    label: string;
    valueLabel?: string;
    color?: string;
    size?: number;
    options?: number[];
}

export const KnobControl: React.FC<KnobProps> = ({
    value, min = 0, max = 100, step = 1, onChange,
    label, valueLabel, color = 'var(--accent)', size = 70, options,
}) => {
    const startRef = useRef<{ startY: number; startV: number } | null>(null);

    const v = options ? options.indexOf(value) : value;
    const lo = options ? 0 : min;
    const hi = options ? options.length - 1 : max;
    const range = hi - lo;
    const norm = Math.max(0, Math.min(1, (v - lo) / (range || 1)));
    const angle = -135 + norm * 270;
    const tickCount = options ? options.length : 11;

    const ticks = Array.from({ length: tickCount }, (_, i) => {
        const t = i / (tickCount - 1);
        return { a: -135 + t * 270, active: t <= norm + 1e-6 };
    });

    const onDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const range = hi - lo;
        startRef.current = { startY, startV: v };

        const move = (ev: MouseEvent | TouchEvent) => {
            if (!startRef.current) return;
            const y = 'touches' in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
            const dy = startRef.current.startY - y;
            let nv = startRef.current.startV + (dy / 140) * range;
            if (options) {
                onChange(options[Math.round(Math.max(0, Math.min(hi, nv)))]);
            } else {
                nv = Math.round(Math.max(lo, Math.min(hi, nv)) / step) * step;
                onChange(parseFloat(nv.toFixed(4)));
            }
        };
        const up = () => {
            startRef.current = null;
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchmove', move);
            window.removeEventListener('touchend', up);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', up);
    }, [v, lo, hi, step, options, onChange]);

    const onWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const dir = e.deltaY > 0 ? -1 : 1;
        if (options) {
            const idx = Math.max(0, Math.min(options.length - 1, options.indexOf(value) + dir));
            onChange(options[idx]);
        } else {
            const nv = Math.max(lo, Math.min(hi, value + dir * step));
            onChange(parseFloat(nv.toFixed(4)));
        }
    }, [value, lo, hi, step, options, onChange]);

    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
        let dir = 0;
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') dir = 1;
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') dir = -1;
        if (e.key === 'PageUp') dir = 5;
        if (e.key === 'PageDown') dir = -5;
        if (e.key === 'Home') dir = -range;
        if (e.key === 'End') dir = range;

        if (dir !== 0) {
            e.preventDefault();
            if (options) {
                const curIdx = options.indexOf(value);
                const nextIdx = Math.max(0, Math.min(options.length - 1, curIdx + (dir > 1 ? 1 : dir < -1 ? -1 : dir)));
                onChange(options[nextIdx]);
            } else {
                const nv = Math.max(lo, Math.min(hi, value + dir * step));
                onChange(parseFloat(nv.toFixed(4)));
            }
        }
    }, [value, lo, hi, step, options, onChange, range]);

    return (
        <div className="osc-knob-ctl">
            <div
                className="osc-knob-wrap focus-ring-cyber"
                style={{ width: size, height: size }}
                onMouseDown={onDown}
                onTouchStart={onDown}
                onWheel={onWheel}
                onKeyDown={onKeyDown}
                role="slider"
                aria-valuemin={lo}
                aria-valuemax={hi}
                aria-valuenow={v}
                aria-valuetext={valueLabel ?? value.toString()}
                aria-label={label}
                tabIndex={0}
            >
                <svg className="osc-knob-ticks" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {ticks.map((t, i) => {
                        const rad = (t.a - 90) * Math.PI / 180;
                        const r1 = size / 2 - 2;
                        const r2 = size / 2 - (t.active ? 9 : 7);
                        const cx = size / 2, cy = size / 2;
                        return (
                            <line key={i}
                                x1={cx + Math.cos(rad) * r2} y1={cy + Math.sin(rad) * r2}
                                x2={cx + Math.cos(rad) * r1} y2={cy + Math.sin(rad) * r1}
                                stroke={t.active ? color : 'var(--stroke-2)'}
                                strokeWidth={t.active ? 2 : 1}
                                strokeLinecap="round"
                            />
                        );
                    })}
                    <path
                        d={describeArc(size / 2, size / 2, size / 2 - 12, -135, angle)}
                        stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                    />
                </svg>
                <div className="osc-knob-dial" style={{ transform: `rotate(${angle}deg)` }}>
                    <div className="osc-knob-pointer" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    <div className="osc-knob-grip" />
                </div>
            </div>
            <div className="osc-knob-meta">
                <div className="osc-knob-val" style={{ color }} aria-live="polite">{valueLabel ?? value}</div>
                <div className="osc-knob-lbl">{label}</div>
            </div>
        </div>
    );
};

interface RockerProps {
    on: boolean;
    color: string;
    label: string;
    onChange: (v: boolean) => void;
}

export const RockerSwitch: React.FC<RockerProps> = ({ on, color, label, onChange }) => (
    <div className="osc-rocker-container">
        <button
            type="button"
            className={`osc-rocker ${on ? 'on' : ''} focus-ring-cyber`}
            style={{ '--chc': color } as React.CSSProperties}
            onClick={() => onChange(!on)}
            role="switch"
            aria-checked={on}
            aria-label={label}
        >
            <div className="osc-rocker-body">
                <div className="osc-rocker-knob" />
            </div>
        </button>
        <div className="osc-rocker-lbl" aria-hidden="true">{label}</div>
    </div>
);
