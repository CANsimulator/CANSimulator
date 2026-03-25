import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Container } from '../components/ui/Container';
import { TestTube, Settings, ArrowRight, Gauge, Info, Layers, Plus, Trash2, Activity } from 'lucide-react';
import { canSimulator } from '../services/can/can-simulator';
import { cn } from '../utils/cn';

export default function SignalsPage() {
    const navigate = useNavigate();
    const [payload, setPayload] = useState<Uint8Array>(new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]));
    const [startBit, setStartBit] = useState(12);
    const [bitLength, setBitLength] = useState(16);
    const [isLittleEndian, setIsLittleEndian] = useState(true);
    const [scale, setScale] = useState(0.1);
    const [offset, setOffset] = useState(0);
    const [unit, setUnit] = useState('Units');

    const [useInterpolation, setUseInterpolation] = useState(false);
    const [points, setPoints] = useState<{ raw: number; physical: number }[]>([
        { raw: 0, physical: -40 },
        { raw: 100, physical: 0 },
        { raw: 255, physical: 85 }
    ]);

    const rawValue = useMemo(() => {
        let raw = 0n;
        const totalBits = payload.length * 8;
        for (let i = 0; i < bitLength; i++) {
            const currentBit = isLittleEndian ? startBit + i : startBit - i;
            if (currentBit < 0 || currentBit >= totalBits) continue;
            const byteIdx = Math.floor(currentBit / 8);
            const bitInByte = currentBit % 8;
            const bitValue = (payload[byteIdx] >> bitInByte) & 1;
            if (isLittleEndian) {
                raw |= BigInt(bitValue) << BigInt(i);
            } else {
                raw |= BigInt(bitValue) << BigInt(bitLength - 1 - i);
            }
        }
        return Number(raw);
    }, [payload, startBit, bitLength, isLittleEndian]);

    const physicalValue = useMemo(() => {
        if (useInterpolation) {
            return canSimulator.interpolateSignal(points, rawValue);
        }
        return rawValue * scale + offset;
    }, [useInterpolation, points, rawValue, scale, offset]);

    const updateByte = (idx: number, val: string) => {
        const hex = val.replace(/[^0-9A-Fa-f]/g, '').slice(0, 2);
        const newPayload = new Uint8Array(payload);
        newPayload[idx] = hex ? parseInt(hex, 16) : 0;
        setPayload(newPayload);
    };

    const isBitHighlighted = (byteIdx: number, bitInByte: number) => {
        const absoluteBit = byteIdx * 8 + bitInByte;
        if (isLittleEndian) {
            return absoluteBit >= startBit && absoluteBit < startBit + bitLength;
        } else {
            return absoluteBit <= startBit && absoluteBit > startBit - bitLength;
        }
    };

    const addPoint = () => {
        setPoints(prev => [...prev, { raw: 0, physical: 0 }].sort((a, b) => a.raw - b.raw));
    };

    const removePoint = (idx: number) => {
        setPoints(prev => prev.filter((_, i) => i !== idx));
    };

    const updatePoint = (idx: number, field: 'raw' | 'physical', val: number) => {
        const newPoints = [...points];
        newPoints[idx][field] = val;
        setPoints(newPoints);
    };

    return (
        <div className="min-h-screen py-20 bg-white dark:bg-dark-950 font-sans transition-colors duration-300">
            <Container>
                <div className="relative z-10 space-y-12">
                    {/* Header */}
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-[11px] font-black text-yellow-400 uppercase tracking-widest"
                        >
                            <TestTube size={12} aria-hidden="true" />
                            Signal Engineering
                        </motion.div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-cyber-emerald italic uppercase tracking-tighter">
                            Signal Lab
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 max-w-2xl font-medium italic text-sm">
                            Map hexadecimal noise to real engineering values. Experiment with DBC-style signal extraction and non-linear interpolation.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Hex Grid Mapper */}
                        <div className="lg:col-span-8 space-y-8">
                             <div className="p-8 rounded-[2.5rem] bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black text-dark-950 dark:text-white uppercase italic tracking-widest flex items-center gap-2 text-sm">
                                        <Layers size={20} className="text-cyber-emerald" aria-hidden="true" />
                                        Payload Mapper
                                    </h2>
                                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-tighter">
                                        8 Bytes / 64 Bits
                                    </div>
                                </div>

                                <div className="space-y-1 pb-4">
                                    <div className="hidden sm:grid grid-cols-8 gap-4 px-2 mb-1">
                                        {Array.from({ length: 8 }).map((_, i) => (
                                            <div key={i} className="text-center">
                                                <span className="text-[11px] font-black text-gray-400 dark:text-gray-600 uppercase tabular-nums">
                                                    Bit {i * 8}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-4 md:gap-6">
                                        {Array.from({ length: 8 }).map((_, byteIdx) => (
                                            <div key={byteIdx} className="space-y-2">
                                                <label htmlFor={`signal-byte-${byteIdx}`} className="block text-[10px] sm:text-xs font-black text-gray-500 text-center uppercase tracking-tighter">Byte {byteIdx}</label>
                                                <input
                                                    id={`signal-byte-${byteIdx}`}
                                                    type="text"
                                                    value={payload[byteIdx].toString(16).padStart(2, '0').toUpperCase()}
                                                    onChange={(e) => updateByte(byteIdx, e.target.value)}
                                                    className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center font-mono font-bold text-cyber-emerald focus:border-cyber-emerald-500 dark:focus:border-cyber-emerald focus:ring-2 focus:ring-cyber-emerald/30 outline-none transition-all shadow-sm text-sm sm:text-base"
                                                />
                                                <div className="grid grid-cols-4 gap-0.5 p-1 bg-black/5 dark:bg-white/5 rounded-md" aria-hidden="true">
                                                    {Array.from({ length: 8 }).map((_, b) => {
                                                        const bitIdx = 7 - b; 
                                                        const absBit = byteIdx * 8 + bitIdx;
                                                        const highlighted = isBitHighlighted(byteIdx, bitIdx);
                                                        const isStartBit = absBit === startBit;

                                                        return (
                                                            <div
                                                                key={bitIdx}
                                                                className={cn(
                                                                    "h-1 sm:h-1.5 rounded-[1px] transition-all relative",
                                                                    highlighted ? "bg-cyber-emerald shadow-[0_0_8px_rgba(0,255,159,0.5)]" : "bg-gray-300 dark:bg-white/10",
                                                                    isStartBit && "ring-1 ring-white dark:ring-cyber-emerald scale-110 z-10"
                                                                )}
                                                                title={`Bit ${absBit}${isStartBit ? ' (Start Bit)' : ''}`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-3 sm:p-4 rounded-xl bg-cyber-emerald/5 border border-cyber-emerald/20 flex items-start gap-3">
                                    <Info size={14} className="text-cyber-emerald mt-0.5 shrink-0" aria-hidden="true" />
                                    <p className="text-[10px] sm:text-[11px] text-gray-600 dark:text-gray-400 italic leading-tight">
                                        Highlighting shows the selected bit range defined in the Config Sidebar. Bit 0 is the Least Significant Bit (LSB) of Byte 0.
                                    </p>
                                </div>
                            </div>

                            {/* Engineering Result Card */}
                            <div className="p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-white dark:bg-gradient-to-br dark:from-yellow-400/10 dark:to-transparent border border-gray-200 dark:border-yellow-400/20 space-y-6 shadow-2xl transition-colors duration-300">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <h2 className="text-sm font-black text-dark-950 dark:text-white uppercase italic tracking-widest flex items-center gap-2">
                                        <Gauge size={18} className="text-yellow-400" aria-hidden="true" />
                                        Interpreted Value
                                    </h2>
                                    <div className={cn(
                                        "inline-flex self-start px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter",
                                        useInterpolation ? "bg-cyber-purple/20 text-cyber-purple" : "bg-cyber-blue/20 text-cyber-blue"
                                    )}>
                                        {useInterpolation ? 'Interpolated' : 'Linear (Scale/Offset)'}
                                    </div>
                                </div>

                                <div className="flex flex-col items-center justify-center py-6 sm:py-10 relative">
                                    <div className="text-[10px] sm:text-[11px] font-black text-yellow-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-4">Signal Output</div>
                                    <div className="text-4xl sm:text-5xl md:text-7xl font-black text-dark-950 dark:text-white tracking-tighter leading-none mb-1 flex items-end flex-wrap justify-center gap-1 sm:gap-3 transition-all tabular-nums">
                                        {physicalValue.toFixed(2)}
                                        <span className="text-lg sm:text-xl text-gray-500 font-sans tracking-widest mb-1 sm:mb-2 uppercase italic shrink-0">{unit || 'Units'}</span>
                                    </div>
                                    <div className="mt-6 sm:mt-8 flex gap-4 sm:gap-8 flex-wrap justify-center">
                                        <div className="text-center">
                                            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase mb-1 underline decoration-yellow-400/30">Raw Value</div>
                                             <div className="text-[10px] sm:text-xs font-mono text-gray-400">
                                                {rawValue} {useInterpolation ? '(Input)' : ''}
                                             </div>
                                         </div>
                                         <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-white/5" />
                                        <div className="text-center">
                                            <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase mb-1 underline decoration-cyber-emerald/30">Resolution</div>
                                            <div className="text-[10px] sm:text-xs font-mono text-gray-400">{useInterpolation ? 'N/A' : `${scale} ${unit}/bit`}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Config Sidebar */}
                        <div className="lg:col-span-4 space-y-8">
                            <div className="p-8 rounded-[2.5rem] bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 space-y-8">
                                <h2 className="text-sm font-black text-dark-950 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                    <Settings size={16} className="text-gray-400" aria-hidden="true" />
                                    DBC Config
                                </h2>

                                 <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 uppercase">
                                            <label htmlFor="signal-start-bit">Start Bit</label>
                                            <input 
                                                type="number" min="0" max="63" value={startBit}
                                                onChange={(e) => setStartBit(Math.min(63, Math.max(0, Number(e.target.value))))}
                                                className="w-12 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 text-right font-mono text-dark-950 dark:text-white"
                                            />
                                        </div>
                                        <input
                                            id="signal-start-bit"
                                            type="range" min="0" max="63" value={startBit}
                                            onChange={(e) => setStartBit(Number(e.target.value))}
                                            className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyber-blue focus:outline-none focus:ring-2 focus:ring-cyber-blue/20"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 uppercase">
                                            <label htmlFor="signal-bit-length">Bit Length</label>
                                            <input 
                                                type="number" min="1" max="64" value={bitLength}
                                                onChange={(e) => setBitLength(Math.min(64, Math.max(1, Number(e.target.value))))}
                                                className="w-12 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded px-1 py-0.5 text-right font-mono text-dark-950 dark:text-white"
                                            />
                                        </div>
                                        <input
                                            id="signal-bit-length"
                                            type="range" min="1" max="64" value={bitLength}
                                            onChange={(e) => setBitLength(Number(e.target.value))}
                                            className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyber-blue focus:outline-none focus:ring-2 focus:ring-cyber-blue/20"
                                        />
                                    </div>

                                     <div className="p-4 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-[11px] font-bold text-gray-500 uppercase">Endianness</div>
                                            <button
                                                onClick={() => setIsLittleEndian(!isLittleEndian)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-[11px] font-black transition-all uppercase focus:ring-2 outline-none shadow-sm",
                                                    isLittleEndian ? "bg-cyber-blue text-black" : "bg-cyber-purple text-white"
                                                )}
                                            >
                                                {isLittleEndian ? 'Intel (LE)' : 'Motorola (BE)'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="text-[11px] font-bold text-gray-500 uppercase">Value Interpretation</div>
                                            <button
                                                onClick={() => setUseInterpolation(!useInterpolation)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-[11px] font-black transition-all uppercase focus:ring-2 outline-none shadow-sm border",
                                                    useInterpolation ? "bg-cyber-purple text-white border-cyber-purple" : "bg-transparent text-gray-400 border-gray-400/30"
                                                )}
                                            >
                                                {useInterpolation ? 'Table Mode' : 'Linear Mode'}
                                            </button>
                                        </div>

                                        {!useInterpolation ? (
                                            <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                                                <div className="space-y-2">
                                                    <label htmlFor="signal-scale" className="text-[11px] font-bold text-gray-600 uppercase">Scale</label>
                                                    <input
                                                        id="signal-scale" type="number" step="0.01" value={scale}
                                                        onChange={(e) => setScale(Number(e.target.value))}
                                                        className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2 font-mono text-xs text-dark-950 dark:text-white"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label htmlFor="signal-offset" className="text-[11px] font-bold text-gray-600 uppercase">Offset</label>
                                                    <input
                                                        id="signal-offset" type="number" value={offset}
                                                        onChange={(e) => setOffset(Number(e.target.value))}
                                                        className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2 font-mono text-xs text-dark-950 dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[11px] font-black text-cyber-purple uppercase flex items-center gap-1">
                                                        <Activity size={10} /> Interpolation Table
                                                    </h3>
                                                    <button onClick={addPoint} className="text-[11px] font-black bg-cyber-purple/20 text-cyber-purple px-2 py-1 rounded-md hover:bg-cyber-purple/30 transition-colors uppercase flex items-center gap-1">
                                                        <Plus size={10} /> Add Point
                                                    </button>
                                                </div>
                                                
                                                <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                                    {points.map((p, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <input 
                                                                type="number" value={p.raw} placeholder="Raw"
                                                                onChange={(e) => updatePoint(i, 'raw', Number(e.target.value))}
                                                                className="flex-1 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded px-2 py-1.5 font-mono text-[11px] text-dark-950 dark:text-white outline-none focus:border-cyber-purple/50"
                                                            />
                                                            <ArrowRight size={10} className="text-gray-400 shrink-0" />
                                                            <input 
                                                                type="number" value={p.physical} placeholder="Physical"
                                                                onChange={(e) => updatePoint(i, 'physical', Number(e.target.value))}
                                                                className="flex-1 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded px-2 py-1.5 font-mono text-[10px] text-dark-950 dark:text-white outline-none focus:border-cyber-purple/50"
                                                            />
                                                            <button onClick={() => removePoint(i)} className="p-1.5 text-red-500/50 hover:text-red-500 transition-colors">
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="signal-unit" className="text-[11px] font-bold text-gray-600 uppercase">Unit Label</label>
                                        <input
                                            id="signal-unit" type="text" value={unit} placeholder="e.g. rpm, km/h, C"
                                            onChange={(e) => setUnit(e.target.value)}
                                            className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2 font-mono text-xs text-dark-950 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                             <button
                                 onClick={() => navigate('/arbitration')}
                                 className="w-full p-6 rounded-[2rem] bg-gradient-to-r from-cyber-purple/20 to-cyber-blue/20 border border-cyber-purple/30 text-dark-950 dark:text-white font-black uppercase tracking-widest flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(191,0,255,0.1)] outline-none focus:ring-2 focus:ring-cyber-purple/50"
                             >
                                <span className="italic">To Arbitration Arena</span>
                                <ArrowRight className="group-hover:translate-x-2 transition-transform" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}
