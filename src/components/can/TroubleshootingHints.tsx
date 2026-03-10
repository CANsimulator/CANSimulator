import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CANControllerState } from '../../types/can';

interface TroubleshootingHintsProps {
    state: CANControllerState;
    tec: number;
    rec: number;
}

interface Hint {
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    action?: string;
}

function getHints(state: CANControllerState, tec: number, rec: number): Hint[] {
    const hints: Hint[] = [];

    if (state === 'ERROR_ACTIVE' && tec === 0 && rec === 0) {
        hints.push({
            severity: 'info',
            title: 'System Nominal',
            message: 'The CAN controller is in Error Active state with zero error counters. All bus communication is healthy.',
        });
    }

    if (state === 'ERROR_ACTIVE' && tec > 0 && tec < 96) {
        hints.push({
            severity: 'info',
            title: 'Minor Errors Detected',
            message: `TEC is at ${tec}. The node is still fully active. Occasional errors can be caused by EMI, cable reflections, or impedance mismatches.`,
            action: 'Check physical layer: termination resistors (120 ohm), cable shielding, and connector quality.',
        });
    }

    if (state === 'ERROR_ACTIVE' && tec >= 96 && tec < 128) {
        hints.push({
            severity: 'warning',
            title: 'Approaching Error Passive Threshold',
            message: `TEC is at ${tec} (threshold: 128). The node will transition to Error Passive if errors continue. Error Passive nodes cannot send Active Error Frames.`,
            action: 'Investigate root cause immediately. Check: bit timing parameters, bus load, and oscillator tolerance.',
        });
    }

    if (state === 'ERROR_PASSIVE') {
        hints.push({
            severity: 'warning',
            title: 'Error Passive State',
            message: 'The node can only send Passive Error Frames (6 recessive bits). It must wait for "Suspend Transmission" time (8 bit periods) after losing arbitration before retransmitting.',
            action: 'Reduce bus load. Verify bit timing across all nodes. Consider using an oscilloscope to check signal integrity.',
        });
        if (tec > 200) {
            hints.push({
                severity: 'critical',
                title: 'Bus-Off Imminent',
                message: `TEC is at ${tec}. At TEC > 255, the node will enter Bus-Off and disconnect from the bus entirely.`,
                action: 'Stop injecting errors. Reset error counters or allow successful transmissions to decrement TEC.',
            });
        }
    }

    if (state === 'BUS_OFF') {
        hints.push({
            severity: 'critical',
            title: 'Bus-Off Recovery Required',
            message: 'The node is disconnected from the bus. Per ISO 11898-1, recovery requires detecting 128 occurrences of 11 consecutive recessive bits (128 x 11 = 1408 bit periods).',
            action: 'Reset the error counters to simulate recovery. In real hardware, power-cycle the node or trigger a software reset.',
        });
        hints.push({
            severity: 'info',
            title: 'Root Cause Analysis',
            message: 'Common causes of Bus-Off: persistent hardware fault (short circuit on CANH/CANL), severe EMI, incorrect baud rate, or a babbling node flooding the bus with errors.',
        });
    }

    // REC-specific hints
    if (rec >= 128) {
        hints.push({
            severity: 'warning',
            title: 'High Receiver Error Count',
            message: `REC is at ${rec}. This indicates the node is receiving corrupted frames. Other transmitting nodes may have physical layer issues.`,
            action: 'Check if other nodes on the bus have proper termination and signal levels.',
        });
    }

    return hints;
}

const SEVERITY_STYLES = {
    info: {
        border: 'border-cyber-blue/30',
        bg: 'bg-cyber-blue/5',
        icon: 'text-cyber-blue',
        title: 'text-cyber-blue',
        accentBar: 'bg-cyber-blue',
    },
    warning: {
        border: 'border-yellow-500/30',
        bg: 'bg-yellow-500/5',
        icon: 'text-yellow-400',
        title: 'text-yellow-400',
        accentBar: 'bg-yellow-500',
    },
    critical: {
        border: 'border-red-500/30',
        bg: 'bg-red-500/5',
        icon: 'text-red-400',
        title: 'text-red-400',
        accentBar: 'bg-red-500',
    },
};

const SeverityIcon: React.FC<{ severity: 'info' | 'warning' | 'critical' }> = ({ severity }) => {
    if (severity === 'info') {
        return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
    }
    if (severity === 'warning') {
        return (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        );
    }
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
};

export const TroubleshootingHints: React.FC<TroubleshootingHintsProps> = ({ state, tec, rec }) => {
    const hints = getHints(state, tec, rec);

    return (
        <div className="space-y-3">
            <AnimatePresence mode="popLayout">
                {hints.map((hint, i) => {
                    const styles = SEVERITY_STYLES[hint.severity];
                    return (
                        <motion.div
                            key={`${hint.title}-${state}`}
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.3, delay: i * 0.05 }}
                            className={`relative rounded-xl border ${styles.border} ${styles.bg} overflow-hidden`}
                        >
                            {/* Left accent bar */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.accentBar}`} />

                            <div className="pl-5 pr-4 py-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className={styles.icon}>
                                        <SeverityIcon severity={hint.severity} />
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${styles.title}`}>
                                        {hint.title}
                                    </span>
                                    <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${styles.bg} ${styles.title} border ${styles.border}`}>
                                        {hint.severity}
                                    </span>
                                </div>
                                <p className="text-[10px] leading-relaxed text-gray-400 font-medium">
                                    {hint.message}
                                </p>
                                {hint.action && (
                                    <div className="mt-2 flex items-start gap-1.5">
                                        <svg className="w-3 h-3 text-cyber-green mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                        <p className="text-[10px] leading-relaxed text-cyber-green/80 font-medium">
                                            {hint.action}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};
