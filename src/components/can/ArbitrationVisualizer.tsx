import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CyberButton } from '../ui/CyberButton';
import { cn } from '../../utils/cn';

export const ArbitrationVisualizer: React.FC = () => {
    const [id1, setId1] = useState<string>('123');
    const [id2, setId2] = useState<string>('120');
    const [step, setStep] = useState<number>(-1);
    const [winner, setWinner] = useState<number | null>(null);

    const bits1 = parseInt(id1, 16).toString(2).padStart(11, '0').split('').map(Number);
    const bits2 = parseInt(id2, 16).toString(2).padStart(11, '0').split('').map(Number);

    const handleRun = () => { setStep(0); setWinner(null); };

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    useEffect(() => {
        if (step === 11 && winner === null) setWinner(0);
    }, [step, winner]);

    const busState = step >= 0 && step < 11
        ? (((bits1[step] ?? 1) === 0 || (bits2[step] ?? 1) === 0) ? { label: 'DOMINANT', bit: '0', color: 'text-cyber-blue' } : { label: 'RECESSIVE', bit: '1', color: 'text-gray-700' })
        : null;

    return (
        <div className="glass-panel p-6 border-cyber-purple/30 space-y-6">
            <h3 className="text-lg font-bold text-cyber-purple uppercase tracking-tighter">Arbitration Demo</h3>

            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                    {([bits1, bits2] as number[][]).map((bits, eIdx) => (
                        <div key={eIdx} className={cn('p-4 rounded border transition-all',
                            winner === eIdx + 1 ? 'border-cyber-green bg-cyber-green/5' :
                                winner !== null && winner !== eIdx + 1 ? 'border-red-900/50 opacity-40' : 'border-white/10'
                        )}>
                            <label className="text-[10px] text-gray-500 uppercase font-mono mb-2 block">ECU {eIdx === 0 ? 'A' : 'B'} | 0x{eIdx === 0 ? id1 : id2}</label>
                            <div className="flex gap-1">
                                {bits.map((b, i) => (
                                    <div key={i} className={cn('w-4 h-6 flex items-center justify-center font-mono text-xs rounded transition-all',
                                        step === i ? 'bg-white text-dark-950 scale-125' :
                                            i < step ? (b === 0 ? 'text-cyber-blue' : 'text-gray-700') : 'text-gray-800'
                                    )}>{b}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col justify-center items-center text-center space-y-4">
                    <div className="bg-dark-950 p-6 rounded-full border-2 border-dashed border-white/5 w-40 h-40 flex flex-col items-center justify-center">
                        <span className="text-[8px] text-gray-600 uppercase mb-1">Bus State</span>
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={step}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={cn('text-4xl font-black', busState?.color ?? 'text-gray-900')}
                            >
                                {busState?.bit ?? '--'}
                            </motion.span>
                        </AnimatePresence>
                        <span className="text-[9px] text-cyber-blue font-bold uppercase mt-1">
                            {busState?.label ?? 'IDLE'}
                        </span>
                    </div>

                    {winner !== null && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-cyber-green font-bold text-sm uppercase tracking-widest">
                            {winner === 1 ? 'ECU A WON BUS' : winner === 2 ? 'ECU B WON BUS' : 'TIE — Same ID'}
                        </motion.div>
                    )}
                </div>
            </div>

            <div className="flex gap-4">
                <input value={id1} onChange={e => setId1(e.target.value.toUpperCase())} className="flex-1 bg-dark-950 border border-white/10 rounded px-3 py-2 text-cyber-blue font-mono" />
                <input value={id2} onChange={e => setId2(e.target.value.toUpperCase())} className="flex-1 bg-dark-950 border border-white/10 rounded px-3 py-2 text-cyber-blue font-mono" />
                <CyberButton onClick={handleRun} variant="secondary">SIMULATE</CyberButton>
            </div>
        </div>
    );
};
