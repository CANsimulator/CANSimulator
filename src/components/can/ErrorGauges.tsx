import React from 'react';
import { motion } from 'framer-motion';

interface GaugeProps {
    value: number;
    max: number;
    label: string;
    color: string;
    thresholds: { value: number; label: string; color: string }[];
}

const Gauge: React.FC<GaugeProps> = ({ value, max, label, color, thresholds }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const rotation = (percentage / 100) * 180 - 90;

    // Determine danger level color
    const dangerColor = value > 255 ? '#ef4444' : value >= 128 ? '#f59e0b' : value >= 96 ? '#fb923c' : color;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-52 h-28 overflow-hidden">
                {/* Background arc track */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 65">
                    {/* Background track */}
                    <path
                        d="M 10 60 A 50 50 0 0 1 110 60"
                        fill="none"
                        stroke="#1a1a24"
                        strokeWidth="8"
                        strokeLinecap="round"
                    />

                    {/* Danger zone markers */}
                    {/* 96/255 mark (orange warning) */}
                    <path
                        d="M 10 60 A 50 50 0 0 1 110 60"
                        fill="none"
                        stroke="#fb923c"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(157 * 96) / max} 999`}
                        strokeDashoffset={`-${(157 * 96) / max}`}
                        opacity="0.08"
                    />

                    {/* 128/255 mark (yellow warning zone) */}
                    <path
                        d="M 10 60 A 50 50 0 0 1 110 60"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="8"
                        strokeDasharray={`${(157 * (255 - 128)) / max} 999`}
                        strokeDashoffset={`-${(157 * 128) / max}`}
                        opacity="0.1"
                    />

                    {/* Active progress arc */}
                    <motion.path
                        d="M 10 60 A 50 50 0 0 1 110 60"
                        fill="none"
                        stroke={dangerColor}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="157"
                        initial={{ strokeDashoffset: 157 }}
                        animate={{ strokeDashoffset: 157 - (157 * percentage) / 100 }}
                        transition={{ type: 'spring', stiffness: 40, damping: 15 }}
                    />

                    {/* Glow effect on progress */}
                    <motion.path
                        d="M 10 60 A 50 50 0 0 1 110 60"
                        fill="none"
                        stroke={dangerColor}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray="157"
                        initial={{ strokeDashoffset: 157 }}
                        animate={{ strokeDashoffset: 157 - (157 * percentage) / 100 }}
                        transition={{ type: 'spring', stiffness: 40, damping: 15 }}
                        opacity="0.15"
                        filter="blur(4px)"
                    />

                    {/* Threshold tick marks */}
                    {thresholds.map((t) => {
                        const angle = ((t.value / max) * 180 - 180) * (Math.PI / 180);
                        const cx = 60 + 50 * Math.cos(angle);
                        const cy = 60 + 50 * Math.sin(angle);
                        const ix = 60 + 42 * Math.cos(angle);
                        const iy = 60 + 42 * Math.sin(angle);
                        return (
                            <g key={t.value}>
                                <line x1={ix} y1={iy} x2={cx} y2={cy} stroke={t.color} strokeWidth="1.5" opacity="0.6" />
                                <text
                                    x={60 + 36 * Math.cos(angle)}
                                    y={60 + 36 * Math.sin(angle)}
                                    fill={t.color}
                                    fontSize="5"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    opacity="0.6"
                                >
                                    {t.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                {/* Needle */}
                <motion.div
                    className="absolute bottom-1 left-1/2 w-0.5 h-[72px] origin-bottom -translate-x-1/2 z-10"
                    animate={{ rotate: rotation }}
                    transition={{ type: 'spring', stiffness: 40, damping: 15 }}
                >
                    <div
                        className="w-full h-full rounded-full"
                        style={{
                            background: `linear-gradient(to top, white, ${dangerColor})`,
                            boxShadow: `0 0 8px ${dangerColor}`,
                        }}
                    />
                </motion.div>

                {/* Center hub */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-dark-800 border-2 z-20" style={{ borderColor: dangerColor }}>
                    <div className="absolute inset-1 rounded-full" style={{ backgroundColor: dangerColor, opacity: 0.3 }} />
                </div>
            </div>

            {/* Value Display */}
            <div className="mt-3 flex flex-col items-center">
                <motion.span
                    key={value}
                    initial={{ scale: 1.2, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-3xl font-black tracking-widest leading-none mb-1 tabular-nums"
                    style={{ color: dangerColor }}
                >
                    {value}
                </motion.span>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.25em]">{label}</span>

                {/* Threshold bar */}
                <div className="w-40 h-1.5 mt-2 rounded-full bg-dark-700 overflow-hidden relative">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: dangerColor }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ type: 'spring', stiffness: 40, damping: 15 }}
                    />
                    {/* 128 threshold marker */}
                    <div
                        className="absolute top-0 bottom-0 w-px bg-yellow-500/60"
                        style={{ left: `${(128 / max) * 100}%` }}
                    />
                    {/* 255 threshold marker */}
                    <div
                        className="absolute top-0 bottom-0 w-px bg-red-500/60"
                        style={{ left: '100%' }}
                    />
                </div>
                <div className="flex justify-between w-40 mt-1">
                    <span className="text-[8px] text-gray-600 font-mono">0</span>
                    <span className="text-[8px] text-yellow-500/60 font-mono">128</span>
                    <span className="text-[8px] text-red-500/60 font-mono">255</span>
                </div>
            </div>
        </div>
    );
};

interface ErrorGaugesProps {
    tec: number;
    rec: number;
}

export const ErrorGauges: React.FC<ErrorGaugesProps> = ({ tec, rec }) => {
    const thresholds = [
        { value: 96, label: '96', color: '#fb923c' },
        { value: 128, label: '128', color: '#f59e0b' },
        { value: 255, label: '255', color: '#ef4444' },
    ];

    return (
        <div className="flex flex-col sm:flex-row justify-around items-center gap-6 py-4">
            <Gauge value={tec} max={255} label="Transmit Error Counter" color="#00f3ff" thresholds={thresholds} />
            <div className="hidden sm:block w-px h-32 bg-dark-700" />
            <Gauge value={rec} max={255} label="Receive Error Counter" color="#bf00ff" thresholds={thresholds} />
        </div>
    );
};
