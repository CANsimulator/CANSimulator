import React, { useState, useEffect } from 'react';
import { canSimulator } from '../services/can/can-simulator';
import type { CANErrorState } from '../services/can/can-simulator';
import { ErrorGauges } from '../components/can/ErrorGauges';
import { ErrorStateMachine } from '../components/can/ErrorStateMachine';
import { ErrorInjectionPanel } from '../components/can/ErrorInjectionPanel';
import { ErrorLogPanel } from '../components/can/ErrorLogPanel';
import { TroubleshootingHints } from '../components/can/TroubleshootingHints';
import { ErrorTypeDeepDive } from '../components/can/ErrorTypeDeepDive';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const ErrorPage: React.FC = () => {
    const [errorState, setErrorState] = useState<CANErrorState>(canSimulator.getErrorState());
    const [activeTab, setActiveTab] = useState<'log' | 'hints'>('log');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const shouldReduceMotion = useReducedMotion();

    useEffect(() => {
        const unsubscribe = canSimulator.subscribe({
            onMessage: () => { },
            onStateChange: (state) => setErrorState(state),
        });
        return () => unsubscribe();
    }, []);

    const handleReset = () => {
        canSimulator.resetErrors();
        setShowResetConfirm(false);
    };

    const stateColor = errorState.state === 'ERROR_ACTIVE' ? '#00f3ff'
        : errorState.state === 'ERROR_PASSIVE' ? '#bf00ff'
            : '#ef4444';

    const stateLabel = errorState.state.replace(/_/g, ' ');

    return (
        <div className="container mx-auto px-4 py-6 space-y-6 max-w-[1600px]">
            {/* === HEADER === */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl sm:text-4xl font-black text-dark-950 dark:text-white uppercase tracking-tight leading-none">
                            Protocol Fault &amp; <span className="text-cyber-blue">Error Management</span>
                        </h1>
                        {/* Live state badge */}
                        <motion.div
                            key={errorState.state}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest"
                            style={{
                                borderColor: `${stateColor}40`,
                                backgroundColor: `${stateColor}10`,
                                color: stateColor,
                            }}
                        >
                            <motion.div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: stateColor }}
                                animate={{ opacity: shouldReduceMotion ? 0.7 : [1, 0.3, 1] }}
                                transition={{ duration: 1.5, repeat: shouldReduceMotion ? 0 : Infinity }}
                            />
                            {stateLabel}
                        </motion.div>
                    </div>
                     <p className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-[0.3em] transition-colors">
                        CAN Error State Machine Simulator &middot; ISO 11898-1 Fault Confinement
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Quick stats */}
                     <div className="hidden md:flex items-center gap-4 mr-4">
                        <div className="text-right">
                            <div className="text-[9px] font-black text-gray-700 dark:text-gray-500 uppercase tracking-widest transition-colors">TEC</div>
                            <div className="text-lg font-black tabular-nums transition-colors" style={{ color: errorState.tec >= 128 ? '#f59e0b' : '#00f3ff' }}>
                                {errorState.tec}
                            </div>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-dark-700 transition-colors" />
                        <div className="text-right">
                            <div className="text-[9px] font-black text-gray-700 dark:text-gray-500 uppercase tracking-widest transition-colors">REC</div>
                            <div className="text-lg font-black tabular-nums transition-colors" style={{ color: errorState.rec >= 128 ? '#f59e0b' : '#bf00ff' }}>
                                {errorState.rec}
                            </div>
                        </div>
                    </div>

                    {/* Reset button */}
                    <div className="relative">
                        {!showResetConfirm ? (
                            <button
                                onClick={() => {
                                    if (errorState.tec === 0 && errorState.rec === 0) return;
                                    setShowResetConfirm(true);
                                }}
                                disabled={errorState.tec === 0 && errorState.rec === 0}
                                className="px-5 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 hover:border-red-500/50 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Reset Counters
                            </button>
                        ) : (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-2"
                            >
                                <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Confirm?</span>
                                <button
                                    onClick={handleReset}
                                    className="px-3 py-1.5 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500/30 transition-all"
                                >
                                    Yes, Reset
                                </button>
                                 <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="px-3 py-1.5 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-700 text-gray-600 dark:text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:text-gray-950 dark:hover:text-gray-300 transition-all shadow-sm"
                                >
                                    Cancel
                                </button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* === STATE MACHINE (Full Width) === */}
             <section className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-dark-900/80 border border-gray-200 dark:border-dark-700 backdrop-blur-sm transition-all duration-300 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[10px] font-black text-cyber-purple uppercase tracking-widest px-2 border-l-2 border-cyber-purple">
                        Controller State Machine
                    </h2>
                    <span className="text-[9px] font-black text-gray-600 dark:text-gray-600 uppercase tracking-wider transition-colors">
                        ISO 11898-1 Fault Confinement
                    </span>
                </div>
                <ErrorStateMachine state={errorState.state} tec={errorState.tec} rec={errorState.rec} />

                <AnimatePresence mode="wait">
                    {errorState.state === 'BUS_OFF' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center max-w-2xl mx-auto"
                        >
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <motion.div
                                    className="w-2 h-2 rounded-full bg-red-500"
                                    animate={{ opacity: shouldReduceMotion ? 0.6 : [1, 0.2, 1] }}
                                    transition={{ duration: 0.8, repeat: shouldReduceMotion ? 0 : Infinity }}
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Bus-Off Detected</span>
                                <motion.div
                                    className="w-2 h-2 rounded-full bg-red-500"
                                    animate={{ opacity: shouldReduceMotion ? 0.6 : [1, 0.2, 1] }}
                                    transition={{ duration: 0.8, repeat: shouldReduceMotion ? 0 : Infinity, delay: 0.4 }}
                                />
                            </div>
                                  <p className="text-[10px] text-red-700 dark:text-red-400/70 font-black leading-relaxed max-w-lg mx-auto transition-colors">
                                The node has reached TEC {'>'} 255 and is physically disconnected from the bus.
                                Recovery requires 128 occurrences of 11 consecutive recessive bits.
                                Click "Reset Counters" to simulate recovery.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>

            {/* === ERROR TYPE DEEP-DIVE (Educational) === */}
            <ErrorTypeDeepDive />

            {/* === GAUGES + INJECTION (Two Columns) === */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* Gauges */}
                <div className="xl:col-span-2 p-5 sm:p-6 rounded-2xl bg-white dark:bg-dark-900/80 border border-gray-200 dark:border-dark-700 backdrop-blur-sm flex flex-col justify-center transition-colors duration-300">
                    <h2 className="text-[10px] font-black text-cyber-blue uppercase tracking-widest mb-4 px-2 border-l-2 border-cyber-blue">
                        TEC / REC Dashboard
                    </h2>
                    <ErrorGauges tec={errorState.tec} rec={errorState.rec} />
                </div>

                {/* Error Injection */}
                 <div className="xl:col-span-3 p-5 sm:p-6 rounded-2xl bg-white dark:bg-dark-900/80 border border-gray-200 dark:border-dark-700 backdrop-blur-sm transition-all duration-300 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                          <h2 className="text-[10px] font-black text-dark-950 dark:text-white uppercase tracking-widest border-l-2 border-dark-950 dark:border-white px-2">
                            Error Injection Console
                        </h2>
                        <span className="text-[9px] text-gray-600 dark:text-gray-600 uppercase font-black tracking-wider transition-colors">
                            Click to inject protocol violation &middot; TEC +8
                        </span>
                    </div>
                    <ErrorInjectionPanel />
                </div>
            </div>

            {/* === ERROR LOG + TROUBLESHOOTING (Two Columns with Tabs) === */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Error Log / Troubleshooting (Tabbed) */}
                <div className="xl:col-span-2 p-5 sm:p-6 rounded-2xl bg-white dark:bg-dark-900/80 border border-gray-200 dark:border-dark-700 backdrop-blur-sm transition-colors duration-300">
                    <div role="tablist" aria-label="Error information" className="flex items-center gap-4 mb-4" onKeyDown={(e) => {
                        if (e.key === 'ArrowRight') setActiveTab('hints');
                        if (e.key === 'ArrowLeft') setActiveTab('log');
                    }}>
                         <button
                            role="tab"
                            id="tab-error-log"
                            aria-selected={activeTab === 'log'}
                            aria-controls="tabpanel-error-log"
                            onClick={() => setActiveTab('log')}
                            tabIndex={activeTab === 'log' ? 0 : -1}
                            className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 border-b-2 transition-all ${activeTab === 'log'
                                    ? 'border-cyber-blue text-cyber-blue'
                                    : 'border-transparent text-gray-500 hover:text-dark-950 dark:hover:text-gray-300'
                                }`}
                        >
                            Error Log
                        </button>
                        <button
                            role="tab"
                            id="tab-troubleshooting"
                            aria-selected={activeTab === 'hints'}
                            aria-controls="tabpanel-troubleshooting"
                            onClick={() => setActiveTab('hints')}
                            tabIndex={activeTab === 'hints' ? 0 : -1}
                            className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 border-b-2 transition-all ${activeTab === 'hints'
                                    ? 'border-cyber-green text-emerald-700 dark:text-cyber-green'
                                    : 'border-transparent text-gray-500 hover:text-dark-950 dark:hover:text-gray-300'
                                }`}
                        >
                            Troubleshooting
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        <div 
                            role="tabpanel" 
                            id="tabpanel-error-log" 
                            aria-labelledby="tab-error-log" 
                            hidden={activeTab !== 'log'}
                        >
                            <motion.div
                                key="log"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.15 }}
                            >
                                <ErrorLogPanel />
                            </motion.div>
                        </div>
                        <div 
                            role="tabpanel" 
                            id="tabpanel-troubleshooting" 
                            aria-labelledby="tab-troubleshooting" 
                            hidden={activeTab !== 'hints'}
                        >
                            <motion.div
                                key="hints"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.15 }}
                            >
                                <TroubleshootingHints
                                    state={errorState.state}
                                    tec={errorState.tec}
                                    rec={errorState.rec}
                                />
                            </motion.div>
                        </div>
                    </AnimatePresence>
                </div>

                {/* Educational Reference */}
                <div className="xl:col-span-1 p-5 sm:p-6 rounded-2xl bg-white dark:bg-dark-900/80 border border-gray-200 dark:border-dark-700 backdrop-blur-sm transition-colors duration-300">
                    <h2 className="text-[10px] font-black text-cyber-yellow uppercase tracking-widest mb-4 px-2 border-l-2 border-cyber-yellow">
                        Quick Reference
                    </h2>

                    <div className="space-y-4">
                        {/* Error Counter Rules */}
                        <div className="space-y-3">
                             <div className="p-3 rounded-xl bg-cyber-blue/5 border border-cyber-blue/10 transition-colors shadow-sm">
                                <h4 className="text-[10px] font-black text-cyan-700 dark:text-cyber-blue uppercase tracking-widest mb-1.5">
                                    Transmitter Error
                                </h4>
                                <p className="text-[10px] leading-relaxed text-gray-800 dark:text-gray-400 font-bold transition-colors">
                                    Error detected while transmitting: TEC <span className="text-cyan-600 dark:text-cyber-blue font-black">+8</span>.
                                    Successful transmission: TEC <span className="text-emerald-700 dark:text-cyber-green font-black">-1</span>.
                                </p>
                            </div>
 
                            <div className="p-3 rounded-xl bg-cyber-purple/5 border border-cyber-purple/10 transition-colors shadow-sm">
                                <h4 className="text-[10px] font-black text-purple-800 dark:text-cyber-purple uppercase tracking-widest mb-1.5">
                                    Receiver Error
                                </h4>
                                <p className="text-[10px] leading-relaxed text-gray-800 dark:text-gray-400 font-bold transition-colors">
                                    Error detected while receiving: REC <span className="text-purple-700 dark:text-cyber-purple font-black">+1</span>.
                                    Successful reception: REC <span className="text-emerald-700 dark:text-cyber-green font-black">-1</span>.
                                </p>
                            </div>
 
                            <div className="p-3 rounded-xl bg-cyber-yellow/5 border border-cyber-yellow/10 transition-colors shadow-sm">
                                <h4 className="text-[10px] font-black text-amber-800 dark:text-cyber-yellow uppercase tracking-widest mb-1.5">
                                    Fault Confinement
                                </h4>
                                <p className="text-[10px] leading-relaxed text-gray-800 dark:text-gray-400 font-bold transition-colors">
                                    Prevents a single faulty node from blocking the bus. Nodes progress from Active to Passive to Bus-Off.
                                </p>
                            </div>
                        </div>

                         {/* Threshold Reference */}
                         <div className="p-3 rounded-xl bg-gray-100/50 dark:bg-dark-800/50 border border-gray-200 dark:border-dark-700 transition-colors shadow-sm">
                            <h4 className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-2">
                                State Thresholds
                            </h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-wider">Error Active</span>
                                    <span className="text-[9px] font-mono font-black text-cyan-700 dark:text-cyber-blue">TEC/REC {'<'} 128</span>
                                </div>
                                <div className="w-full h-px bg-gray-200 dark:bg-dark-700 transition-colors" />
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-wider">Error Passive</span>
                                    <span className="text-[9px] font-mono font-black text-purple-700 dark:text-purple-400">TEC/REC {'\u2265'} 128</span>
                                </div>
                                <div className="w-full h-px bg-gray-200 dark:bg-dark-700 transition-colors" />
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-wider">Bus Off</span>
                                    <span className="text-[9px] font-mono font-black text-red-700 dark:text-red-400">TEC {'>'} 255</span>
                                </div>
                            </div>
                        </div>

                         {/* Error Types Reference */}
                         <div className="p-3 rounded-xl bg-gray-100/50 dark:bg-dark-800/50 border border-gray-200 dark:border-dark-700 transition-colors shadow-sm">
                            <h4 className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-2">
                                Error Types (ISO 11898-1)
                            </h4>
                            <div className="space-y-1.5">
                                {[
                                    { code: 'BIT', desc: 'Bit monitoring error', color: '#dc2626' },
                                    { code: 'STUFF', desc: 'Bit stuffing violation', color: '#ca8a04' },
                                    { code: 'CRC', desc: 'CRC sequence mismatch', color: '#9333ea' },
                                    { code: 'FORM', desc: 'Fixed-form field error', color: '#2563eb' },
                                    { code: 'ACK', desc: 'Missing acknowledgment', color: '#0891b2' },
                                ].map((e) => (
                                    <div key={e.code} className="flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: e.color }} />
                                                                          <span className="text-[9px] font-black uppercase tracking-wider transition-colors" style={{ color: e.color }}>
                                            {e.code}
                                        </span>
                                        <span className="text-[9px] text-gray-700 dark:text-gray-500 font-bold transition-colors">{e.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ErrorPage;
