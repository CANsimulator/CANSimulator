import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '../components/ui/Container';
import {
    Binary, Hexagon, RefreshCw, AlertCircle, CheckCircle2,
    ArrowRight, Cpu, Layers, Zap, ChevronDown, ChevronUp,
    Copy, Check, Info
} from 'lucide-react';
import { canSimulator } from '../services/can/can-simulator';
import { cn } from '../utils/cn';

// ─── CAN Frame Field Definitions ───────────────────────────────────────────
interface FrameField {
    name: string;
    shortName: string;
    bits: number;
    color: string;
    bgColor: string;
    borderColor: string;
    glowColor: string;
    description: string;
    editable: boolean;
}

const STANDARD_FRAME_FIELDS: FrameField[] = [
    { name: 'Start of Frame', shortName: 'SOF', bits: 1, color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/30', glowColor: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]', description: 'Always dominant (0). Marks the beginning of a frame.', editable: false },
    { name: 'Arbitration ID', shortName: 'ID', bits: 11, color: 'text-cyber-blue', bgColor: 'bg-cyber-blue/15', borderColor: 'border-cyber-blue/30', glowColor: 'shadow-[0_0_12px_rgba(0,243,255,0.2)]', description: 'Message priority identifier (11-bit). Lower ID = Higher priority.', editable: true },
    { name: 'Remote Request', shortName: 'RTR', bits: 1, color: 'text-cyber-purple', bgColor: 'bg-cyber-purple/15', borderColor: 'border-cyber-purple/30', glowColor: 'shadow-[0_0_12px_rgba(189,0,255,0.2)]', description: 'Remote Transmission Request. Dominant (0) for data frame.', editable: true },
    { name: 'Identifier Extension', shortName: 'IDE', bits: 1, color: 'text-cyber-pink', bgColor: 'bg-cyber-pink/15', borderColor: 'border-cyber-pink/30', glowColor: 'shadow-[0_0_12px_rgba(255,0,153,0.2)]', description: 'Dominant (0) for standard frame, recessive (1) for extended.', editable: false },
    { name: 'Reserved', shortName: 'r0', bits: 1, color: 'text-gray-400', bgColor: 'bg-gray-500/15', borderColor: 'border-gray-500/30', glowColor: '', description: 'Reserved bit. Must be dominant (0).', editable: false },
    { name: 'Data Length Code', shortName: 'DLC', bits: 4, color: 'text-cyber-green', bgColor: 'bg-cyber-green/15', borderColor: 'border-cyber-green/30', glowColor: 'shadow-[0_0_12px_rgba(0,255,159,0.2)]', description: 'Number of data bytes (0-8 for Classic CAN).', editable: true },
    { name: 'Data Field', shortName: 'DATA', bits: 64, color: 'text-cyan-300', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20', glowColor: 'shadow-[0_0_12px_rgba(6,182,212,0.15)]', description: 'Payload data (0-8 bytes based on DLC).', editable: true },
    { name: 'CRC Sequence', shortName: 'CRC', bits: 15, color: 'text-orange-400', bgColor: 'bg-orange-500/15', borderColor: 'border-orange-500/30', glowColor: 'shadow-[0_0_12px_rgba(249,115,22,0.2)]', description: 'Cyclic Redundancy Check for error detection.', editable: false },
    { name: 'CRC Delimiter', shortName: 'DEL', bits: 1, color: 'text-orange-300', bgColor: 'bg-orange-400/10', borderColor: 'border-orange-400/20', glowColor: '', description: 'Always recessive (1). Separates CRC from ACK.', editable: false },
    { name: 'ACK Slot', shortName: 'ACK', bits: 1, color: 'text-emerald-400', bgColor: 'bg-emerald-500/15', borderColor: 'border-emerald-500/30', glowColor: 'shadow-[0_0_12px_rgba(16,185,129,0.2)]', description: 'Transmitter sends recessive; receivers overwrite with dominant.', editable: false },
    { name: 'ACK Delimiter', shortName: 'DEL', bits: 1, color: 'text-emerald-300', bgColor: 'bg-emerald-400/10', borderColor: 'border-emerald-400/20', glowColor: '', description: 'Always recessive (1).', editable: false },
    { name: 'End of Frame', shortName: 'EOF', bits: 7, color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', glowColor: '', description: '7 recessive bits marking end of frame.', editable: false },
    { name: 'Inter-Frame Space', shortName: 'IFS', bits: 3, color: 'text-gray-500', bgColor: 'bg-gray-600/10', borderColor: 'border-gray-600/20', glowColor: '', description: '3 recessive bits minimum gap between frames.', editable: false },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToBits(hex: string, bitCount: number): number[] {
    const val = parseInt(hex, 16) || 0;
    const bits: number[] = [];
    for (let i = bitCount - 1; i >= 0; i--) {
        bits.push((val >> i) & 1);
    }
    return bits;
}

function bitsToHex(bits: number[]): string {
    let val = 0;
    for (const bit of bits) {
        val = (val << 1) | bit;
    }
    return val.toString(16).toUpperCase();
}

function byteToBits(byte: number): number[] {
    const bits: number[] = [];
    for (let i = 7; i >= 0; i--) {
        bits.push((byte >> i) & 1);
    }
    return bits;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function InspectorPage() {
    // Frame configuration state
    const [arbId, setArbId] = useState('7DF');
    const [rtr, setRtr] = useState(0);
    const [dlc, setDlc] = useState(8);
    const [dataBytes, setDataBytes] = useState<string[]>(['02', '10', '01', '00', '00', '00', '00', '00']);

    // UI state
    const [hoveredField, setHoveredField] = useState<number | null>(null);
    const [selectedField, setSelectedField] = useState<number | null>(null);
    const [crcType, setCrcType] = useState<'CRC15' | 'CRC17' | 'CRC21'>('CRC15');
    const [showBitStuffing, setShowBitStuffing] = useState(true);
    const [copied, setCopied] = useState(false);
    const [showFrameDetails, setShowFrameDetails] = useState(true);

    // Build the complete bit-level frame
    const frameBits = useMemo(() => {
        const bits: { value: number; fieldIndex: number }[] = [];

        // SOF - always 0
        bits.push({ value: 0, fieldIndex: 0 });

        // Arbitration ID - 11 bits
        const idBits = hexToBits(arbId, 11);
        idBits.forEach(b => bits.push({ value: b, fieldIndex: 1 }));

        // RTR
        bits.push({ value: rtr, fieldIndex: 2 });

        // IDE - 0 for standard
        bits.push({ value: 0, fieldIndex: 3 });

        // r0 - reserved, 0
        bits.push({ value: 0, fieldIndex: 4 });

        // DLC - 4 bits
        const dlcBits = hexToBits(dlc.toString(16), 4);
        dlcBits.forEach(b => bits.push({ value: b, fieldIndex: 5 }));

        // Data - dlc * 8 bits
        const actualDlc = Math.min(dlc, 8);
        for (let i = 0; i < actualDlc; i++) {
            const byteVal = parseInt(dataBytes[i] || '00', 16) || 0;
            byteToBits(byteVal).forEach(b => bits.push({ value: b, fieldIndex: 6 }));
        }

        // CRC - computed over SOF + ID + Control + Data
        const rawBits = bits.map(b => b.value);
        const crcVal = canSimulator.computeCRC15(rawBits);
        const crcBits = hexToBits(crcVal.toString(16), 15);
        crcBits.forEach(b => bits.push({ value: b, fieldIndex: 7 }));

        // CRC Delimiter - always 1
        bits.push({ value: 1, fieldIndex: 8 });

        // ACK Slot - 0 (acknowledged)
        bits.push({ value: 0, fieldIndex: 9 });

        // ACK Delimiter - always 1
        bits.push({ value: 1, fieldIndex: 10 });

        // EOF - 7 recessive bits
        for (let i = 0; i < 7; i++) bits.push({ value: 1, fieldIndex: 11 });

        // IFS - 3 recessive bits
        for (let i = 0; i < 3; i++) bits.push({ value: 1, fieldIndex: 12 });

        return bits;
    }, [arbId, rtr, dlc, dataBytes]);

    // Bit stuffing on the stuffable region (SOF through CRC, before delimiter)
    const stuffingResult = useMemo(() => {
        const stuffableEnd = frameBits.findIndex(b => b.fieldIndex === 8); // CRC delimiter
        const stuffableBits = frameBits.slice(0, stuffableEnd).map(b => b.value);
        return canSimulator.applyBitStuffing(stuffableBits);
    }, [frameBits]);

    // CRC value for display
    const crcValue = useMemo(() => {
        const rawBits = frameBits.filter(b => b.fieldIndex <= 6).map(b => b.value);
        if (crcType === 'CRC15') return canSimulator.computeCRC15(rawBits);
        if (crcType === 'CRC17') return canSimulator.computeCRC17(rawBits);
        return canSimulator.computeCRC21(rawBits);
    }, [frameBits, crcType]);

    // Frame field segments with actual bit counts
    const fieldSegments = useMemo(() => {
        const segments: { field: FrameField; startBit: number; endBit: number; bitValues: number[] }[] = [];
        let currentFieldIndex = -1;
        let startBit = 0;

        frameBits.forEach((bit, i) => {
            if (bit.fieldIndex !== currentFieldIndex) {
                if (currentFieldIndex >= 0) {
                    segments[segments.length - 1].endBit = i - 1;
                }
                currentFieldIndex = bit.fieldIndex;
                segments.push({
                    field: STANDARD_FRAME_FIELDS[bit.fieldIndex],
                    startBit: i,
                    endBit: i,
                    bitValues: [bit.value]
                });
                startBit = i;
            } else {
                segments[segments.length - 1].bitValues.push(bit.value);
                segments[segments.length - 1].endBit = i;
            }
        });

        return segments;
    }, [frameBits]);

    const totalBits = frameBits.length;
    const totalStuffedBits = stuffingResult.stuffed.length + (totalBits - frameBits.filter(b => b.fieldIndex <= 7).length);

    const handleDataByteChange = useCallback((index: number, value: string) => {
        const cleaned = value.replace(/[^0-9a-fA-F]/g, '').slice(0, 2);
        setDataBytes(prev => {
            const next = [...prev];
            next[index] = cleaned;
            return next;
        });
    }, []);

    const copyFrameHex = useCallback(() => {
        const hex = frameBits.map(b => b.value).join('');
        const hexStr = parseInt(hex, 2).toString(16).toUpperCase();
        navigator.clipboard.writeText(hexStr);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [frameBits]);

    return (
        <div className="min-h-screen py-20 bg-dark-950 font-sans">
            <Container variant="wide">
                <div className="relative z-10 space-y-10">

                    {/* ── Header ───────────────────────────────────────── */}
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyber-blue/10 border border-cyber-blue/20 text-[10px] font-black text-cyber-blue uppercase tracking-[0.25em]"
                        >
                            <Cpu size={12} />
                            ISO 11898-1 Frame Inspector
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl sm:text-5xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyber-blue via-cyan-300 to-cyber-purple italic uppercase tracking-tighter"
                        >
                            Bit-Level Inspector
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-gray-400 max-w-3xl font-medium"
                        >
                            Build a CAN frame from scratch. See every field, every bit, and understand exactly how data travels on the bus.
                        </motion.p>
                    </div>

                    {/* ── Frame Builder ─────────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6"
                    >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyber-blue/20 border border-cyber-blue/30 flex items-center justify-center">
                                    <Layers size={16} className="text-cyber-blue" />
                                </div>
                                Frame Builder
                            </h2>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    {totalBits} bits
                                    {showBitStuffing && ` / ${totalStuffedBits} stuffed`}
                                </span>
                                <button
                                    onClick={copyFrameHex}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-300 border border-white/5 transition-all"
                                >
                                    {copied ? <Check size={10} className="text-cyber-green" /> : <Copy size={10} />}
                                    {copied ? 'Copied' : 'Copy Hex'}
                                </button>
                            </div>
                        </div>

                        {/* Frame Configuration Inputs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                            {/* Arb ID */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-cyber-blue uppercase tracking-widest">Arbitration ID</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono">0x</span>
                                    <input
                                        type="text"
                                        value={arbId}
                                        onChange={e => setArbId(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 3))}
                                        maxLength={3}
                                        className="w-full pl-8 pr-3 py-2.5 bg-dark-800 border border-cyber-blue/20 rounded-xl text-sm font-mono text-white focus:border-cyber-blue/60 focus:outline-none focus:ring-1 focus:ring-cyber-blue/30 transition-all"
                                    />
                                </div>
                            </div>

                            {/* RTR */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-cyber-purple uppercase tracking-widest">RTR</label>
                                <button
                                    onClick={() => setRtr(r => r === 0 ? 1 : 0)}
                                    className={cn(
                                        "w-full py-2.5 rounded-xl text-sm font-bold border transition-all",
                                        rtr === 0
                                            ? "bg-cyber-purple/10 border-cyber-purple/30 text-cyber-purple"
                                            : "bg-cyber-purple/25 border-cyber-purple/50 text-white shadow-[0_0_15px_rgba(189,0,255,0.15)]"
                                    )}
                                >
                                    {rtr === 0 ? 'Data Frame' : 'Remote Frame'}
                                </button>
                            </div>

                            {/* DLC */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-cyber-green uppercase tracking-widest">DLC</label>
                                <select
                                    value={dlc}
                                    onChange={e => setDlc(Number(e.target.value))}
                                    className="w-full py-2.5 px-3 bg-dark-800 border border-cyber-green/20 rounded-xl text-sm font-mono text-white focus:border-cyber-green/60 focus:outline-none appearance-none cursor-pointer"
                                >
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                        <option key={n} value={n}>{n} byte{n !== 1 ? 's' : ''}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Data Bytes */}
                            {Array.from({ length: Math.min(dlc, 8) }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Byte {i}</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono">0x</span>
                                        <input
                                            type="text"
                                            value={dataBytes[i]}
                                            onChange={e => handleDataByteChange(i, e.target.value)}
                                            maxLength={2}
                                            className="w-full pl-8 pr-3 py-2.5 bg-dark-800 border border-cyan-500/15 rounded-xl text-sm font-mono text-white focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* ── Frame Structure Visualization ─────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyber-green/20 border border-cyber-green/30 flex items-center justify-center">
                                    <Binary size={16} className="text-cyber-green" />
                                </div>
                                Frame Structure
                            </h2>
                            <button
                                onClick={() => setShowFrameDetails(!showFrameDetails)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-400 border border-white/5 transition-all"
                            >
                                {showFrameDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                Details
                            </button>
                        </div>

                        {/* Color-coded frame bar */}
                        <div className="space-y-3">
                            <div className="flex rounded-2xl overflow-hidden border border-white/5 h-14 sm:h-16">
                                {fieldSegments.map((seg, i) => {
                                    const widthPercent = (seg.bitValues.length / totalBits) * 100;
                                    const isHovered = hoveredField === i;
                                    const isSelected = selectedField === i;
                                    return (
                                        <motion.div
                                            key={i}
                                            className={cn(
                                                "relative flex items-center justify-center cursor-pointer transition-all duration-200 border-r border-white/5 last:border-r-0",
                                                seg.field.bgColor,
                                                isHovered && "brightness-150 z-10",
                                                isSelected && "ring-2 ring-white/30 z-20",
                                            )}
                                            style={{ width: `${Math.max(widthPercent, 1.5)}%` }}
                                            onMouseEnter={() => setHoveredField(i)}
                                            onMouseLeave={() => setHoveredField(null)}
                                            onClick={() => setSelectedField(selectedField === i ? null : i)}
                                            whileHover={{ scale: 1.02 }}
                                        >
                                            {widthPercent > 3 && (
                                                <div className="text-center px-1">
                                                    <div className={cn("text-[9px] sm:text-[10px] font-black uppercase tracking-wider", seg.field.color)}>
                                                        {seg.field.shortName}
                                                    </div>
                                                    {widthPercent > 6 && (
                                                        <div className="text-[8px] text-gray-500 font-mono">
                                                            {seg.bitValues.length}b
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Field legend */}
                            <div className="flex flex-wrap gap-2">
                                {fieldSegments.map((seg, i) => (
                                    <button
                                        key={i}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all",
                                            hoveredField === i || selectedField === i
                                                ? cn(seg.field.bgColor, seg.field.borderColor, seg.field.color)
                                                : "bg-white/[0.02] border-white/5 text-gray-500 hover:text-gray-300"
                                        )}
                                        onMouseEnter={() => setHoveredField(i)}
                                        onMouseLeave={() => setHoveredField(null)}
                                        onClick={() => setSelectedField(selectedField === i ? null : i)}
                                    >
                                        <div className={cn("w-2 h-2 rounded-full", seg.field.bgColor, seg.field.borderColor, "border")} />
                                        {seg.field.shortName}
                                        <span className="text-gray-600 font-mono">{seg.bitValues.length}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Field detail panel */}
                        <AnimatePresence>
                            {showFrameDetails && selectedField !== null && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className={cn(
                                        "p-5 rounded-2xl border",
                                        fieldSegments[selectedField].field.bgColor,
                                        fieldSegments[selectedField].field.borderColor,
                                        fieldSegments[selectedField].field.glowColor,
                                    )}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                            <div>
                                                <h4 className={cn("text-sm font-black uppercase tracking-widest", fieldSegments[selectedField].field.color)}>
                                                    {fieldSegments[selectedField].field.name}
                                                </h4>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {fieldSegments[selectedField].field.description}
                                                </p>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="px-3 py-2 rounded-xl bg-black/30 border border-white/5 text-center">
                                                    <div className="text-[9px] text-gray-500 font-bold uppercase">Bits</div>
                                                    <div className="text-lg font-mono font-black text-white">{fieldSegments[selectedField].bitValues.length}</div>
                                                </div>
                                                <div className="px-3 py-2 rounded-xl bg-black/30 border border-white/5 text-center">
                                                    <div className="text-[9px] text-gray-500 font-bold uppercase">Hex</div>
                                                    <div className="text-lg font-mono font-black text-white">0x{bitsToHex(fieldSegments[selectedField].bitValues)}</div>
                                                </div>
                                                <div className="px-3 py-2 rounded-xl bg-black/30 border border-white/5 text-center">
                                                    <div className="text-[9px] text-gray-500 font-bold uppercase">Dec</div>
                                                    <div className="text-lg font-mono font-black text-white">{parseInt(bitsToHex(fieldSegments[selectedField].bitValues), 16)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Bit Grid */}
                        <div className="space-y-3">
                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                Bit-Level View ({totalBits} bits)
                            </div>
                            <div className="p-4 sm:p-6 bg-black/40 rounded-2xl border border-white/5 overflow-x-auto">
                                <div className="flex flex-wrap gap-[3px] min-w-0">
                                    {frameBits.map((bit, i) => {
                                        const field = STANDARD_FRAME_FIELDS[bit.fieldIndex];
                                        const isFieldHovered = hoveredField !== null && fieldSegments[hoveredField]?.field === field;
                                        const isFieldSelected = selectedField !== null && fieldSegments[selectedField]?.field === field;
                                        return (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "w-6 h-8 sm:w-7 sm:h-9 rounded flex flex-col items-center justify-center font-mono text-[10px] sm:text-xs font-bold transition-all duration-150 border cursor-default",
                                                    isFieldHovered || isFieldSelected
                                                        ? cn(field.bgColor, field.borderColor, field.color, "brightness-125")
                                                        : bit.value === 1
                                                            ? cn("bg-white/[0.06] border-white/[0.08] text-white/70")
                                                            : cn("bg-dark-900 border-white/[0.03] text-gray-600"),
                                                )}
                                                onMouseEnter={() => {
                                                    const idx = fieldSegments.findIndex(s => s.field === field);
                                                    setHoveredField(idx);
                                                }}
                                                onMouseLeave={() => setHoveredField(null)}
                                                title={`${field.name} - Bit ${i}`}
                                            >
                                                {bit.value}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Bottom Grid: Bit Stuffing + CRC Engine ───────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Bit Stuffing Lab */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="p-6 sm:p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-cyber-purple/20 border border-cyber-purple/30 flex items-center justify-center">
                                        <Zap size={16} className="text-cyber-purple" />
                                    </div>
                                    Bit-Stuffing Lab
                                </h3>
                                <button
                                    onClick={() => setShowBitStuffing(!showBitStuffing)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                                        showBitStuffing
                                            ? "bg-cyber-purple/15 border-cyber-purple/30 text-cyber-purple"
                                            : "bg-white/5 border-white/5 text-gray-500"
                                    )}
                                >
                                    {showBitStuffing ? 'Active' : 'Inactive'}
                                </button>
                            </div>

                            {showBitStuffing && (
                                <>
                                    {/* Rule callout */}
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-cyber-purple/5 border border-cyber-purple/15">
                                        <AlertCircle size={14} className="text-cyber-purple shrink-0 mt-0.5" />
                                        <div className="text-[11px] text-gray-400">
                                            <span className="font-bold text-cyber-purple">Rule:</span> After 5 consecutive identical bits, a complementary bit is inserted to maintain synchronization.
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-center">
                                            <div className="text-[9px] text-gray-500 font-bold uppercase">Original</div>
                                            <div className="text-xl font-mono font-black text-white">{stuffingResult.stuffed.length - stuffingResult.stuffIndices.length}</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-cyber-purple/10 border border-cyber-purple/20 text-center">
                                            <div className="text-[9px] text-cyber-purple font-bold uppercase">Stuffed</div>
                                            <div className="text-xl font-mono font-black text-cyber-purple">{stuffingResult.stuffIndices.length}</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-center">
                                            <div className="text-[9px] text-gray-500 font-bold uppercase">Total</div>
                                            <div className="text-xl font-mono font-black text-white">{stuffingResult.stuffed.length}</div>
                                        </div>
                                    </div>

                                    {/* Stuffed stream */}
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                            Stuffed Bitstream
                                        </div>
                                        <div className="p-4 bg-black/40 rounded-2xl border border-white/5 max-h-48 overflow-y-auto">
                                            <div className="flex flex-wrap gap-[3px]">
                                                {stuffingResult.stuffed.map((bit, i) => {
                                                    const isStuffBit = stuffingResult.stuffIndices.includes(i);
                                                    return (
                                                        <div
                                                            key={i}
                                                            className={cn(
                                                                "w-6 h-7 rounded flex items-center justify-center font-mono text-[10px] font-bold transition-all border",
                                                                isStuffBit
                                                                    ? "bg-cyber-purple/25 border-cyber-purple/40 text-cyber-purple shadow-[0_0_10px_rgba(189,0,255,0.25)] ring-1 ring-cyber-purple/30"
                                                                    : bit === 1
                                                                        ? "bg-white/[0.06] border-white/[0.08] text-white/60"
                                                                        : "bg-dark-900 border-white/[0.03] text-gray-600"
                                                            )}
                                                        >
                                                            {bit}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>

                        {/* CRC Engine */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-cyber-blue/[0.03] to-transparent border border-cyber-blue/10 space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-cyber-blue/20 border border-cyber-blue/30 flex items-center justify-center">
                                        <Hexagon size={16} className="text-cyber-blue" />
                                    </div>
                                    CRC Engine
                                </h3>
                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                    {(['CRC15', 'CRC17', 'CRC21'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setCrcType(type)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase",
                                                crcType === type
                                                    ? "bg-cyber-blue text-black shadow-[0_0_10px_rgba(0,243,255,0.3)]"
                                                    : "text-gray-500 hover:text-white"
                                            )}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Polynomial info */}
                            <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Polynomial</span>
                                    <span className="text-cyber-blue font-mono font-bold text-sm">
                                        {crcType === 'CRC15' ? '0x4599' : crcType === 'CRC17' ? '0x3685B' : '0x302899'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Standard</span>
                                    <span className="text-gray-300 font-medium">
                                        {crcType === 'CRC15' ? 'Classic CAN (ISO 11898)' : crcType === 'CRC17' ? 'CAN FD (\u226416B payload)' : 'CAN FD (>16B payload)'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Bit Width</span>
                                    <span className="text-gray-300 font-mono font-medium">
                                        {crcType === 'CRC15' ? '15' : crcType === 'CRC17' ? '17' : '21'} bits
                                    </span>
                                </div>
                            </div>

                            {/* CRC Result */}
                            <div className="flex flex-col items-center justify-center p-8 bg-cyber-blue/[0.06] rounded-2xl border border-cyber-blue/20 relative overflow-hidden group">
                                <RefreshCw className="absolute top-3 right-3 text-cyber-blue/10 group-hover:rotate-180 transition-transform duration-700" size={32} />
                                <div className="text-[10px] font-black text-cyber-blue uppercase tracking-[0.3em] mb-3">Calculated CRC</div>
                                <div className="text-4xl sm:text-5xl font-mono text-white font-black tracking-tight">
                                    0x{crcValue.toString(16).toUpperCase().padStart(crcType === 'CRC15' ? 4 : crcType === 'CRC17' ? 5 : 6, '0')}
                                </div>
                                <div className="text-[10px] text-gray-500 font-mono mt-2">
                                    Binary: {crcValue.toString(2).padStart(crcType === 'CRC15' ? 15 : crcType === 'CRC17' ? 17 : 21, '0')}
                                </div>
                            </div>

                            {/* CRC bits visualized */}
                            <div className="space-y-2">
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">CRC Bit Sequence</div>
                                <div className="flex flex-wrap gap-[3px] p-4 bg-black/30 rounded-xl border border-white/5">
                                    {crcValue.toString(2).padStart(
                                        crcType === 'CRC15' ? 15 : crcType === 'CRC17' ? 17 : 21, '0'
                                    ).split('').map((bit, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-6 h-7 rounded flex items-center justify-center font-mono text-[10px] font-bold border",
                                                bit === '1'
                                                    ? "bg-orange-500/15 border-orange-500/25 text-orange-400"
                                                    : "bg-dark-900 border-white/[0.03] text-gray-600"
                                            )}
                                        >
                                            {bit}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* ── Protocol Reference Cards ─────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                    >
                        {[
                            {
                                icon: <CheckCircle2 size={16} />,
                                iconColor: 'text-cyber-green',
                                bgColor: 'bg-cyber-green/5',
                                borderColor: 'border-cyber-green/15',
                                title: 'CRC Integrity',
                                desc: 'CAN uses polynomial division to detect up to 5 bit errors in a frame, with Hamming Distance of 6.'
                            },
                            {
                                icon: <Zap size={16} />,
                                iconColor: 'text-cyber-purple',
                                bgColor: 'bg-cyber-purple/5',
                                borderColor: 'border-cyber-purple/15',
                                title: 'Bit Stuffing',
                                desc: 'After 5 identical bits, a complementary bit is inserted to maintain clock sync between nodes.'
                            },
                            {
                                icon: <Info size={16} />,
                                iconColor: 'text-cyber-blue',
                                bgColor: 'bg-cyber-blue/5',
                                borderColor: 'border-cyber-blue/15',
                                title: 'Arbitration',
                                desc: 'Non-destructive bitwise arbitration. Dominant (0) wins over Recessive (1). Lower ID = higher priority.'
                            },
                            {
                                icon: <AlertCircle size={16} />,
                                iconColor: 'text-amber-400',
                                bgColor: 'bg-amber-500/5',
                                borderColor: 'border-amber-500/15',
                                title: 'Error Handling',
                                desc: 'Nodes track TEC/REC counters. Error Active → Error Passive → Bus Off state machine.'
                            },
                        ].map((card, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "p-5 rounded-2xl border space-y-3 transition-all hover:scale-[1.02]",
                                    card.bgColor, card.borderColor
                                )}
                            >
                                <div className={cn("flex items-center gap-2", card.iconColor)}>
                                    {card.icon}
                                    <span className="text-xs font-black uppercase tracking-widest text-white">{card.title}</span>
                                </div>
                                <p className="text-[11px] text-gray-400 leading-relaxed">{card.desc}</p>
                            </div>
                        ))}
                    </motion.div>

                    {/* ── Navigation ───────────────────────────────────── */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => window.location.href = '/signals'}
                            className="flex-1 p-5 rounded-2xl bg-gradient-to-r from-cyber-green/15 to-cyber-blue/15 border border-cyber-green/20 text-white font-black uppercase tracking-widest flex items-center justify-between group hover:scale-[1.01] active:scale-[0.99] transition-all"
                        >
                            <span className="text-sm italic">Signals Lab</span>
                            <ArrowRight className="group-hover:translate-x-2 transition-transform" size={18} />
                        </button>
                        <button
                            onClick={() => window.location.href = '/arbitration'}
                            className="flex-1 p-5 rounded-2xl bg-gradient-to-r from-cyber-purple/15 to-cyber-pink/15 border border-cyber-purple/20 text-white font-black uppercase tracking-widest flex items-center justify-between group hover:scale-[1.01] active:scale-[0.99] transition-all"
                        >
                            <span className="text-sm italic">Arbitration Lab</span>
                            <ArrowRight className="group-hover:translate-x-2 transition-transform" size={18} />
                        </button>
                    </div>
                </div>
            </Container>
        </div>
    );
}
