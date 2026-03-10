import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Container } from '../components/ui/Container';
import { TestTube, Settings, ArrowRight, Gauge, Info, Layers } from 'lucide-react';
import { canSimulator } from '../services/can/can-simulator';
import { cn } from '../utils/cn';

export default function SignalsPage() {
    const [payload, setPayload] = useState<Uint8Array>(new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]));
    const [startBit, setStartBit] = useState(12);
    const [bitLength, setBitLength] = useState(16);
    const [isLittleEndian, setIsLittleEndian] = useState(true);
    const [scale, setScale] = useState(0.1);
    const [offset, setOffset] = useState(0);

    const physicalValue = useMemo(() =>
        canSimulator.extractSignal(payload, startBit, bitLength, isLittleEndian, scale, offset),
        [payload, startBit, bitLength, isLittleEndian, scale, offset]);

    const updateByte = (idx: number, val: string) => {
        const hex = val.replace(/[^0-9A-Fa-f]/g, '').slice(0, 2);
        if (!hex) return;
        const newPayload = new Uint8Array(payload);
        newPayload[idx] = parseInt(hex, 16);
        setPayload(newPayload);
    };

    const isBitHighlighted = (byteIdx: number, bitInByte: number) => {
        const absoluteBit = byteIdx * 8 + bitInByte;
        return absoluteBit >= startBit && absoluteBit < startBit + bitLength;
    };

    return (
        <div className="min-h-screen py-20 bg-dark-950 font-sans">
            <Container>
                <div className="relative z-10 space-y-12">
                    {/* Header */}
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-[10px] font-black text-yellow-400 uppercase tracking-widest"
                        >
                            <TestTube size={12} />
                            Signal Engineering
                        </motion.div>
                        <h1 className="text-5xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-cyber-emerald italic uppercase tracking-tighter">
                            Signal Lab
                        </h1>
                        <p className="text-gray-400 max-w-2xl font-medium italic">
                            Map hexadecimal noise to real engineering values. Experiment with DBC-style signal extraction.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Hex Grid Mapper */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                                        <Layers size={20} className="text-cyber-emerald" />
                                        Payload Mapper
                                    </h3>
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                        8 Bytes / 64 Bits
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                                    {Array.from({ length: 8 }).map((_, byteIdx) => (
                                        <div key={byteIdx} className="space-y-3">
                                            <div className="text-[10px] font-black text-gray-600 text-center uppercase">Byte {byteIdx}</div>
                                            <input
                                                type="text"
                                                value={payload[byteIdx].toString(16).padStart(2, '0').toUpperCase()}
                                                onChange={(e) => updateByte(byteIdx, e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-center font-mono font-bold text-cyber-emerald focus:border-cyber-emerald/50 focus:ring-1 focus:ring-cyber-emerald/30 outline-none transition-all"
                                            />
                                            <div className="grid grid-cols-4 gap-1">
                                                {Array.from({ length: 8 }).map((_, b) => {
                                                    const bitIdx = 7 - b; // Showing MSB to LSB
                                                    const highlighted = isBitHighlighted(byteIdx, bitIdx);
                                                    return (
                                                        <div
                                                            key={bitIdx}
                                                            className={cn(
                                                                "h-1 rounded-[2px] transition-all",
                                                                highlighted ? "bg-cyber-emerald shadow-[0_0_5px_rgba(0,255,159,0.5)]" : "bg-white/5"
                                                            )}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 rounded-xl bg-cyber-emerald/5 border border-cyber-emerald/20 flex items-start gap-3">
                                    <Info size={16} className="text-cyber-emerald mt-1 shrink-0" />
                                    <p className="text-[10px] text-gray-400 italic">
                                        Highlighting shows the selected bit range defined in the Config Sidebar. Bit 0 is the Least Significant Bit (LSB) of Byte 0.
                                    </p>
                                </div>
                            </div>

                            {/* Engineering Result Card */}
                            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-yellow-400/10 to-transparent border border-yellow-400/20 space-y-6 shadow-2xl">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                                        <Gauge size={20} className="text-yellow-400" />
                                        Interpreted Value
                                    </h3>
                                </div>

                                <div className="flex flex-col items-center justify-center py-10 relative">
                                    <div className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.3em] mb-4">Signal Output</div>
                                    <div className="text-7xl font-mono text-white font-black tracking-tighter flex items-end gap-3">
                                        {physicalValue.toFixed(2)}
                                        <span className="text-xl text-gray-500 font-sans tracking-widest mb-2 uppercase italic">Units</span>
                                    </div>
                                    <div className="mt-8 flex gap-8">
                                        <div className="text-center">
                                            <div className="text-[10px] font-bold text-gray-600 uppercase mb-1">Raw BigInt</div>
                                            <div className="text-xs font-mono text-gray-400">{(physicalValue / scale - offset).toFixed(0)}</div>
                                        </div>
                                        <div className="w-px h-8 bg-white/5" />
                                        <div className="text-center">
                                            <div className="text-[10px] font-bold text-gray-600 uppercase mb-1">Resolution</div>
                                            <div className="text-xs font-mono text-gray-400">{scale} unit/bit</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Config Sidebar */}
                        <div className="space-y-8">
                            <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-8">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <Settings size={16} className="text-gray-400" />
                                    DBC Config
                                </h3>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                                            <span>Start Bit</span>
                                            <span className="text-white">{startBit}</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="63" value={startBit}
                                            onChange={(e) => setStartBit(Number(e.target.value))}
                                            className="w-full accent-cyber-emerald"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                                            <span>Bit Length</span>
                                            <span className="text-white">{bitLength}</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="32" value={bitLength}
                                            onChange={(e) => setBitLength(Number(e.target.value))}
                                            className="w-full accent-cyber-emerald"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase">Endianness</div>
                                        <button
                                            onClick={() => setIsLittleEndian(!isLittleEndian)}
                                            className={cn(
                                                "px-3 py-1 rounded-lg text-[10px] font-black transition-all uppercase",
                                                isLittleEndian ? "bg-cyber-blue text-black" : "bg-cyber-purple text-white"
                                            )}
                                        >
                                            {isLittleEndian ? 'Intel (LE)' : 'Motorola (BE)'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase">Scale</label>
                                            <input
                                                type="number" step="0.01" value={scale}
                                                onChange={(e) => setScale(Number(e.target.value))}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-xs text-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-600 uppercase">Offset</label>
                                            <input
                                                type="number" value={offset}
                                                onChange={(e) => setOffset(Number(e.target.value))}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-xs text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => window.location.href = '/arbitration'}
                                className="w-full p-6 rounded-3xl bg-gradient-to-r from-cyber-purple/20 to-red-500/20 border border-cyber-purple/30 text-white font-black uppercase tracking-widest flex items-center justify-between group hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(191,0,255,0.1)]"
                            >
                                <span className="italic">To Arbitration Arena</span>
                                <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </Container>
        </div>
    );
}
