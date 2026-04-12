import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, FileText, Loader2 } from 'lucide-react';

interface DBCExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    signalName: string;
}

export const DBCExportModal: React.FC<DBCExportModalProps> = ({ isOpen, onClose, signalName }) => {
    const [status, setStatus] = useState<'idle' | 'generating' | 'success'>('idle');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setStatus('generating');
            setProgress(0);
            
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setTimeout(() => setStatus('success'), 300);
                        return 100;
                    }
                    return prev + 5;
                });
            }, 100);

            return () => clearInterval(interval);
        } else {
            setStatus('idle');
            setProgress(0);
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-white dark:bg-dark-900 border border-gray-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
                    >
                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-cyber-blue/10 text-cyber-blue">
                                        <FileText size={24} />
                                    </div>
                                    <h2 className="text-xl font-black text-dark-950 dark:text-white uppercase italic tracking-widest">
                                        DBC Generator
                                    </h2>
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {status === 'generating' ? (
                                    <div className="space-y-4 py-8">
                                        <div className="flex items-center justify-center">
                                            <Loader2 size={48} className="text-cyber-blue animate-spin" />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <div className="text-sm font-black text-dark-950 dark:text-white uppercase tracking-widest">
                                                Compiling Signal Mappings
                                            </div>
                                            <div className="text-[11px] text-gray-500 font-bold uppercase italic">
                                                Exporting: {signalName}.dbc
                                            </div>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <motion.div 
                                                className="h-full bg-cyber-blue shadow-[0_0_10px_#00f3ff]"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-6 py-6"
                                    >
                                        <div className="flex flex-col items-center gap-4 text-center">
                                            <div className="w-16 h-16 rounded-full bg-cyber-emerald/10 flex items-center justify-center text-cyber-emerald shadow-[0_0_20px_rgba(0,255,159,0.2)]">
                                                <CheckCircle size={40} />
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-lg font-black text-dark-950 dark:text-white uppercase tracking-tight">
                                                    Generation Complete
                                                </h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium italic">
                                                    Network database successfully compiled.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 font-mono text-[10px] text-gray-400 leading-relaxed overflow-x-auto whitespace-pre no-scrollbar">
                                            {`NS_ :\n  NS_DESC_\n  CM_\n\nBO_ 12345 ${signalName}: 8 Vector__XXX\n SG_ ${signalName} : 12|16@1+ (0.1,0) [0|6553.5] "Units" Vector__XXX`}
                                        </div>

                                        <button
                                            onClick={onClose}
                                            className="w-full py-4 rounded-2xl bg-cyber-blue text-black font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
                                        >
                                            Dismiss
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
