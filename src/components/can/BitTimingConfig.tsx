import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTestBench } from '../../context/TestBenchContext';
import {
    BIT_TIMING_PRESETS,
    DEFAULT_BIT_TIMING_PRESET,
    computeSamplePointPct,
    findBitTimingPresetForTiming,
    type BitTiming,
    type BitTimingPreset,
} from '../../types/testbench';

export type { BitTiming };

type Preset = BitTimingPreset;

// Shake animation for constraint violation
const shakeVariants = {
    shake: {
        x: [-4, 4, -4, 4, 0],
        transition: { duration: 0.4 }
    },
    normal: {
        x: 0
    }
};

// ─── BTR Register Encoding (MCP2515-style) ──────────────────
function encodeRegisters(t: BitTiming) {
    // BTR0: [SJW1 SJW0 BRP5 BRP4 BRP3 BRP2 BRP1 BRP0]
    // BTR1: [SAM TSEG22 TSEG21 TSEG20 TSEG12 TSEG11 TSEG10 TSEG0]
    const sjwBits = ((t.sjw - 1) & 0x03) << 6;
    const brpBits = (t.brp - 1) & 0x3F;
    const btr0 = sjwBits | brpBits;

    const tseg1 = (t.prop + t.phase1 - 1) & 0x0F;
    const tseg2 = ((t.phase2 - 1) & 0x07) << 4;
    const btr1 = tseg2 | tseg1;

    return { btr0, btr1 };
}

function decodeRegisters(btr0: number, btr1: number, oscillatorResource: number): BitTiming {
    const sjw = ((btr0 >> 6) & 0x03) + 1;
    const brp = (btr0 & 0x3F) + 1;
    const tseg2 = ((btr1 >> 4) & 0x07) + 1;
    const tseg1 = (btr1 & 0x0F) + 1;

    // Split tseg1 into prop and phase1. 
    const prop = Math.max(1, Math.floor(tseg1 / 2));
    const phase1 = Math.max(1, tseg1 - prop);

    return {
        sync: 1,
        prop,
        phase1,
        phase2: tseg2,
        sjw,
        brp,
        oscillator: oscillatorResource
    };
}

function toHex(n: number) {
    return '0x' + n.toString(16).toUpperCase().padStart(2, '0');
}

function toBin(n: number) {
    return n.toString(2).padStart(8, '0');
}

export const BitTimingConfig: React.FC = () => {
    const [copiedReg, setCopiedReg] = useState<string | null>(null);
    const [constraintViolation, setConstraintViolation] = useState(false);

    const bench = useTestBench();
    const timing = bench?.bitTiming ?? DEFAULT_BIT_TIMING_PRESET.timing;
    const activePreset = useMemo(() => findBitTimingPresetForTiming(timing)?.name ?? null, [timing]);

    const totalTq = timing.sync + timing.prop + timing.phase1 + timing.phase2;
    const samplePoint = bench?.samplePointPct ?? computeSamplePointPct(timing);
    const regs = useMemo(() => encodeRegisters(timing), [timing]);

    const analysis = useMemo(() => {
        const sp = samplePoint;
        if (sp >= 75 && sp <= 90) return { quality: 'PASS' as const, color: '#22c55e', msg: 'Within ISO 11898-1 recommended range (75-90%)' };
        if (sp >= 60 && sp <= 95) return { quality: 'WARN' as const, color: '#eab308', msg: 'Outside optimal range. May work at lower bitrates.' };
        return { quality: 'FAIL' as const, color: '#ef4444', msg: 'Out of specification. Synchronization failures likely.' };
    }, [samplePoint]);

    const sjwValid = timing.sjw <= Math.min(timing.phase1, timing.phase2);
    const sjwMax = Math.min(timing.phase1, timing.phase2);

    const handleChange = (key: keyof BitTiming, value: number) => {
        if (!bench) return;
        bench.setBitTiming({ ...timing, [key]: value });

        // Trigger constraint violation feedback
        if (key === 'sjw' && value > sjwMax) {
            setConstraintViolation(true);
            setTimeout(() => setConstraintViolation(false), 500);
        }
    };

    const applyPreset = (preset: Preset) => {
        bench?.setBitTiming(preset.timing);
    };

    const handleCopyRegister = async (reg: string, value: number) => {
        const hex = '0x' + value.toString(16).toUpperCase().padStart(2, '0');
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(hex);
            setCopiedReg(reg);
            setTimeout(() => setCopiedReg(null), 1400);
        }
    };

    const handleHexEdit = (reg: 'BTR0' | 'BTR1', hex: string) => {
        const val = parseInt(hex.replace('0x', ''), 16);
        if (isNaN(val) || val < 0 || val > 255) return;

        const currentRegs = encodeRegisters(timing);
        const nextRegs = { ...currentRegs, [reg.toLowerCase()]: val };
        const nextTiming = decodeRegisters(nextRegs.btr0, nextRegs.btr1, timing.oscillator);
        bench?.setBitTiming(nextTiming);
    };

    const handleReset = () => {
        bench?.setBitTiming(DEFAULT_BIT_TIMING_PRESET.timing);
        setConstraintViolation(false);
        setCopiedReg(null);
    };

    return (
        <div className="bg-[#1a1a1e] rounded-2xl border border-[#2a2a30] p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
            {/* Equipment label */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-black text-[#f1f1f1] tracking-widest uppercase">CAN-CTRL</span>
                    <span className="text-[8px] font-mono text-gray-500 tracking-wider">BIT TIMING REGISTER CONFIG</span>
                </div>
                <div className="flex items-center gap-3">
                    <motion.button
                        onClick={handleReset}
                        className="px-2 py-1 rounded text-[8px] font-mono font-bold transition-all active:scale-95"
                        style={{
                            color: '#ff9f43',
                            backgroundColor: '#ff9f4310',
                            border: '1px solid #ff9f4330',
                        }}
                        whileHover={{ backgroundColor: '#ff9f4320' }}
                        title="Reset to default configuration"
                    >
                        ↻ RESET
                    </motion.button>
                    <div className="flex items-center gap-2">
                        <motion.div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: analysis.color, boxShadow: `0 0 4px ${analysis.color}` }}
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span className="text-[8px] font-mono" style={{ color: analysis.color }}>{analysis.quality}</span>
                    </div>
                </div>
            </div>

            {/* Preset Tab Strip */}
            <PresetTabStrip
                presets={BIT_TIMING_PRESETS}
                activePreset={activePreset}
                onApply={applyPreset}
            />
            <div className="mb-4" />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* ─── Left: Register View ─── */}
                <div className="xl:col-span-4 space-y-3">
                    {/* Preset Selection */}
                    <div className="p-3 rounded-lg bg-[#0c0c0e] border border-[#222]">
                        <span className="text-[7px] font-mono font-bold text-gray-400 uppercase tracking-widest block mb-2">BAUD RATE PRESETS</span>
                        <div className="grid grid-cols-2 gap-1.5">
                            {BIT_TIMING_PRESETS.map(p => (
                                <button
                                    key={p.name}
                                    onClick={() => applyPreset(p)}
                                    className={`px-2 py-1.5 rounded text-[8px] font-mono font-bold transition-all active:scale-95 ${activePreset === p.name
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
                        <span className="text-[7px] font-mono font-bold text-gray-400 uppercase tracking-widest block mb-2">REGISTER VALUES (MCP2515)</span>

                        <RegisterRow
                            name="BTR0"
                            hex={toHex(regs.btr0)}
                            binary={toBin(regs.btr0)}
                            fields={[
                                { bits: '7:6', name: 'SJW', value: timing.sjw - 1, color: '#9ca3af' },
                                { bits: '5:0', name: 'BRP', value: timing.brp - 1, color: '#6b7280' },
                            ]}
                            onCopy={handleCopyRegister}
                            onEdit={(val) => handleHexEdit('BTR0', val)}
                            isCopied={copiedReg === 'BTR0'}
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
                            onCopy={handleCopyRegister}
                            onEdit={(val) => handleHexEdit('BTR1', val)}
                            isCopied={copiedReg === 'BTR1'}
                        />
                    </div>

                    {/* Timing Summary */}
                    <div className="p-3 rounded-lg bg-[#0c0c0e] border border-[#222]">
                        <span className="text-[7px] font-mono font-bold text-gray-400 uppercase tracking-widest block mb-2">COMPUTED PARAMETERS</span>
                        {[
                            { k: 'Total TQ/bit', v: `${totalTq}`, u: 'TQ' },
                            { k: 'Sample Point', v: samplePoint.toFixed(1), u: '%', color: analysis.color },
                            { k: 'TSEG1 (PROP+PH1)', v: `${timing.prop + timing.phase1}`, u: 'TQ' },
                            { k: 'TSEG2 (PH2)', v: `${timing.phase2}`, u: 'TQ' },
                            { k: 'SJW', v: `${timing.sjw}`, u: 'TQ', color: sjwValid ? undefined : '#ef4444' },
                        ].map(row => (
                            <div key={row.k} className="flex justify-between items-center py-0.5">
                                <span className="text-[7px] font-mono text-gray-400">{row.k}</span>
                                <span className="text-[9px] font-mono font-bold" style={{ color: row.color || '#f1f1f1' }}>
                                    {row.v} <span className="text-gray-500 font-normal">{row.u}</span>
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
                        <span className="text-[7px] font-mono font-bold text-gray-400 uppercase tracking-widest block mb-2">BIT TIMING DIAGRAM</span>

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
                                        <span className="text-[7px] font-mono text-gray-500">{seg.tq}TQ</span>
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
                                        <span className="text-[8px] font-mono text-gray-600">{i + 1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SP quality bar */}
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-[7px] font-mono text-gray-500">SP RANGE</span>
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
                            <div className="flex gap-2 text-[9px] font-mono text-gray-400">
                                <span>0%</span>
                                <span className="text-green-500/60">75%</span>
                                <span className="text-green-500/60">90%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── Parameter Adjustment (Sliders) ─── */}
                    <div className="p-3 rounded-lg bg-[#0c0c0e] border border-[#222]">
                        <span className="text-[7px] font-mono font-bold text-gray-400 uppercase tracking-widest block mb-3">SEGMENT CONFIGURATION</span>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <SegmentSlider
                                label="PROP SEG"
                                color="#3b82f6"
                                value={timing.prop}
                                max={8}
                                onChange={(v) => handleChange('prop', v)}
                                description="Signal propagation compensation"
                            />
                            <SegmentSlider
                                label="PHASE SEG 1"
                                color="#00f3ff"
                                value={timing.phase1}
                                max={8}
                                onChange={(v) => handleChange('phase1', v)}
                                description="Pre-sample buffer (resync +)"
                            />
                            <SegmentSlider
                                label="PHASE SEG 2"
                                color="#bf00ff"
                                value={timing.phase2}
                                max={8}
                                onChange={(v) => handleChange('phase2', v)}
                                description="Post-sample buffer (resync -)"
                            />
                            <motion.div
                                animate={constraintViolation ? 'shake' : 'normal'}
                                variants={shakeVariants}
                            >
                                <SegmentSlider
                                    label="SJW"
                                    color={!sjwValid ? '#ef4444' : '#9ca3af'}
                                    value={timing.sjw}
                                    max={4}
                                    onChange={(v) => handleChange('sjw', v)}
                                    description={`Max resync jump width (≤ ${sjwMax} TQ)`}
                                />
                                {!sjwValid && (
                                    <div className="mt-2 p-1.5 rounded bg-[#1c0a0a] border border-red-900/30">
                                        <span className="text-[7px] font-mono text-red-400">
                                            ⚠ SJW ({timing.sjw}) exceeds min(PH1,PH2) = {sjwMax}
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                            <SegmentSlider
                                label="BITRATE PRESCALER (BRP)"
                                color="#6b7280"
                                value={timing.brp}
                                max={64}
                                onChange={(v) => handleChange('brp', v)}
                                description="Baud rate prescaler (Tq = 2 * BRP / Fosc)"
                            />
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-[#9ca3af]">
                                        OSCILLATOR FREQUENCY
                                    </span>
                                    <span className="text-[8px] font-mono text-gray-500">Fosc</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                    {[8, 16, 20, 24, 40].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => handleChange('oscillator', f * 1_000_000)}
                                            className={`px-1 py-1.5 rounded text-[8px] font-mono font-bold border transition-all ${timing.oscillator === f * 1_000_000
                                                ? 'bg-[#00f3ff10] text-[#00f3ff] border-[#00f3ff40]'
                                                : 'bg-[#111] text-gray-400 border-[#222] hover:border-gray-600'
                                                }`}
                                        >
                                            {f} MHz
                                        </button>
                                    ))}
                                </div>
                                <span className="text-[9px] font-mono text-gray-500 block">Controller clock source</span>
                            </div>
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

// ─── Preset Tab Strip Component ─────────────────────────────
const PresetTabStrip: React.FC<{
    presets: readonly Preset[];
    activePreset: string | null;
    onApply: (preset: Preset) => void;
}> = ({ presets, activePreset, onApply }) => {

    return (
        <div className="p-3 rounded-lg bg-[#0c0c0e] border border-[#222] mb-4">
            <span className="text-[7px] font-mono font-bold text-gray-400 uppercase tracking-widest block mb-2">BAUD RATE PRESETS</span>
            <div className="relative flex gap-1">
                <div className="flex gap-1 w-full">
                    {presets.map(preset => (
                        <button
                            key={preset.name}
                            onClick={() => onApply(preset)}
                            className="relative flex-1 px-2 py-2 rounded text-[8px] font-mono font-bold transition-all active:scale-95"
                            style={{
                                color: activePreset === preset.name ? '#00f3ff' : '#888',
                                zIndex: activePreset === preset.name ? 1 : 0,
                            }}
                        >
                            <div className="leading-none">
                                <div className="text-[9px] font-bold">{preset.name.split(' ')[0]}</div>
                                <div className="text-[7px] opacity-60">{preset.clock}</div>
                            </div>
                            {activePreset === preset.name && (
                                <motion.div
                                    layoutId="preset-pill"
                                    className="absolute inset-0 rounded bg-[#00f3ff08] border border-[#00f3ff40]"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    style={{ zIndex: -1 }}
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Segment Slider Component ─────────────────────────────
interface SegmentSliderProps {
    label: string;
    color: string;
    value: number;
    max: number;
    onChange: (value: number) => void;
    description: string;
}

const SegmentSlider: React.FC<SegmentSliderProps> = ({ label, color, value, max, onChange, description }) => {
    const [isDragging, setIsDragging] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newValue = Math.max(1, Math.min(max, Math.round(percent * max)));
        onChange(newValue);
        setIsDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newValue = Math.max(1, Math.min(max, Math.round(percent * max)));
        onChange(newValue);
    };

    const handlePointerUp = () => {
        setIsDragging(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        let newValue = value;
        if (e.key === 'ArrowLeft') newValue = Math.max(1, value - 1);
        if (e.key === 'ArrowRight') newValue = Math.min(max, value + 1);
        if (e.key === 'ArrowDown') newValue = Math.max(1, value - (e.ctrlKey ? 5 : 1));
        if (e.key === 'ArrowUp') newValue = Math.min(max, value + (e.ctrlKey ? 5 : 1));
        if (newValue !== value) {
            e.preventDefault();
            onChange(newValue);
        }
    };

    const percent = (value / max) * 100;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[7px] font-mono font-bold uppercase tracking-wider" style={{ color }}>
                    {label}
                </span>
                <span className="text-[8px] font-mono text-gray-500">max {max}</span>
            </div>

            <div
                ref={trackRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onKeyDown={handleKeyDown}
                className="relative h-8 bg-[#080808] border border-[#1a1a20] rounded cursor-pointer group overflow-hidden"
                tabIndex={0}
                role="slider"
                aria-label={label}
                aria-valuenow={value}
                aria-valuemin={1}
                aria-valuemax={max}
            >
                {/* Filled track */}
                <motion.div
                    className="absolute h-full rounded-l"
                    style={{ backgroundColor: `${color}15`, width: `${percent}%` }}
                    animate={{ width: `${percent}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                />

                {/* Tick marks */}
                <div className="absolute inset-0 flex">
                    {Array.from({ length: max }, (_, i) => (
                        <div
                            key={i}
                            className="flex-1 border-r border-[#1a1a2e]/50"
                            style={{
                                opacity: (i + 1) % 2 === 0 ? 0.5 : 0,
                            }}
                        />
                    ))}
                </div>

                {/* Thumb */}
                <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-6 rounded-sm transition-colors"
                    style={{
                        backgroundColor: color,
                        left: `${percent}%`,
                        transform: 'translate(-50%, -50%)',
                        boxShadow: isDragging ? `0 0 12px ${color}60` : `0 0 4px ${color}40`,
                    }}
                    animate={{
                        boxShadow: isDragging ? `0 0 12px ${color}60` : `0 0 4px ${color}40`,
                    }}
                />

                {/* Value badge */}
                <motion.div
                    className="absolute -top-7 px-2 py-0.5 rounded text-[8px] font-mono font-bold whitespace-nowrap pointer-events-none"
                    style={{
                        backgroundColor: color,
                        color: '#000',
                        left: `${percent}%`,
                        transform: 'translateX(-50%)',
                    }}
                    animate={{ opacity: isDragging ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {value} TQ
                </motion.div>
            </div>

            <span className="text-[9px] font-mono text-gray-500 block">{description}</span>
        </div>
    );
};

// ─── Register Row Component (Enhanced) ─────────────────────────────
const RegisterRow: React.FC<{
    name: string;
    hex: string;
    binary: string;
    fields: { bits: string; name: string; value: number; color: string }[];
    onCopy: (reg: string, value: number) => void;
    onEdit: (hex: string) => void;
    isCopied: boolean;
}> = ({ name, hex, binary, fields, onCopy, onEdit, isCopied }) => {
    const hexValue = parseInt(hex, 16);
    const [isEditing, setIsEditing] = useState(false);
    const [editVal, setEditVal] = useState(hex);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onEdit(editVal);
        setIsEditing(false);
    };

    return (
        <div className="mb-3 last:mb-0">
            <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-bold text-[#f1f1f1]">{name}</span>
                    {isEditing ? (
                        <form onSubmit={handleSubmit} className="flex items-center">
                            <input
                                autoFocus
                                value={editVal}
                                onChange={(e) => setEditVal(e.target.value)}
                                onBlur={() => setIsEditing(false)}
                                className="bg-[#111] border border-[#00f3ff40] text-[#00f3ff] text-[9px] font-mono font-bold w-12 px-1 rounded outline-none"
                            />
                        </form>
                    ) : (
                        <button
                            onClick={() => { setIsEditing(true); setEditVal(hex); }}
                            className="text-[9px] font-mono font-bold text-[#00f3ff] hover:bg-[#00f3ff10] px-1 rounded transition-colors"
                        >
                            {hex}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <motion.button
                        onClick={() => onCopy(name, hexValue)}
                        className="p-1 rounded text-[8px] font-mono transition-colors"
                        style={{
                            color: isCopied ? '#00ff9f' : '#888',
                            backgroundColor: isCopied ? '#00ff9f10' : 'transparent',
                        }}
                        animate={{
                            backgroundColor: isCopied ? '#00ff9f10' : 'transparent',
                        }}
                    >
                        {isCopied ? '✓' : '⎘'}
                    </motion.button>
                </div>
            </div>

            {/* Binary display */}
            <div className="flex gap-px mb-1.5">
                {binary.split('').map((bit, i) => (
                    <div
                        key={i}
                        className="w-5 h-5 flex items-center justify-center rounded-sm text-[8px] font-mono font-bold border cursor-help transition-colors"
                        style={{
                            backgroundColor: bit === '1' ? '#00f3ff10' : '#0a0a0a',
                            borderColor: bit === '1' ? '#00f3ff30' : '#1a1a20',
                            color: bit === '1' ? '#00f3ff' : '#444',
                        }}
                        title={`Bit ${7 - i}`}
                    >
                        {bit}
                    </div>
                ))}
            </div>

            {/* Field labels */}
            <div className="flex gap-2 flex-wrap">
                {fields.map(f => (
                    <span key={f.name} className="text-[9px] font-mono" style={{ color: f.color }}>
                        [{f.bits}] {f.name}={f.value}
                    </span>
                ))}
            </div>
        </div>
    );
};
