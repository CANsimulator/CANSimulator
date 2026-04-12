import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dtcManager } from '../../services/can/dtc-manager';
import type { DTC } from '../../services/can/dtc-manager';
import { FreezeFrameModal } from './FreezeFrameModal';
import { AlertCircle, Camera, Trash2 } from 'lucide-react';

export const DTCListPanel: React.FC = () => {
    const [dtcs, setDtcs] = useState<DTC[]>(dtcManager.getDTCs());
    const [selectedDtc, setSelectedDtc] = useState<DTC | null>(null);

    useEffect(() => {
        const unsub = dtcManager.subscribe(setDtcs);
        return () => { unsub(); };
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                    <AlertCircle size={14} className="text-cyber-yellow" />
                    Active Diagnostic Codes
                </h3>
                <button 
                    onClick={() => dtcManager.clearDTCs()}
                    className="text-[10px] font-black uppercase text-red-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                    <Trash2 size={12} />
                    Clear All
                </button>
            </div>

            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {dtcs.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-8 rounded-2xl border-2 border-dashed border-gray-100 dark:border-white/5 text-center"
                        >
                            <p className="text-xs font-bold text-gray-400 uppercase italic">No system faults detected</p>
                        </motion.div>
                    ) : (
                        dtcs.map((dtc) => (
                            <motion.div
                                key={dtc.code}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="group p-4 rounded-2xl bg-white dark:bg-dark-800 border border-gray-100 dark:border-white/5 hover:border-cyber-blue/30 transition-all shadow-sm"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-cyber-blue tracking-tight">{dtc.code}</span>
                                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[9px] font-black text-amber-500 uppercase tracking-widest">
                                                {dtc.status}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-dark-950 dark:text-gray-300">{dtc.description}</p>
                                        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-gray-500 uppercase">
                                            <span>Count: {dtc.occurrenceCount}</span>
                                            <span>•</span>
                                            <span>{new Date(dtc.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    </div>

                                    {dtc.freezeFrame && (
                                        <button
                                            onClick={() => setSelectedDtc(dtc)}
                                            className="p-2.5 rounded-xl bg-cyber-blue/5 text-cyber-blue hover:bg-cyber-blue/20 transition-all flex items-center gap-2 group/btn"
                                        >
                                            <Camera size={14} className="group-hover/btn:scale-110 transition-transform" />
                                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Snapshot</span>
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {selectedDtc && selectedDtc.freezeFrame && (
                <FreezeFrameModal 
                    isOpen={!!selectedDtc} 
                    onClose={() => setSelectedDtc(null)} 
                    data={selectedDtc.freezeFrame} 
                    dtcCode={selectedDtc.code}
                />
            )}
        </div>
    );
};
