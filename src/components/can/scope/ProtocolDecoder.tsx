import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { 
    Clock, 
    Hash, 
    Database, 
    FileCheck, 
    ShieldCheck, 
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
            <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Database size={14} className="text-[#00f3ff]" />
                    <h3 className="text-xs font-outfit font-semibold tracking-wide text-white/90">CAN Protocol Decoder</h3>
                    <span className="text-[10px] font-mono text-white/50 px-1.5 py-0.5 border border-white/10">ISO 11898-1</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-outfit text-white/50">
                    <span className="flex items-center gap-1.5"><Clock size={11} /> {frames.length} pkts/s</span>
                    <span className="flex items-center gap-1.5 text-[#00ff9f]/90"><ShieldCheck size={11} /> 100% valid</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-md z-10 border-b border-white/10">
                        <tr className="text-[10px] font-outfit uppercase tracking-wider text-white/40">
                            <th className="px-4 py-2.5 font-medium"><Hash size={10} /></th>
                            <th className="px-4 py-2.5 font-medium">Timestamp</th>
                            <th className="px-4 py-2.5 font-medium">Format</th>
                            <th className="px-4 py-2.5 font-medium">CAN ID</th>
                            <th className="px-4 py-2.5 font-medium">DLC</th>
                            <th className="px-4 py-2.5 font-medium">Payload</th>
                            <th className="px-4 py-2.5 font-medium">CRC</th>
                            <th className="px-4 py-2.5 font-medium">Status</th>
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
                                                <div className="flex items-center gap-1.5 text-[#00ff9f]/90 text-[11px] font-mono uppercase tracking-wider">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#00ff9f]" />
                                                    ACK
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-[#ff4444]/90 text-[11px] font-mono uppercase tracking-wider">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff4444]" />
                                                    ERR
                                                </div>
                                            )}
                                            <ChevronRight size={10} className="text-white/10 group-hover:text-white/40 transition-colors" />
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
                {frames.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="relative">
                            <FileCheck size={36} className="text-white/20" strokeWidth={1.25} />
                            <div className="absolute inset-0 rounded-full animate-ping bg-[#00f3ff]/5" />
                        </div>
                        <div className="text-center max-w-sm">
                            <p className="text-sm font-outfit font-semibold text-white/70 mb-1">Waiting for CAN traffic</p>
                            <p className="text-[12px] font-outfit text-white/40 leading-relaxed">
                                Press <span className="text-[#00ff9f]/90 font-mono">Run</span> to begin acquisition. Decoded frames will populate here in real time once bus activity is detected.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
