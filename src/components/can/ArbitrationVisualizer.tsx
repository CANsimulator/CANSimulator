import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CyberButton } from '../ui/CyberButton';
import { cn } from '../../utils/cn';

export const ArbitrationVisualizer: React.FC = () => {
    const [id1, setId1] = useState<string>('123');
    const [id2, setId2] = useState<string>('120');
    const [step, setStep] = useState<number>(-1);
    const [winner, setWinner] = useState<number | null>(null);

    const parseIdToBits = (idStr: string) => {
        const val = parseInt(idStr || '0', 16) & 0x7FF;
        return val.toString(2).padStart(11, '0').split('').map(Number);
    };

    const bits1 = useMemo(() => parseIdToBits(id1), [id1]);
    const bits2 = useMemo(() => parseIdToBits(id2), [id2]);

    const handleRun = () => { if (!id1 || !id2) return; setStep(0); setWinner(null); };

    useEffect(() => {
        if (step < 0 || step >= 11) return;
        const timer = setTimeout(() => {
            const b1 = bits1[step] ?? 1;
            const b2 = bits2[step] ?? 1;
            if (b1 === 1 && b2 === 0) { setWinner(2); setStep(11); }
            else if (b2 === 1 && b1 === 0) { setWinner(1); setStep(11); }
            else setStep(s => s + 1);
        }, 600);
        return () => clearTimeout(timer);
    }, [step, bits1, bits2]);

    useEffect(() => {
        if (step === 11 && winner === null) setWinner(0);
    }, [step, winner]);

    const busState = step >= 0 && step < 11
        ? (((bits1[step] ?? 1) === 0 || (bits2[step] ?? 1) === 0) ? { label: 'DOMINANT', bit: '0', color: 'text-cyber-blue' } : { label: 'RECESSIVE', bit: '1', color: 'text-gray-700' })
        : null;

    const handleIdChange = (val: string, setter: (v: string) => void) => {
        const hex = val.replace(/[^0-9A-Fa-f]/g, '').slice(0, 3).toUpperCase();
        setter(hex);
    };

    return (
        <div className="glass-panel p-6 border-[var(--stroke)] space-y-6">
            <h3 className="text-lg font-bold text-[var(--f-purp)] uppercase tracking-tighter">Arbitration Demo</h3>

            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                    {([bits1, bits2] as number[][]).map((bits, eIdx) => (
                        <div key={eIdx} className={cn('p-4 rounded border transition-all',
                            winner === eIdx + 1 ? 'border-[var(--ok)] bg-[var(--status-bg)] status-pass' :
                                winner !== null && winner !== eIdx + 1 ? 'border-[var(--danger)]/50 opacity-40' : 'border-[var(--stroke)]'
                        )}>
                            <label className="text-[10px] text-[var(--ink-faint)] uppercase font-mono mb-2 block">
                                ECU {eIdx === 0 ? 'A' : 'B'} | 0x{eIdx === 0 ? id1 : id2}
                            </label>
                            <div className="flex gap-1" aria-hidden="true">
                                {bits.map((b, i) => (
                                    <div key={i} className={cn('w-4 h-6 flex items-center justify-center font-mono text-xs rounded transition-all',
                                        step === i ? 'bg-[var(--ink)] text-[var(--bg)] scale-125 font-bold' :
                                            i < step ? (b === 0 ? 'text-[var(--ch1)]' : 'text-[var(--ink-faint)]') : 'text-[var(--ink-faint)]/40'
                                    )}>{b}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col justify-center items-center text-center space-y-4">
                    <div className="bg-[var(--bg-darker)] p-6 rounded-full border-2 border-dashed border-[var(--stroke)] w-40 h-40 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                        <span className="text-[8px] text-[var(--ink-faint)] uppercase mb-1" id="bus-state-label">Bus State</span>
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={step}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={cn('text-4xl font-black', busState?.bit === '0' ? 'text-[var(--ch1)]' : 'text-[var(--ink-dim)]')}
                                aria-labelledby="bus-state-label"
                            >
                                {busState?.bit ?? '--'}
                            </motion.span>
                        </AnimatePresence>
                        <span className={cn('text-[9px] font-bold uppercase mt-1', busState?.bit === '0' ? 'text-[var(--ch1)]' : 'text-[var(--ink-faint)]')}>
                            {busState?.label ?? 'IDLE'}
                        </span>
                    </div>

                    {winner !== null && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[var(--ok)] font-bold text-sm uppercase tracking-widest" aria-live="polite">
                            {winner === 1 ? 'ECU A WON BUS' : winner === 2 ? 'ECU B WON BUS' : 'TIE — Same ID'}
                        </motion.div>
                    )}
                </div>
            </div>

            <div className="flex gap-4">
                <input 
                    placeholder="ID A (Hex)"
                    value={id1} 
                    onChange={e => handleIdChange(e.target.value, setId1)} 
                    className="flex-1 bg-[var(--bg-darker)] border border-[var(--stroke)] rounded px-3 py-2 text-[var(--ch1)] font-mono placeholder:text-[var(--ink-faint)] focus:outline-none focus:border-[var(--ch1)]/50 transition-colors" 
                    aria-label="Hex ID for ECU A"
                />
                <input 
                    placeholder="ID B (Hex)"
                    value={id2} 
                    onChange={e => handleIdChange(e.target.value, setId2)} 
                    className="flex-1 bg-[var(--bg-darker)] border border-[var(--stroke)] rounded px-3 py-2 text-[var(--ch1)] font-mono placeholder:text-[var(--ink-faint)] focus:outline-none focus:border-[var(--ch1)]/50 transition-colors" 
                    aria-label="Hex ID for ECU B"
                />
                <CyberButton onClick={handleRun} variant="secondary" disabled={step >= 0 && step < 11}>SIMULATE</CyberButton>
            </div>
        </div>
    );
};
