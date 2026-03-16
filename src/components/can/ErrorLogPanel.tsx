import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { canSimulator } from '../../services/can/can-simulator';
import type { ErrorLogEntry } from '../../services/can/can-simulator';
import type { CANErrorCode } from '../../types/can';

const ERROR_COLORS: Record<CANErrorCode, { bg: string; text: string; border: string }> = {
    BIT1: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
    BIT0: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
    STUFF: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    CRC: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
    FORM: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    ACK: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
};

const ERROR_LABELS: Record<CANErrorCode, string> = {
    BIT1: 'BIT(1)',
    BIT0: 'BIT(0)',
    STUFF: 'STUFF',
    CRC: 'CRC',
    FORM: 'FORM',
    ACK: 'ACK',
};

type FilterType = 'ALL' | CANErrorCode;

export const ErrorLogPanel: React.FC = () => {
    const [log, setLog] = useState<ErrorLogEntry[]>(canSimulator.getErrorLog());
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [autoScroll, setAutoScroll] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsub = canSimulator.subscribeToErrorLog(setLog);
        return () => unsub();
    }, []);

    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [log, autoScroll]);

    const filteredLog = filter === 'ALL' ? log : log.filter(e => e.errorCode === filter);

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
            + '.' + String(d.getMilliseconds()).padStart(3, '0');
    };

    const filters: FilterType[] = ['ALL', 'BIT1', 'BIT0', 'STUFF', 'CRC', 'FORM', 'ACK'];

    return (
        <div className="flex flex-col h-full">
            {/* Filter Bar */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                {filters.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${filter === f
                                ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/40'
                                : 'bg-dark-800 text-gray-500 border border-dark-700 hover:text-gray-300 hover:border-dark-600'
                            }`}
                    >
                        {f}
                    </button>
                ))}
                <div className="flex-1" />
                <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${autoScroll
                            ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/30'
                            : 'bg-dark-800 text-gray-500 border border-dark-700'
                        }`}
                >
                    {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                </button>
                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                    {filteredLog.length} entries
                </span>
            </div>

            {/* Log Table */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto min-h-0 rounded-xl bg-dark-950/50 border border-dark-700/50"
                style={{ maxHeight: '320px' }}
            >
                {filteredLog.length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[120px] text-gray-600">
                        <div className="text-center">
                            <div className="text-2xl mb-2 opacity-30">
                                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest">No errors logged</p>
                            <p className="text-[9px] text-gray-700 mt-1">Inject an error to see activity here</p>
                        </div>
                    </div>
                ) : (
                    <table className="w-full text-[10px]">
                        <thead className="sticky top-0 bg-dark-900/95 backdrop-blur-sm z-10">
                            <tr className="text-gray-500 uppercase tracking-widest font-black border-b border-dark-700/50">
                                <th className="text-left py-2 px-3">#</th>
                                <th className="text-left py-2 px-3">Time</th>
                                <th className="text-left py-2 px-3">Type</th>
                                <th className="text-left py-2 px-3">Role</th>
                                <th className="text-right py-2 px-3">TEC</th>
                                <th className="text-right py-2 px-3">REC</th>
                                <th className="text-left py-2 px-3">State</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence initial={false}>
                                {filteredLog.map((entry) => {
                                    const colors = ERROR_COLORS[entry.errorCode];
                                    const stateColor = entry.newState === 'ERROR_ACTIVE' ? 'text-cyber-blue'
                                        : entry.newState === 'ERROR_PASSIVE' ? 'text-purple-400'
                                            : 'text-red-400';

                                    return (
                                        <motion.tr
                                            key={entry.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className={`border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors ${entry.stateChanged ? 'bg-yellow-500/5' : ''
                                                }`}
                                        >
                                            <td className="py-1.5 px-3 font-mono text-gray-400">{entry.id}</td>
                                            <td className="py-1.5 px-3 font-mono text-gray-400">{formatTime(entry.timestamp)}</td>
                                            <td className="py-1.5 px-3">
                                                <span className={`inline-flex px-2 py-0.5 rounded ${colors.bg} ${colors.text} ${colors.border} border font-black tracking-wider`}>
                                                    {ERROR_LABELS[entry.errorCode]}
                                                </span>
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <span className={`font-bold tracking-wider ${entry.role === 'transmitter' ? 'text-red-400' : 'text-blue-400'}`}>
                                                    {entry.role === 'transmitter' ? 'TX' : 'RX'}
                                                </span>
                                            </td>
                                            <td className={`py-1.5 px-3 text-right font-mono font-bold ${entry.tec >= 128 ? 'text-red-400' : 'text-cyber-blue'}`}>
                                                {entry.tec}
                                            </td>
                                            <td className={`py-1.5 px-3 text-right font-mono font-bold ${entry.rec >= 128 ? 'text-red-400' : 'text-purple-400'}`}>
                                                {entry.rec}
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <span className={`font-black tracking-wider ${stateColor}`}>
                                                    {entry.newState.replace('_', ' ')}
                                                    {entry.stateChanged && (
                                                        <span className="ml-1 text-yellow-400 animate-pulse">*</span>
                                                    )}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
