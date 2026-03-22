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

    return (
        <motion.div
            layout
            className={`relative rounded-2xl border-2 transition-all duration-500 overflow-hidden ${
                isActive ? '' : 'opacity-30 grayscale border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/30'
            }`}
            style={{
                borderColor: isActive ? config.color : undefined,
                backgroundColor: isActive ? `${config.color}${document.documentElement.classList.contains('dark') ? '08' : '10'}` : undefined,
            }}
            animate={isActive ? { scale: 1.02 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
        >
            {/* Active glow pulse */}
            {isActive && !shouldReduceMotion && (
                <motion.div
                    className="absolute -inset-px rounded-2xl pointer-events-none"
                    style={{ boxShadow: `0 0 30px ${config.color}30, inset 0 0 30px ${config.color}08` }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}

            {/* Top accent strip */}
            <div
                className="h-1 w-full"
                style={{ backgroundColor: isActive ? config.color : (document.documentElement.classList.contains('dark') ? '#1a1a24' : '#e2e8f0') }}
            />

            <div className="p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                     <div
                        className="p-2 rounded-lg"
                        style={{
                            backgroundColor: isActive ? `${config.color}15` : (document.documentElement.classList.contains('dark') ? '#131318' : '#f1f5f9'),
                            color: isActive ? config.color : (document.documentElement.classList.contains('dark') ? '#4b5563' : '#64748b'),
                        }}
                    >
                        {config.icon}
                    </div>
                    <div>
                         <h3
                            className="text-xs font-black uppercase tracking-widest"
                            style={{ color: isActive ? config.color : (document.documentElement.classList.contains('dark') ? '#6b7280' : '#475569') }}
                        >
                            {config.label}
                        </h3>
                        {isActive && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                 className="inline-block text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1"
                                style={{
                                    backgroundColor: `${config.color}20`,
                                    color: config.color,
                                    border: `1px solid ${config.color}40`,
                                }}
                            >
                                Current State
                            </motion.span>
                        )}
                    </div>
                </div>

                {/* Description */}
                <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400 font-medium mb-3">
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
                                    style={{ backgroundColor: config.color }}
                                />
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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

    return (
        <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-1 ${isVertical ? 'py-1' : 'px-1'}`}>
            <div
                className={`${isVertical ? 'h-6 w-0.5' : 'w-8 h-0.5'} rounded-full transition-all duration-500`}
                 style={{
                    backgroundColor: isActive ? color : (document.documentElement.classList.contains('dark') ? '#1a1a24' : '#e2e8f0'),
                    boxShadow: isActive ? `0 0 8px ${color}` : 'none',
                }}
            />
            <span
                className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors duration-500"
                style={{ color: isActive ? color : (document.documentElement.classList.contains('dark') ? '#4b5563' : '#94a3b8') }}
            >
                {label}
            </span>
            <div className={`flex items-center ${isVertical ? 'rotate-90' : ''}`}>
                 <svg
                    className="w-3 h-3 transition-colors duration-500"
                    style={{ color: isActive ? color : (document.documentElement.classList.contains('dark') ? '#1a1a24' : '#e2e8f0') }}
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

            {/* Mobile/Tablet: vertical layout */}
            <div className="lg:hidden flex flex-col items-center gap-1">
                <div className="w-full max-w-sm">
                    <StateCard stateKey="ERROR_ACTIVE" isActive={state === 'ERROR_ACTIVE'} />
                </div>
                <TransitionArrow
                    label={`TEC/REC ${'\u2265'} 128`}
                    isActive={passiveReached}
                    color="#bf00ff"
                    direction="down"
                />
                <div className="w-full max-w-sm">
                    <StateCard stateKey="ERROR_PASSIVE" isActive={state === 'ERROR_PASSIVE'} />
                </div>
                <TransitionArrow
                    label="TEC > 255"
                    isActive={busOffReached}
                    color="#ef4444"
                    direction="down"
                />
                <div className="w-full max-w-sm">
                    <StateCard stateKey="BUS_OFF" isActive={state === 'BUS_OFF'} />
                </div>
            </div>
        </div>
    );
};
