import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

export interface BitTiming {
    sync: number;
    prop: number;
    phase1: number;
    phase2: number;
    sjw: number;
}

interface Preset {
    name: string;
    clock: string; // oscillator freq label
    timing: BitTiming;
    baudRate: number;
}

const PRESETS: Preset[] = [
    { name: '125 kbit/s', clock: '8 MHz', baudRate: 125000, timing: { sync: 1, prop: 3, phase1: 4, phase2: 4, sjw: 1 } },
    { name: '250 kbit/s', clock: '8 MHz', baudRate: 250000, timing: { sync: 1, prop: 2, phase1: 4, phase2: 3, sjw: 1 } },
    { name: '500 kbit/s', clock: '16 MHz', baudRate: 500000, timing: { sync: 1, prop: 1, phase1: 3, phase2: 3, sjw: 1 } },
    { name: '1 Mbit/s', clock: '16 MHz', baudRate: 1000000, timing: { sync: 1, prop: 1, phase1: 2, phase2: 2, sjw: 1 } },
];

// ─── BTR Register Encoding (MCP2515-style) ──────────────────
function encodeRegisters(t: BitTiming) {
    // BTR0: [SJW1 SJW0 BRP5 BRP4 BRP3 BRP2 BRP1 BRP0]
    // BTR1: [SAM TSEG22 TSEG21 TSEG20 TSEG12 TSEG11 TSEG10 TSEG10]
    // Simplified: BTR0 = SJW in upper 2 bits, BRP in lower 6
    // BTR1 = SAM=0, TSEG2 in bits 6:4, TSEG1 in bits 3:0
    const sjwBits = ((t.sjw - 1) & 0x03) << 6;
    const brp = 0; // BRP=0 for simplicity (1x prescaler)
    const btr0 = sjwBits | (brp & 0x3F);

    const tseg1 = (t.prop + t.phase1 - 1) & 0x0F; // TSEG1 = PROP + PH1 - 1
    const tseg2 = ((t.phase2 - 1) & 0x07) << 4;
    const btr1 = tseg2 | tseg1;

    return { btr0, btr1 };
}

function toHex(n: number) {
    return '0x' + n.toString(16).toUpperCase().padStart(2, '0');
}

function toBin(n: number) {
    return n.toString(2).padStart(8, '0');
}

export const BitTimingConfig: React.FC = () => {
    const [timing, setTiming] = useState<BitTiming>({
        sync: 1,
        prop: 2,
        phase1: 4,
        phase2: 3,
        sjw: 1,
    });
    const [activePreset, setActivePreset] = useState<string | null>(null);

    const totalTq = timing.sync + timing.prop + timing.phase1 + timing.phase2;
    const samplePoint = ((timing.sync + timing.prop + timing.phase1) / totalTq) * 100;
    const regs = useMemo(() => encodeRegisters(timing), [timing]);

    const analysis = useMemo(() => {
        const sp = samplePoint;
        if (sp >= 75 && sp <= 90) return { quality: 'PASS' as const, color: '#22c55e', msg: 'Within ISO 11898-1 recommended range (75-90%)' };
        if (sp >= 60 && sp <= 95) return { quality: 'WARN' as const, color: '#eab308', msg: 'Outside optimal range. May work at lower bitrates.' };
        return { quality: 'FAIL' as const, color: '#ef4444', msg: 'Out of specification. Synchronization failures likely.' };
    }, [samplePoint]);

    const sjwValid = timing.sjw <= Math.min(timing.phase1, timing.phase2);

    const handleChange = (key: keyof BitTiming, value: number) => {
        setTiming(prev => ({ ...prev, [key]: value }));
        setActivePreset(null);
    };

    const applyPreset = (preset: Preset) => {
        setTiming(preset.timing);
        setActivePreset(preset.name);
    };

    return (
        <div className="bg-[#1a1a1e] rounded-2xl border border-[#2a2a30] p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
            {/* Equipment label */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-black text-gray-500 tracking-widest uppercase">CAN-CTRL</span>
                    <span className="text-[8px] font-mono text-gray-700 tracking-wider">BIT TIMING REGISTER CONFIG</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full`}
                        style={{ backgroundColor: analysis.color, boxShadow: `0 0 4px ${analysis.color}` }}
                    />
                    <span className="text-[8px] font-mono" style={{ color: analysis.color }}>{analysis.quality}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* ─── Left: Register View ─── */}
                <div className="xl:col-span-4 space-y-3">
                    {/* Preset Selection */}
                    <div className="p-3 rounded-lg bg-[#0c0c0e] border border-[#222]">
                        <span className="text-[7px] font-mono font-bold text-gray-600 uppercase tracking-widest block mb-2">BAUD RATE PRESETS</span>
                        <div className="grid grid-cols-2 gap-1.5">
                            {PRESETS.map(p => (
                                <button
                                    key={p.name}
                                    onClick={() => applyPreset(p)}
                                    className={`px-2 py-1.5 rounded text-[8px] font-mono font-bold transition-all active:scale-95 ${
                                        activePreset === p.name
                                            ? 'bg-[#00f3ff15] text-[#00f3ff] border border-[#00f3ff40]'
                                            : 'bg-[#111] text-gray-500 border border-[#222] hover:text-gray-300'
                                    }`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Register Display */}
                    <div className="p-3 rounded-lg bg-[#0c0c0e] border border-[#222]">
                        <span className="text-[7px] font-mono font-bold text-gray-600 uppercase tracking-widest block mb-2">REGISTER VALUES (MCP2515)</span>

                        <RegisterRow
                            name="BTR0"
                            hex={toHex(regs.btr0)}
                            binary={toBin(regs.btr0)}
                            fields={[
                                { bits: '7:6', name: 'SJW', value: timing.sjw - 1, color: '#9ca3af' },
                                { bits: '5:0', name: 'BRP', value: 0, color: '#6b7280' },
                            ]}
                        />
                        <RegisterRow
                            name="BTR1"
                            hex={toHex(regs.btr1)}
                            binary={toBin(regs.btr1)}
                            fields={[
                                { bits: '7', name: 'SAM', value: 0, color: '#6b7280' },
                                { bits: '6:4', name: 'TSEG2', value: timing.phase2 - 1, color: '#bf00ff' },
                                { bits: '3:0', name: 'TSEG1', value: timing.prop + timing.phase1 - 1, color: '#00f3ff' },
                            ]}
                        />
                    </div>

                    {/* Timing Summary */}
                    <div className="p-3 rounded-lg bg-[#0c0c0e] border border-[#222]">
                        <span className="text-[7px] font-mono font-bold text-gray-600 uppercase tracking-widest block mb-2">COMPUTED PARAMETERS</span>
                        {[
                            { k: 'Total TQ/bit', v: `${totalTq}`, u: 'TQ' },
                            { k: 'Sample Point', v: samplePoint.toFixed(1), u: '%', color: analysis.color },
                            { k: 'TSEG1 (PROP+PH1)', v: `${timing.prop + timing.phase1}`, u: 'TQ' },
                            { k: 'TSEG2 (PH2)', v: `${timing.phase2}`, u: 'TQ' },
                            { k: 'SJW', v: `${timing.sjw}`, u: 'TQ', color: sjwValid ? undefined : '#ef4444' },
                        ].map(row => (
                            <div key={row.k} className="flex justify-between items-center py-0.5">
                                <span className="text-[7px] font-mono text-gray-600">{row.k}</span>
                                <span className="text-[9px] font-mono font-bold" style={{ color: row.color || '#ccc' }}>
                                    {row.v} <span className="text-gray-600 font-normal">{row.u}</span>
                                </span>
                            </div>
                        ))}

                        {!sjwValid && (
                            <div className="mt-2 p-1.5 rounded bg-[#1c0a0a] border border-red-900/30">
                                <span className="text-[7px] font-mono text-red-400">
                                    SJW ({timing.sjw}) {'>'} min(PH1,PH2) = {Math.min(timing.phase1, timing.phase2)} — ISO violation
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Center+Right: Visual + Sliders ─── */}
                <div className="xl:col-span-8 space-y-4">
                    {/* Timing Visual Bar */}
                    <div className="p-3 rounded-lg bg-[#0c0c0e] border border-[#222]">
                        <span className="text-[7px] font-mono font-bold text-gray-600 uppercase tracking-widest block mb-2">BIT TIMING DIAGRAM</span>

                        <div className="relative">
                            {/* Segment bar */}
                            <div className="relative h-12 w-full rounded-md overflow-hidden flex bg-[#080808] border border-[#1a1a20]">
                                {[
                                    { key: 'sync', label: 'SYNC', tq: timing.sync, color: '#6b7280', bg: 'rgba(107,114,128,0.15)' },
                                    { key: 'prop', label: 'PROP', tq: timing.prop, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
                                    { key: 'phase1', label: 'PH1', tq: timing.phase1, color: '#00f3ff', bg: 'rgba(0,243,255,0.12)' },
                                    { key: 'phase2', label: 'PH2', tq: timing.phase2, color: '#bf00ff', bg: 'rgba(191,0,255,0.12)' },
                                ].map((seg, i) => (
                                    <motion.div
                                        key={seg.key}
                                        className="h-full flex flex-col items-center justify-center overflow-hidden"
                                        style={{
                                            backgroundColor: seg.bg,
                                            borderLeft: i > 0 ? `1px solid ${seg.color}30` : 'none',
                                        }}
                                        animate={{ width: `${(seg.tq / totalTq) * 100}%` }}
                                        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                                    >
                                        <span className="text-[8px] font-mono font-bold whitespace-nowrap" style={{ color: seg.color }}>{seg.label}</span>
                                        <span className="text-[7px] font-mono text-gray-600">{seg.tq}TQ</span>
                                    </motion.div>
                                ))}

                                {/* Sample Point Marker */}
                                <motion.div
                                    className="absolute top-0 bottom-0 w-[2px] z-10"
                                    animate={{ left: `${samplePoint}%` }}
                                    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                                    style={{
                                        backgroundColor: analysis.color,
                                        boxShadow: `0 0 8px ${analysis.color}60`,
                                    }}
                                >
                                    <div
                                        className="absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded text-[7px] font-mono font-bold whitespace-nowrap"
                                        style={{ backgroundColor: analysis.color, color: '#0a0a0f' }}
                                    >
                                        SP {samplePoint.toFixed(1)}%
                                    </div>
                                    <div
                                        className="absolute -top-1 -translate-x-[3px] w-0 h-0"
                                        style={{
                                            borderLeft: '3px solid transparent',
                                            borderRight: '3px solid transparent',
                                            borderTop: `3px solid ${analysis.color}`,
                                        }}
                                    />
                                </motion.div>
                            </div>

                            {/* TQ ruler */}
                            <div className="flex mt-1">
                                {Array.from({ length: totalTq }, (_, i) => (
                                    <div key={i} className="flex-1 text-center">
                                        <div className="w-px h-1 bg-gray-800 mx-auto" />
                                        <span className="text-[5px] font-mono text-gray-700">{i + 1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SP quality bar */}
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-[7px] font-mono text-gray-600">SP RANGE</span>
                            <div className="flex-1 h-2 rounded-full bg-[#111] relative overflow-hidden">
                                {/* Optimal zone */}
                                <div className="absolute h-full bg-green-500/10" style={{ left: '75%', width: '15%' }} />
                                {/* Current SP marker */}
                                <motion.div
                                    className="absolute top-0 bottom-0 w-1 rounded-full"
                                    style={{ backgroundColor: analysis.color, boxShadow: `0 0 4px ${analysis.color}` }}
                                    animate={{ left: `${samplePoint}%` }}
                                    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                                />
                            </div>
                            <div className="flex gap-2 text-[6px] font-mono text-gray-600">
                                <span>0%</span>
                                <span className="text-green-500/60">75%</span>
                                <span className="text-green-500/60">90%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── Parameter Adjustment ─── */}
                    <div className="p-3 rounded-lg bg-[#0c0c0e] border border-[#222]">
                        <span className="text-[7px] font-mono font-bold text-gray-600 uppercase tracking-widest block mb-3">SEGMENT CONFIGURATION</span>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { key: 'prop', label: 'PROP SEG', color: '#3b82f6', max: 8, desc: 'Signal propagation compensation' },
                                { key: 'phase1', label: 'PHASE SEG 1', color: '#00f3ff', max: 8, desc: 'Pre-sample buffer (resync +)' },
                                { key: 'phase2', label: 'PHASE SEG 2', color: '#bf00ff', max: 8, desc: 'Post-sample buffer (resync -)' },
                                { key: 'sjw', label: 'SJW', color: '#9ca3af', max: 4, desc: 'Max resync jump width' },
                            ].map(item => (
                                <div key={item.key} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[7px] font-mono font-bold uppercase tracking-wider" style={{ color: item.color }}>{item.label}</span>
                                    </div>
                                    {/* Hardware-style step control */}
                                    <div className="flex items-center">
                                        <button
                                            onClick={() => handleChange(item.key as keyof BitTiming, Math.max(1, timing[item.key as keyof BitTiming] - 1))}
                                            className="w-7 h-8 flex items-center justify-center bg-[#111] border border-[#333] rounded-l text-gray-500 hover:text-white hover:bg-[#1a1a1a] active:bg-[#0a0a0a] transition-all text-[10px] font-mono"
                                        >
                                            -
                                        </button>
                                        <div className="flex-1 h-8 flex items-center justify-center bg-[#080808] border-y border-[#333] min-w-[40px]">
                                            <span className="text-[12px] font-mono font-bold text-white">{timing[item.key as keyof BitTiming]}</span>
                                            <span className="text-[7px] font-mono text-gray-600 ml-1">TQ</span>
                                        </div>
                                        <button
                                            onClick={() => handleChange(item.key as keyof BitTiming, Math.min(item.max, timing[item.key as keyof BitTiming] + 1))}
                                            className="w-7 h-8 flex items-center justify-center bg-[#111] border border-[#333] rounded-r text-gray-500 hover:text-white hover:bg-[#1a1a1a] active:bg-[#0a0a0a] transition-all text-[10px] font-mono"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <span className="text-[6px] font-mono text-gray-700 block">{item.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Analysis message */}
                    <div className="p-2 rounded-lg border flex items-center gap-2"
                        style={{
                            borderColor: `${analysis.color}30`,
                            backgroundColor: `${analysis.color}05`,
                        }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: analysis.color }} />
                        <span className="text-[8px] font-mono" style={{ color: analysis.color }}>{analysis.msg}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Register Row Component ─────────────────────────────────
const RegisterRow: React.FC<{
    name: string;
    hex: string;
    binary: string;
    fields: { bits: string; name: string; value: number; color: string }[];
}> = ({ name, hex, binary, fields }) => (
    <div className="mb-3 last:mb-0">
        <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-mono font-bold text-white">{name}</span>
            <span className="text-[9px] font-mono font-bold text-[#00f3ff]">{hex}</span>
        </div>
        {/* Binary display */}
        <div className="flex gap-px mb-1.5">
            {binary.split('').map((bit, i) => (
                <div
                    key={i}
                    className="w-5 h-5 flex items-center justify-center rounded-sm text-[8px] font-mono font-bold border"
                    style={{
                        backgroundColor: bit === '1' ? '#00f3ff10' : '#0a0a0a',
                        borderColor: bit === '1' ? '#00f3ff30' : '#1a1a20',
                        color: bit === '1' ? '#00f3ff' : '#444',
                    }}
                >
                    {bit}
                </div>
            ))}
        </div>
        {/* Field labels */}
        <div className="flex gap-2 flex-wrap">
            {fields.map(f => (
                <span key={f.name} className="text-[6px] font-mono" style={{ color: f.color }}>
                    [{f.bits}] {f.name}={f.value}
                </span>
            ))}
        </div>
    </div>
);
