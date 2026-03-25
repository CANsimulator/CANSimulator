import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ErrorStateMachineProps {
    state: 'ERROR_ACTIVE' | 'ERROR_PASSIVE' | 'BUS_OFF';
    tec: number;
    rec: number;
}

const STATE_CONFIG = {
    ERROR_ACTIVE: {
        label: 'Error Active',
        color: '#00f3ff',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        description: 'Full bus participation. Sends Active Error Frames (dominant bits) to flag protocol violations.',
        capabilities: ['Transmit data frames', 'Send Active Error Frames', 'Win arbitration normally'],
    },
    ERROR_PASSIVE: {
        label: 'Error Passive',
        color: '#bf00ff',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
        description: 'Limited bus access. Sends Passive Error Frames (recessive bits). Must wait extra time after losing arbitration.',
        capabilities: ['Transmit with restrictions', 'Send Passive Error Frames only', 'Suspend transmission delay'],
    },
    BUS_OFF: {
        label: 'Bus Off',
        color: '#ef4444',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
        ),
        description: 'Completely disconnected from the bus. Cannot transmit or receive. Requires recovery sequence.',
        capabilities: ['No bus access', 'No error signaling', 'Recovery: 128 x 11 recessive bits'],
    },
};

const StateCard: React.FC<{
    stateKey: 'ERROR_ACTIVE' | 'ERROR_PASSIVE' | 'BUS_OFF';
    isActive: boolean;
}> = ({ stateKey, isActive }) => {
    const config = STATE_CONFIG[stateKey];
    const shouldReduceMotion = useReducedMotion();
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    // WCAG AAA compliant colors for light mode
    const contrastColor = isActive 
        ? (isDark ? config.color : (stateKey === 'ERROR_ACTIVE' ? '#0891b2' : stateKey === 'ERROR_PASSIVE' ? '#9333ea' : '#dc2626'))
        : (isDark ? '#6b7280' : '#475569');

    return (
        <motion.div
            layout
            role="article"
            aria-current={isActive ? 'step' : undefined}
            aria-label={`Controller state: ${config.label}`}
            className={`relative rounded-2xl border-2 transition-all duration-500 overflow-hidden ${
                isActive ? '' : 'opacity-30 grayscale border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/30'
            }`}
            style={{
                borderColor: isActive ? contrastColor : undefined,
                backgroundColor: isActive ? `${contrastColor}${isDark ? '08' : '05'}` : undefined,
            }}
            animate={isActive ? { scale: 1.02 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
        >
            {/* Active glow pulse */}
            {isActive && !shouldReduceMotion && (
                <motion.div
                    className="absolute -inset-px rounded-2xl pointer-events-none"
                    style={{ boxShadow: `0 0 30px ${contrastColor}30, inset 0 0 30px ${contrastColor}08` }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}

            {/* Top accent strip */}
            <div
                className="h-1 w-full"
                style={{ backgroundColor: isActive ? contrastColor : (isDark ? '#1a1a24' : '#e2e8f0') }}
            />

            <div className="p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                     <div
                        className="p-2 rounded-lg"
                        style={{
                            backgroundColor: isActive ? `${contrastColor}15` : (isDark ? '#131318' : '#f1f5f9'),
                            color: isActive ? contrastColor : (isDark ? '#4b5563' : '#64748b'),
                        }}
                        aria-hidden="true"
                    >
                        {config.icon}
                    </div>
                    <div>
                         <h3
                            className="text-xs font-black uppercase tracking-widest"
                            style={{ color: contrastColor }}
                        >
                            {config.label}
                        </h3>
                        {isActive && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                className="inline-block text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mt-1.5"
                                style={{
                                    backgroundColor: `${contrastColor}20`,
                                    color: contrastColor,
                                    border: `1px solid ${contrastColor}40`,
                                }}
                            >
                                Current State
                            </motion.span>
                        )}
                    </div>
                </div>

                {/* Description */}
                 <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-400 font-bold mb-3">
                    {config.description}
                </p>

                {/* Capabilities */}
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-1.5"
                    >
                        {config.capabilities.map((cap) => (
                            <div key={cap} className="flex items-center gap-2">
                                <div
                                    className="w-1 h-1 rounded-full"
                                    style={{ backgroundColor: contrastColor }}
                                />
                                 <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                    {cap}
                                </span>
                            </div>
                        ))}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

const TransitionArrow: React.FC<{
    label: string;
    isActive: boolean;
    color: string;
    direction?: 'right' | 'down';
}> = ({ label, isActive, color, direction = 'right' }) => {
    const isVertical = direction === 'down';
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    
    // Adjust color for light mode contrast
    const displayColor = isActive && !isDark ? (color === '#bf00ff' ? '#9333ea' : color === '#ef4444' ? '#dc2626' : color) : color;

    return (
        <div 
            className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-1 ${isVertical ? 'py-1' : 'px-1'}`}
            role="separator"
            aria-label={`State transition: ${label}`}
        >
            <div
                className={`${isVertical ? 'h-6 w-0.5' : 'w-8 h-0.5'} rounded-full transition-all duration-500`}
                 style={{
                    backgroundColor: isActive ? displayColor : (isDark ? '#1a1a24' : '#e2e8f0'),
                    boxShadow: isActive ? `0 0 8px ${displayColor}` : 'none',
                }}
            />
             <span
                className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-colors duration-500"
                style={{ color: isActive ? displayColor : (isDark ? '#4b5563' : '#94a3b8') }}
            >
                {label}
            </span>
            <div className={`flex items-center ${isVertical ? 'rotate-90' : ''}`} aria-hidden="true">
                 <svg
                    className="w-3 h-3 transition-colors duration-500"
                    style={{ color: isActive ? displayColor : (isDark ? '#1a1a24' : '#e2e8f0') }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
    );
};

export const ErrorStateMachine: React.FC<ErrorStateMachineProps> = ({ state }) => {
    const passiveReached = state === 'ERROR_PASSIVE' || state === 'BUS_OFF';
    const busOffReached = state === 'BUS_OFF';

    return (
        <div className="w-full">
            {/* Desktop: horizontal layout */}
            <div className="hidden lg:flex items-stretch gap-2 justify-center">
                <div className="flex-1 max-w-[280px]">
                    <StateCard stateKey="ERROR_ACTIVE" isActive={state === 'ERROR_ACTIVE'} />
                </div>
                <div className="flex items-center">
                    <TransitionArrow
                        label={`TEC/REC ${'\u2265'} 128`}
                        isActive={passiveReached}
                        color="#bf00ff"
                    />
                </div>
                <div className="flex-1 max-w-[280px]">
                    <StateCard stateKey="ERROR_PASSIVE" isActive={state === 'ERROR_PASSIVE'} />
                </div>
                <div className="flex items-center">
                    <TransitionArrow
                        label="TEC > 255"
                        isActive={busOffReached}
                        color="#ef4444"
                    />
                </div>
                <div className="flex-1 max-w-[280px]">
                    <StateCard stateKey="BUS_OFF" isActive={state === 'BUS_OFF'} />
                </div>
            </div>

            {/* Mobile/Tablet: vertical layout on smallest screens, grid on tablets */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StateCard stateKey="ERROR_ACTIVE" isActive={state === 'ERROR_ACTIVE'} />
                <StateCard stateKey="ERROR_PASSIVE" isActive={state === 'ERROR_PASSIVE'} />
                <StateCard stateKey="BUS_OFF" isActive={state === 'BUS_OFF'} />
            </div>
        </div>
    );
};
