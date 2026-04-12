import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Thermometer, Zap, Gauge } from 'lucide-react';
import type { FreezeFrame } from '../../services/can/can-simulator';
import { cn } from '../../utils/cn';

interface FreezeFrameModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: FreezeFrame;
    dtcCode: string;
}

export const FreezeFrameModal: React.FC<FreezeFrameModalProps> = ({ isOpen, onClose, data, dtcCode }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-lg bg-dark-900 border-2 border-cyber-blue/30 rounded-[2rem] shadow-[0_0_50px_rgba(0,243,255,0.2)] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-cyber-blue/20 bg-cyber-blue/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyber-blue/20 flex items-center justify-center text-cyber-blue">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">
                                        Freeze Frame Data
                                    </h2>
                                    <p className="text-[10px] font-bold text-cyber-blue uppercase tracking-widest">
                                        Trigger: {dtcCode}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 grid grid-cols-2 gap-6">
                            <MetricBox 
                                icon={<Gauge size={20} />} 
                                label="Engine RPM" 
                                value={`${data.rpm}`} 
                                unit="rpm" 
                                color="text-cyber-blue" 
                            />
                            <MetricBox 
                                icon={<Activity size={20} />} 
                                label="Vehicle Speed" 
                                value={`${data.speed}`} 
                                unit="km/h" 
                                color="text-cyber-emerald" 
                            />
                            <MetricBox 
                                icon={<Thermometer size={20} />} 
                                label="Coolant Temp" 
                                value={`${data.temp}`} 
                                unit="°C" 
                                color="text-cyber-pink" 
                            />
                            <MetricBox 
                                icon={<Zap size={20} />} 
                                label="System Voltage" 
                                value={`${data.voltage.toFixed(2)}`} 
                                unit="V" 
                                color="text-cyber-yellow" 
                            />
                        </div>

                        {/* Footer Info */}
                        <div className="p-6 bg-black/40 text-center">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">
                                Data Snapshot captured at T+0ms of failure detection
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const MetricBox = ({ icon, label, value, unit, color }: any) => (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-gray-500">
            {icon}
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
            <span className={cn("text-3xl font-black italic", color)}>{value}</span>
            <span className="text-[10px] font-bold text-gray-600 uppercase">{unit}</span>
        </div>
    </div>
);
