import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { 
    Clock, 
    Hash, 
    Database, 
    FileCheck, 
    ShieldCheck, 
    AlertCircle,
    ChevronRight
} from 'lucide-react';

interface DecodedFrame {
    id: number;
    timestamp: number;
    dlc: number;
    data: string;
    crc: string;
    status: 'ok' | 'err';
    type: 'STD' | 'EXT';
}

interface ProtocolDecoderProps {
    frames: DecodedFrame[];
    onRowClick: (id: number) => void;
}

export const ProtocolDecoder: React.FC<ProtocolDecoderProps> = ({ frames, onRowClick }) => {
    return (
        <div className="glass-panel !rounded-none flex flex-col h-[280px] overflow-hidden border-t-0 bg-[#020617]">
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Database size={14} className="text-[#00f3ff]" />
                    <h3 className="text-[10px] font-outfit font-black uppercase tracking-[0.2em] text-[#00f3ff]">CAN Protocol Decoder</h3>
                    <span className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest px-2 py-0.5 border border-white/5">ISO 11898-1</span>
                </div>
                <div className="flex items-center gap-4 text-[9px] font-mono font-black text-white/40 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Clock size={10} /> {frames.length} pkts/s</span>
                    <span className="flex items-center gap-1.5 text-[#00ff9f] shadow-glow-sm"><ShieldCheck size={10} /> 100% Valid</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-md z-10 border-b border-white/10">
                        <tr className="text-[9px] font-mono font-black uppercase tracking-widest text-white/30">
                            <th className="px-4 py-3"><Hash size={10} /></th>
                            <th className="px-4 py-3">Timestamp</th>
                            <th className="px-4 py-3">Format</th>
                            <th className="px-4 py-3">CAN ID</th>
                            <th className="px-4 py-3">DLC</th>
                            <th className="px-4 py-3">Data Stream / Payload</th>
                            <th className="px-4 py-3">CRC</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {frames.map((frame, i) => (
                                <motion.tr 
                                    key={`${frame.id}-${i}`}
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    onClick={() => onRowClick(frame.id)}
                                    className="group hover:bg-[#00f3ff]/5 border-b border-white/5 cursor-pointer transition-colors"
                                >
                                    <td className="px-4 py-2.5 text-[10px] font-mono font-black text-white/20">{i + 1}</td>
                                    <td className="px-4 py-2.5 text-[10px] font-mono font-bold text-white/40">{frame.timestamp.toFixed(6)}s</td>
                                    <td className="px-4 py-2.5">
                                        <span className={cn(
                                            "text-[9px] font-mono font-black border px-1.5 py-0.5",
                                            frame.type === 'STD' ? "border-[#00f3ff]/20 text-[#00f3ff]/80 bg-[#00f3ff]/5" : "border-[#bd00ff]/20 text-[#bd00ff]/80 bg-[#bd00ff]/5"
                                        )}>
                                            {frame.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="text-sm font-mono font-black text-[#00f3ff]/90 tracking-tighter shadow-glow-sm">
                                            0x{frame.id.toString(16).toUpperCase().padStart(3, '0')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-[11px] font-mono font-black text-white/60">{frame.dlc}</td>
                                    <td className="px-4 py-2.5 font-mono">
                                        <div className="flex gap-1.5">
                                            {frame.data.split(' ').map((byte, bi) => (
                                                <span key={bi} className={cn(
                                                    "text-[10px] font-mono font-black tracking-widest",
                                                    bi % 2 === 0 ? "text-white/70" : "text-white/40"
                                                )}>
                                                    {byte}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-[10px] font-mono font-bold text-[#ff8800]/80">0x{frame.crc}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            {frame.status === 'ok' ? (
                                                <div className="flex items-center gap-1.5 text-[#00ff9f]/80 text-[10px] font-mono font-black uppercase tracking-widest">
                                                    <div className="h-3 w-[2px] bg-[#00ff9f] shadow-[0_0_4px_#00ff9f]" />
                                                    ACK
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-[#ff4444]/80 text-[10px] font-mono font-black uppercase tracking-widest">
                                                    <div className="h-3 w-[2px] bg-[#ff4444] shadow-[0_0_4px_#ff4444]" />
                                                    ERR
                                                </div>
                                            )}
                                            <ChevronRight size={10} className="text-white/10 group-hover:text-white/40 translate-x-1 transition-all" />
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
                {frames.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-20 gap-3 opacity-20">
                        <FileCheck size={40} className="text-white/40" />
                        <p className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white/60">Capture Data Pending...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
