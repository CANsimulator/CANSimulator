import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { canSimulator } from '../../services/can/can-simulator';
import type { ErrorLogEntry } from '../../services/can/can-simulator';
import type { CANErrorCode } from '../../types/can';

const ERROR_COLORS: Record<CANErrorCode, { color: string }> = {
    BIT1: { color: 'var(--danger)' },
    BIT0: { color: 'var(--warn)' },
    STUFF: { color: 'var(--f-purp)' },
    CRC: { color: 'var(--f-pink)' },
    FORM: { color: 'var(--f-indigo)' },
    ACK: { color: 'var(--ch1)' },
    OTHER: { color: 'var(--ink-dim)' },
};

const ERROR_LABELS: Record<CANErrorCode, string> = {
    BIT1: 'BIT(1)',
    BIT0: 'BIT(0)',
    STUFF: 'STUFF',
    CRC: 'CRC',
    FORM: 'FORM',
    ACK: 'ACK',
    OTHER: 'OTHER',
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
                         className={`px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest transition-all min-h-[44px] flex items-center justify-center ${filter === f
                                ? 'bg-[var(--ch1)]/20 text-[var(--ch1)] border border-[var(--ch1)]/40'
                                : 'bg-[var(--bg-2)] text-[var(--ink-dim)] border border-[var(--stroke)] hover:text-[var(--ink)] hover:border-[var(--stroke-2)]'
                            }`}
                    >
                        {f}
                    </button>
                ))}
                <div className="flex-1" />
                 <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all min-h-[44px] flex items-center justify-center ${autoScroll
                            ? 'bg-[var(--ok)]/10 text-[var(--ok)] border border-[var(--ok)]/30'
                            : 'bg-[var(--bg-2)] text-[var(--ink-dim)] border border-[var(--stroke)]'
                        }`}
                >
                    {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                </button>
                 <span className="text-[11px] font-bold text-[var(--ink-faint)] uppercase tracking-wider">
                    {filteredLog.length} entries
                </span>
            </div>

             {/* Log Table */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto min-h-0 rounded-xl bg-[var(--bg-2)]/50 border border-[var(--stroke)] shadow-inner"
                style={{ maxHeight: '320px' }}
            >
                {filteredLog.length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[120px] text-[var(--ink-faint)]">
                        <div className="text-center">
                            <div className="text-2xl mb-2 opacity-30">
                                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                             <p className="text-[11px] font-bold uppercase tracking-widest">No errors logged</p>
                            <p className="text-[11px] text-[var(--ink-faint)]/60 mt-1">Inject an error to see activity here</p>
                        </div>
                    </div>
                ) : (
                      <table className="w-full text-[11px]">
                         <thead className="sticky top-0 bg-[var(--bg-2)]/95 backdrop-blur-sm z-10">
                            <tr className="text-[var(--ink-faint)] uppercase tracking-widest font-black border-b border-[var(--stroke)]">
                                <th className="text-left py-2.5 px-3">#</th>
                                <th className="text-left py-2.5 px-3">Time</th>
                                <th className="text-left py-2.5 px-3">Type</th>
                                <th className="text-left py-2.5 px-3">Role</th>
                                <th className="text-right py-2.5 px-3">TEC</th>
                                <th className="text-right py-2.5 px-3">REC</th>
                                <th className="text-left py-2.5 px-3">State</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence initial={false}>
                                {filteredLog.map((entry) => {
                                    const cfg = ERROR_COLORS[entry.errorCode];
                                     const stateColor = entry.newState === 'ERROR_ACTIVE' ? 'text-[var(--ch1)]'
                                        : entry.newState === 'ERROR_PASSIVE' ? 'text-[var(--f-purp)]'
                                            : 'text-[var(--danger)]';

                                    return (
                                         <motion.tr
                                            key={entry.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className={`border-b border-[var(--stroke)]/30 hover:bg-[var(--bg-3)]/30 transition-colors ${entry.stateChanged ? 'bg-[var(--warn)]/10' : ''
                                                }`}
                                        >
                                              <td className="py-2.5 px-3 font-mono text-[var(--ink-faint)]">{entry.id}</td>
                                             <td className="py-2.5 px-3 font-mono text-[var(--ink-faint)]">{formatTime(entry.timestamp)}</td>
                                             <td className="py-2.5 px-3">
                                                <span 
                                                    className="inline-flex px-2 py-0.5 rounded border font-black tracking-wider"
                                                    style={{ 
                                                        backgroundColor: `color-mix(in srgb, ${cfg.color} 10%, transparent)`,
                                                        color: cfg.color,
                                                        borderColor: `color-mix(in srgb, ${cfg.color} 30%, transparent)`
                                                    }}
                                                >
                                                    {ERROR_LABELS[entry.errorCode]}
                                                </span>
                                            </td>
                                              <td className="py-2.5 px-3">
                                                <span className={`font-bold tracking-wider ${entry.role === 'transmitter' ? 'text-[var(--danger)]' : 'text-[var(--ch1)]'}`}>
                                                    {entry.role === 'transmitter' ? 'TX' : 'RX'}
                                                </span>
                                            </td>
                                             <td className={`py-2.5 px-3 text-right font-mono font-bold ${entry.tec >= 128 ? 'text-[var(--danger)]' : 'text-[var(--ch1)]'}`}>
                                                {entry.tec}
                                            </td>
                                             <td className={`py-2.5 px-3 text-right font-mono font-bold ${entry.rec >= 128 ? 'text-[var(--danger)]' : 'text-[var(--f-purp)]'}`}>
                                                {entry.rec}
                                            </td>
                                             <td className="py-2.5 px-3">
                                                <span className={`font-black tracking-wider ${stateColor}`}>
                                                     {entry.newState.replaceAll('_', ' ')}
                                                    {entry.stateChanged && (
                                                        <span className="ml-1 text-[var(--warn)] animate-pulse">*</span>
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
