import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CANErrorCode } from '../../types/can';
import { canSimulator } from '../../services/can/can-simulator';
import type { ErrorRole } from '../../services/can/can-simulator';

interface ErrorDef {
    code: CANErrorCode;
    label: string;
    desc: string;
    detail: string;
    color: string;
    colorHex: string;
    icon: React.ReactNode;
}

const errors: ErrorDef[] = [
    {
        code: 'BIT1',
        label: 'Bit (1)',
        desc: 'Sent 1, saw 0',
        detail: 'Transmitter sent recessive (1) but monitored dominant (0) on the bus.',
        color: 'red',
        colorHex: '#ef4444',
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 4l16 16M4 20L20 4" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        code: 'BIT0',
        label: 'Bit (0)',
        desc: 'Sent 0, saw 1',
        detail: 'Transmitter sent dominant (0) but monitored recessive (1). Possible driver fault.',
        color: 'orange',
        colorHex: '#f97316',
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v4" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        code: 'STUFF',
        label: 'Stuff',
        desc: '6+ identical bits',
        detail: 'Detected 6 consecutive bits of the same polarity, violating the bit stuffing rule.',
        color: 'yellow',
        colorHex: '#eab308',
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 12h4l2-8 4 16 2-8h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        code: 'CRC',
        label: 'CRC',
        desc: 'Checksum mismatch',
        detail: 'Computed CRC does not match the CRC field in the received frame.',
        color: 'purple',
        colorHex: '#a855f7',
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="3" y="3" width="18" height="18" rx="3" />
            </svg>
        ),
    },
    {
        code: 'FORM',
        label: 'Form',
        desc: 'Fixed field violation',
        detail: 'A fixed-form bit field (CRC delimiter, ACK delimiter, EOF) contained an invalid bit value.',
        color: 'blue',
        colorHex: '#3b82f6',
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M4 10h16M10 4v16" />
            </svg>
        ),
    },
    {
        code: 'ACK',
        label: 'ACK',
        desc: 'No ACK detected',
        detail: 'No receiver acknowledged the frame during the ACK slot. The node may be alone on the bus.',
        color: 'cyan',
        colorHex: '#06b6d4',
        icon: (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M8 12h8M12 16V8" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" />
            </svg>
        ),
    },
];

export const ErrorInjectionPanel: React.FC = () => {
    const [lastInjected, setLastInjected] = useState<string | null>(null);
    const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
    const [hoveredCode, setHoveredCode] = useState<string | null>(null);
    const [selectedCode, setSelectedCode] = useState<string | null>(null);
    const [role, setRole] = useState<ErrorRole>('transmitter');

    const handleError = useCallback((code: CANErrorCode) => {
        canSimulator.injectError(code, role);
        setLastInjected(code);
        setClickCounts(prev => ({ ...prev, [code]: (prev[code] || 0) + 1 }));
        setSelectedCode(code); // Select on click for persistent info

        setTimeout(() => setLastInjected(null), 600);
    }, [role]);

    return (
        <div className="space-y-4">
            {/* Role toggle — Transmitter vs Receiver */}
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Error Source</span>
                <div className="flex rounded-lg overflow-hidden border border-dark-700">
                    {(['transmitter', 'receiver'] as ErrorRole[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setRole(r)}
                            className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-200"
                            style={{
                                backgroundColor: role === r ? (r === 'transmitter' ? '#ef444420' : '#3b82f620') : 'transparent',
                                color: role === r ? (r === 'transmitter' ? '#ef4444' : '#3b82f6') : '#6b7280',
                                borderRight: r === 'transmitter' ? '1px solid #1a1a24' : 'none',
                            }}
                        >
                            {r === 'transmitter' ? 'TX (TEC +8)' : 'RX (REC +1/+8)'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                {errors.map((err) => {
                    const isActive = lastInjected === err.code;
                    const count = clickCounts[err.code] || 0;
                    const isHovered = hoveredCode === err.code;
                    const isSelected = selectedCode === err.code;

                    return (
                        <motion.button
                            key={err.code}
                            onClick={() => handleError(err.code)}
                            onMouseEnter={() => setHoveredCode(err.code)}
                            onMouseLeave={() => setHoveredCode(null)}
                            onFocus={() => setHoveredCode(err.code)}
                            onBlur={() => setHoveredCode(null)}
                            whileTap={{ scale: 0.95 }}
                            className="group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 bg-dark-900/50 transition-all duration-300 overflow-hidden"
                            style={{
                                borderColor: isActive ? err.colorHex : isSelected ? `${err.colorHex}A0` : isHovered ? `${err.colorHex}60` : '#1a1a24',
                                boxShadow: isActive ? `0 0 25px ${err.colorHex}40` : (isSelected ? `0 0 10px ${err.colorHex}20` : 'none'),
                            }}
                        >
                            {/* Ripple effect on click */}
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0.6 }}
                                        animate={{ scale: 3, opacity: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.6 }}
                                        className="absolute inset-0 rounded-2xl"
                                        style={{ backgroundColor: err.colorHex }}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Top accent bar */}
                            <div
                                className="absolute top-0 inset-x-0 h-0.5 transition-all duration-300"
                                style={{
                                    backgroundColor: err.colorHex,
                                    opacity: isHovered ? 1 : 0.2,
                                    boxShadow: isHovered ? `0 0 10px ${err.colorHex}` : 'none',
                                }}
                            />

                            {/* Icon */}
                            <div
                                className="mb-2 transition-colors duration-300"
                                style={{ color: isHovered ? err.colorHex : '#6b7280' }}
                            >
                                {err.icon}
                            </div>

                            {/* Label */}
                            <span
                                className="text-xs font-black tracking-widest uppercase mb-0.5 transition-colors duration-300"
                                style={{ color: isHovered ? err.colorHex : '#ffffff' }}
                            >
                                {err.label}
                            </span>

                            {/* Description */}
                            <span className="text-[9px] font-medium text-gray-500 uppercase tracking-tighter group-hover:text-gray-400 transition-colors text-center">
                                {err.desc}
                            </span>

                            {/* Injection counter badge */}
                            {count > 0 && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-2 right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[8px] font-black"
                                    style={{
                                        backgroundColor: `${err.colorHex}20`,
                                        color: err.colorHex,
                                        border: `1px solid ${err.colorHex}40`,
                                    }}
                                >
                                    {count}
                                </motion.div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Detail tooltip for hovered or selected error */}
            <AnimatePresence mode="wait">
                {(hoveredCode || selectedCode) && (
                    <motion.div
                        key={hoveredCode || selectedCode}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="px-4 py-3 rounded-xl bg-dark-800/80 border border-dark-700 backdrop-blur-sm"
                    >
                        <p className="text-[11px] leading-relaxed text-gray-400 font-medium">
                            <span className="font-black text-white uppercase tracking-wider">
                                {errors.find(e => e.code === (hoveredCode || selectedCode))?.label}:
                            </span>{' '}
                            {errors.find(e => e.code === (hoveredCode || selectedCode))?.detail}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
