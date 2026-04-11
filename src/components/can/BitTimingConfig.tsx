import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useTestBench } from '../../context/TestBenchContext';
import { useTheme } from '../../context/ThemeContext';
import { RotateCcw, AlertTriangle, ChevronDown } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { cn } from '../../utils/cn';
import {
    BIT_TIMING_PRESETS,
    DEFAULT_BIT_TIMING_PRESET,
    computeSamplePointPct,
    findBitTimingPresetForTiming,
    type BitTiming,
    type BitTimingPreset,
} from '../../types/testbench';
import { 
    encodeRegisters, 
    decodeRegisters, 
    findOptimalTiming 
} from '../../services/can/bit-timing';

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

function toHex(n: number) {
    return n.toString(16).toUpperCase().padStart(2, '0');
}

function toBin(n: number) {
    return n.toString(2).padStart(8, '0');
}



export function BitTimingConfig() {
    const [constraintViolation, setConstraintViolation] = useState(false);
    const [regsExpanded, setRegsExpanded] = useState(false);
    const [hoveredField, setHoveredField] = useState<string | null>(null);
    const [autoTarget, setAutoTarget] = useState('');
    const [autoError, setAutoError] = useState('');
    const [copiedReg, setCopiedReg] = useState<string | null>(null);

    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const shouldReduceMotion = useReducedMotion();

    const bench = useTestBench();
    const timing = bench?.bitTiming ?? DEFAULT_BIT_TIMING_PRESET.timing;
    const activePreset = useMemo(() => findBitTimingPresetForTiming(timing)?.name ?? null, [timing]);

    const [brpInput, setBrpInput] = useState(String(timing.brp));
    const [brpError, setBrpError] = useState<string | null>(null);

    // Update local input when global timing changes
    useEffect(() => {
        setBrpInput(String(timing.brp));
        setBrpError(null);
    }, [timing.brp]);

    const constraintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (constraintTimerRef.current) clearTimeout(constraintTimerRef.current);
            if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        };
    }, []);

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
        const updated = { ...timing, [key]: value };

        // Auto-clamp SJW when phase segments decrease (Issue #275)
        if (key === 'phase1' || key === 'phase2') {
            const newSjwMax = Math.min(updated.phase1, updated.phase2, 4);
            if (updated.sjw > newSjwMax) {
                updated.sjw = newSjwMax;
            }
        }

        bench.setBitTiming(updated);

        // Trigger constraint violation feedback
        if ((key === 'sjw' && value > sjwMax) || 
            ((key === 'phase1' || key === 'phase2') && timing.sjw > Math.min(key === 'phase1' ? value : timing.phase1, key === 'phase2' ? value : timing.phase2))) {
            
            setConstraintViolation(true);
            if (constraintTimerRef.current) clearTimeout(constraintTimerRef.current);
            constraintTimerRef.current = setTimeout(() => {
                setConstraintViolation(false);
                constraintTimerRef.current = null;
            }, 500);
        }
    };

    const handleAutoCalculate = () => {
        const kbps = parseFloat(autoTarget);
        if (isNaN(kbps) || kbps <= 0) {
            setAutoError('Enter a valid kbit/s value');
            return;
        }
        const result = findOptimalTiming(kbps * 1000, timing.oscillator);
        if (result) {
            bench?.setBitTiming(result);
            setAutoError('');
            setAutoTarget('');
        } else {
            setAutoError(`Cannot achieve ${kbps} kbit/s with ${timing.oscillator / 1_000_000}MHz`);
        }
    };

    const handleBrpBlur = () => {
        const val = parseInt(brpInput, 10);
        if (!isNaN(val) && val >= 1 && val <= 64) {
            handleChange('brp', val);
            setBrpError(null);
        } else {
            setBrpError('Valid range: 1–64');
            setBrpInput(String(timing.brp));
        }
    };

    const handleBrpKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBrpBlur();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const next = Math.min(64, timing.brp + 1);
            handleChange('brp', next);
            setBrpInput(String(next));
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = Math.max(1, timing.brp - 1);
            handleChange('brp', next);
            setBrpInput(String(next));
        }
    };

    const applyPreset = (preset: Preset) => {
        bench?.setBitTiming(preset.timing);
        setRegsExpanded(false); // Auto-collapse registers on preset change (Issue #276)
    };

    const handleCopyRegister = async (reg: string, value: number) => {
        const hex = '0x' + value.toString(16).toUpperCase().padStart(2, '0');
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(hex);
                setCopiedReg(reg);
                if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
                copiedTimerRef.current = setTimeout(() => {
                    setCopiedReg(null);
                    copiedTimerRef.current = null;
                }, 2000); // Changed timeout to 2000ms
            } catch (err) {
                console.error('Failed to copy register:', err);
            }
        }
    };

    const handleHexEdit = (reg: 'BTR0' | 'BTR1', hex: string): boolean => {
        const val = parseInt(hex.replace('0x', ''), 16);
        if (isNaN(val) || val < 0 || val > 255) return false;

        const currentRegs = encodeRegisters(timing);
        const nextRegs = { ...currentRegs, [reg.toLowerCase()]: val };
        const nextTiming = decodeRegisters(nextRegs.btr0, nextRegs.btr1, timing.oscillator);
        
        const nextSjwMax = Math.min(nextTiming.phase1, nextTiming.phase2);
        if (nextTiming.sjw > nextSjwMax) {
            setConstraintViolation(true);
            if (constraintTimerRef.current) clearTimeout(constraintTimerRef.current);
            constraintTimerRef.current = setTimeout(() => {
                setConstraintViolation(false);
                constraintTimerRef.current = null;
            }, 500);
            return false;
        }

        bench?.setBitTiming(nextTiming);
        return true;
    };

    const handleReset = () => {
        bench?.setBitTiming(DEFAULT_BIT_TIMING_PRESET.timing);
        setConstraintViolation(false);
        setCopiedReg(null);
    };

    return (
        <div className="bg-white dark:bg-[#1a1a1e] rounded-2xl border border-black/10 dark:border-[#2a2a30] p-4 shadow-sm dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] transition-colors">
            {/* Equipment label */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono font-black text-dark-950 dark:text-[#f1f1f1] tracking-widest uppercase transition-colors">CAN-CTRL</span>
                    <span className="text-[9px] font-mono text-light-500 dark:text-gray-500 tracking-wider transition-colors">BIT TIMING REGISTER CONFIG</span>
                </div>
                <div className="flex items-center gap-3">
                    <motion.button
                        onClick={handleReset}
                        className="px-2 py-1.5 rounded text-[10px] font-mono font-bold transition-all active:scale-95"
                        style={{
                            color: '#ff9f43',
                            backgroundColor: '#ff9f4310',
                            border: '1px solid #ff9f4330',
                        }}
                        whileHover={{ backgroundColor: '#ff9f4320' }}
                        title="Reset to default configuration"
                    >
                        <RotateCcw size={10} className="inline mr-1" /> RESET
                    </motion.button>
                    <div className="flex items-center gap-2">
                        <motion.div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: analysis.color, boxShadow: `0 0 4px ${analysis.color}` }}
                            animate={{ opacity: shouldReduceMotion ? 0.8 : [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: shouldReduceMotion ? 0 : Infinity }}
                            role="img"
                            aria-label={`Status: ${analysis.quality}`}
                        />
                        <span className="text-[11px] font-mono font-bold" style={{ color: analysis.color }}>{analysis.quality}</span>
                    </div>
                </div>
            </div>

            {/* Preset Tab Strip */}
            <PresetTabStrip
                presets={BIT_TIMING_PRESETS}
                activePreset={activePreset}
                onApply={applyPreset}
            />

            {/* Auto Calculate Controls (Issue #279) */}
            <div className="flex items-center gap-2 mt-2 px-1 mb-4">
                <Tooltip content="Automatically find the closest ISO-standard bit timing parameters for a custom bitrate">
                    <span className="text-[9px] font-mono font-black uppercase tracking-wider text-light-500 dark:text-gray-500 cursor-help transition-colors">AUTO-CODE</span>
                </Tooltip>
                <input
                    type="text"
                    placeholder="Custom kbit/s"
                    value={autoTarget}
                    onChange={e => { setAutoTarget(e.target.value); setAutoError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') handleAutoCalculate(); }}
                    className="w-28 h-7 text-center bg-white dark:bg-[#111] border border-black/10 dark:border-[#222] text-dark-900 dark:text-[#f1f1f1] font-mono text-[10px] outline-none focus:border-light-600 dark:focus:border-[#6b7280] rounded transition-colors"
                    aria-label="Target baud rate in kbit/s"
                />
                <button
                    onClick={handleAutoCalculate}
                    className="px-2 py-1 rounded text-[9px] font-mono font-bold border border-[#00f3ff30] text-[#00f3ff] bg-[#00f3ff08] hover:bg-[#00f3ff15] active:scale-95 transition-all"
                >
                    CALC
                </button>
                {autoError && (
                    <span role="alert" className="text-[9px] font-mono text-red-500/80 animate-pulse">{autoError}</span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* ─── Left: Register View ─── */}
                <div className="md:col-span-5 xl:col-span-4 space-y-3">

                    {/* Register Display (Expandable) */}
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0c0c0e] border border-black/5 dark:border-[#222] transition-colors overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-bold text-light-500 dark:text-gray-400 uppercase tracking-widest transition-colors">REGISTER VALUES (MCP2515)</span>
                            <div className="flex items-center gap-2">
                                {!regsExpanded && (
                                    <span className="text-[9px] font-mono text-light-500 dark:text-gray-500 transition-colors">
                                        {toHex(regs.btr0)} | {toHex(regs.btr1)}
                                    </span>
                                )}
                                <button
                                    onClick={() => setRegsExpanded(v => !v)}
                                    className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 text-light-400 dark:text-gray-500 hover:text-light-900 dark:hover:text-[#f1f1f1] transition-all"
                                    aria-expanded={regsExpanded}
                                    aria-label={regsExpanded ? 'Collapse register view' : 'Expand register view'}
                                >
                                    <ChevronDown
                                        size={12}
                                        className={`transition-transform duration-200 ${regsExpanded ? '' : '-rotate-90'}`}
                                    />
                                </button>
                            </div>
                        </div>

                        <AnimatePresence initial={false}>
                            {regsExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    style={{ overflow: 'hidden' }}
                                >
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
                                        isExternalShaking={constraintViolation}
                                        highlightedField={hoveredField}
                                    />
                                    <RegisterRow
                                        name="BTR1"
                                        hex={toHex(regs.btr1)}
                                        binary={toBin(regs.btr1)}
                                        fields={[
                                            { bits: '7', name: 'SAM', value: timing.sam, color: timing.sam === 1 ? '#eab308' : '#6b7280', tooltip: 'Sample Mode: SAM=0 (single), SAM=1 (triple). Triple sampling improves noise immunity by sampling three times per bit and using majority logic. Recommended for ≤125 kbit/s.' },
                                            { bits: '6:4', name: 'TSEG2', value: timing.phase2 - 1, color: '#bf00ff' },
                                            { bits: '3:0', name: 'TSEG1', value: timing.prop + timing.phase1 - 1, color: '#00f3ff' },
                                        ]}
                                        onCopy={handleCopyRegister}
                                        onEdit={(val) => handleHexEdit('BTR1', val)}
                                        isCopied={copiedReg === 'BTR1'}
                                        isExternalShaking={constraintViolation}
                                        highlightedField={hoveredField}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Timing Summary */}
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0c0c0e] border border-black/5 dark:border-[#222] transition-colors">
                        <span className="text-[10px] font-mono font-bold text-light-500 dark:text-gray-400 uppercase tracking-widest block mb-2 transition-colors">COMPUTED PARAMETERS</span>
                        
                        <dl className="grid grid-cols-2 gap-x-2 gap-y-1">
                            {[
                                { k: 'Baud Rate', v: ((bench?.baudRate ?? 0) / 1000).toFixed(0), u: 'kbit/s', featured: true },
                                { k: 'Bit Time', v: bench?.baudRate ? (1_000_000_000 / bench.baudRate).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0', u: 'ns', featured: true },
                                { k: 'Sample Point', v: samplePoint.toFixed(1), u: '%', color: analysis.color, featured: true },
                                { k: 'TQ Duration', v: bench?.baudRate ? (1_000_000_000 / (bench.baudRate * totalTq)).toFixed(1) : '0', u: 'ns' },
                                { k: 'Total TQ/bit', v: `${totalTq}`, u: 'TQ' },
                                { k: 'TSEG1 (PROP+PH1)', v: `${timing.prop + timing.phase1}`, u: 'TQ' },
                                { k: 'TSEG2 (PH2)', v: `${timing.phase2}`, u: 'TQ' },
                                { k: 'SJW', v: `${timing.sjw}`, u: 'TQ', color: sjwValid ? undefined : '#ef4444' },
                            ].map(row => (
                                <React.Fragment key={row.k}>
                                    <dt className={cn(
                                        "font-mono flex items-center transition-colors",
                                        row.featured ? "text-[10px] font-bold text-light-900 dark:text-[#f1f1f1]" : "text-[9px] text-light-500 dark:text-gray-400"
                                    )}>{row.k}</dt>
                                    <dd className="text-right flex items-baseline justify-end gap-1">
                                        <span 
                                            className={cn(
                                                "font-mono font-black transition-all leading-tight tabular-nums",
                                                row.featured ? "text-[15px]" : "text-[9px] font-bold"
                                            )} 
                                            style={{ color: row.color || (isDark ? (row.featured ? '#00f3ff' : '#f1f1f1') : '#0a0a0f') }}
                                        >
                                            {row.v}
                                        </span>
                                        <span className={cn(
                                            "font-mono font-normal transition-colors",
                                            row.featured ? "text-[10px]" : "text-[9px] text-light-400 dark:text-gray-500"
                                        )}>{row.u}</span>
                                    </dd>
                                </React.Fragment>
                            ))}
                        </dl>

                        {!sjwValid && (
                            <div role="alert" className="mt-2 p-1.5 rounded bg-[#1c0a0a] border border-red-900/30">
                                <span className="text-[9px] font-mono text-red-400">
                                    SJW ({timing.sjw}) {'>'} min(PH1,PH2) = {Math.min(timing.phase1, timing.phase2)} — ISO violation
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Center+Right: Visual + Sliders ─── */}
                <div className="md:col-span-7 xl:col-span-8 space-y-4">
                    {/* Timing Visual Bar */}
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0c0c0e] border border-black/5 dark:border-[#222] transition-colors">
                        <Tooltip content="Live visualization of the physical bit bit segments (Nominal Bit Time)">
                            <span className="text-[10px] font-mono font-bold text-light-500 dark:text-gray-400 uppercase tracking-widest block mb-2 transition-colors">BIT TIMING DIAGRAM</span>
                        </Tooltip>

                        <div className="relative">
                            {/* Segment bar */}
                            <div className="relative h-12 w-full rounded-md flex bg-white dark:bg-[#080808] border border-black/5 dark:border-[#1a1a20] overflow-hidden transition-colors">
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
                                        <span className="text-[9px] font-mono font-bold whitespace-nowrap transition-colors" style={{ color: seg.color }}>{seg.label}</span>
                                        <span className="text-[10px] font-mono text-light-400 dark:text-gray-500 transition-colors">{seg.tq}TQ</span>
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
                                        className="absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap"
                                        style={{ backgroundColor: analysis.color, color: isDark ? '#0a0a0f' : '#fff' }}
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
                                        <div className="w-px h-1 bg-gray-200 dark:bg-gray-800 mx-auto transition-colors" />
                                        <span className="text-[9px] font-mono text-light-400 dark:text-gray-600 transition-colors">{i + 1}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SP quality bar */}
                        <div className="mt-3 flex items-center gap-2">
                            <Tooltip content="Sample Point: The moment within a bit period when the bus level is sampled. ISO 11898-1 recommends 75–90%">
                                <span className="text-[9px] font-mono text-light-400 dark:text-gray-500 transition-colors uppercase tracking-tight cursor-help">SP RANGE</span>
                            </Tooltip>
                            <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-[#111] relative overflow-hidden transition-colors">
                                {/* Optimal zone */}
                                <div
                                    className="absolute h-full bg-green-500/25 border-x border-dashed border-green-500/50"
                                    style={{ left: '75%', width: '15%' }}
                                    aria-hidden="true"
                                />
                                {/* Current SP marker */}
                                <motion.div
                                    className="absolute top-0 bottom-0 w-1 rounded-full"
                                    style={{ backgroundColor: analysis.color, boxShadow: `0 0 4px ${analysis.color}` }}
                                    animate={{ left: `${samplePoint}%` }}
                                    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                                />
                            </div>
                            <div className="flex gap-2 text-[9px] font-mono text-light-400 dark:text-gray-400 transition-colors">
                                <span>0%</span>
                                <span className="text-green-500/60">75%</span>
                                <span className="text-green-500/60">90%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── Parameter Adjustment (Sliders) ─── */}
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0c0c0e] border border-black/5 dark:border-[#222] transition-colors">
                        <span className="text-[10px] font-mono font-bold text-light-500 dark:text-gray-400 uppercase tracking-widest block mb-3 transition-colors">SEGMENT CONFIGURATION</span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                onMouseEnter={() => setHoveredField('TSEG1')}
                                onMouseLeave={() => setHoveredField(null)}
                            >
                                <SegmentSlider
                                    label="PROP SEG"
                                    color="#3b82f6"
                                    value={timing.prop}
                                    max={8}
                                    onChange={(v) => handleChange('prop', v)}
                                    description="Prop_Seg (TS1): Compensates for physical delay times within the network (cable, transceiver, controller)."
                                />
                            </div>
                            <div
                                onMouseEnter={() => setHoveredField('TSEG1')}
                                onMouseLeave={() => setHoveredField(null)}
                            >
                                <SegmentSlider
                                    label="PHASE SEG 1"
                                    color="#00f3ff"
                                    value={timing.phase1}
                                    max={8}
                                    onChange={(v) => handleChange('phase1', v)}
                                    description="Phase_Seg1: Buffer before the sample point used for positive resynchronization."
                                />
                            </div>
                            <div
                                onMouseEnter={() => setHoveredField('TSEG2')}
                                onMouseLeave={() => setHoveredField(null)}
                            >
                                <SegmentSlider
                                    label="PHASE SEG 2"
                                    color="#bf00ff"
                                    value={timing.phase2}
                                    max={8}
                                    onChange={(v) => handleChange('phase2', v)}
                                    description="Phase_Seg2: Buffer after the sample point used for negative resynchronization."
                                />
                            </div>
                            <div
                                onMouseEnter={() => setHoveredField('SJW')}
                                onMouseLeave={() => setHoveredField(null)}
                            >
                                <motion.div
                                    animate={constraintViolation ? 'shake' : 'normal'}
                                    variants={shakeVariants}
                                >
                                    <SegmentSlider
                                        label="SJW"
                                        color={!sjwValid ? '#ef4444' : '#9ca3af'}
                                        value={timing.sjw}
                                        max={Math.min(sjwMax, 4)}
                                        onChange={(v) => handleChange('sjw', v)}
                                        description={`Max resync jump width (≤ ${Math.min(sjwMax, 4)} TQ)`}
                                    />
                                    {!sjwValid && (
                                        <div role="alert" className="mt-2 p-1.5 rounded bg-[#1c0a0a] border border-red-900/30">
                                            <span className="text-[10px] font-mono text-red-400 flex items-center gap-1">
                                                <AlertTriangle size={10} /> SJW ({timing.sjw}) exceeds min(PH1,PH2) = {sjwMax}
                                            </span>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                            <div 
                                className="space-y-2"
                                onMouseEnter={() => setHoveredField('BRP')}
                                onMouseLeave={() => setHoveredField(null)}
                            >
                                <div className="flex items-center justify-between">
                                    <Tooltip content="Baud Rate Prescaler: Scales the controller clock (Fosc) to determine the Time Quanta (TQ) duration">
                                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-light-500 dark:text-[#6b7280] transition-colors cursor-help">
                                            BITRATE PRESCALER (BRP)
                                        </span>
                                    </Tooltip>
                                    <span className="text-[9px] font-mono text-light-400 dark:text-gray-500 transition-colors">1 – 64</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleChange('brp', Math.max(1, timing.brp - 1))}
                                        disabled={timing.brp <= 1}
                                        className="w-10 h-10 flex items-center justify-center rounded bg-white dark:bg-[#111] border border-black/10 dark:border-[#222] text-dark-900 dark:text-[#f1f1f1] font-mono text-[12px] font-bold hover:border-light-600 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        aria-label="Decrease BRP"
                                    >−</button>
                                    <input
                                        type="text"
                                        value={brpInput}
                                        onChange={(e) => setBrpInput(e.target.value)}
                                        onBlur={handleBrpBlur}
                                        onKeyDown={handleBrpKeyDown}
                                        className={cn(
                                            "flex-1 h-10 text-center bg-white dark:bg-[#111] border text-dark-900 dark:text-[#f1f1f1] font-mono text-[11px] font-bold outline-none transition-colors",
                                            brpError ? "border-red-500 dark:border-red-500" : "border-black/10 dark:border-[#222] focus:border-light-600 dark:focus:border-[#6b7280]"
                                        )}
                                        aria-label="BRP value"
                                        aria-invalid={!!brpError}
                                        aria-errormessage={brpError ? "brp-error" : undefined}
                                    />
                                    <button
                                        onClick={() => handleChange('brp', Math.min(64, timing.brp + 1))}
                                        disabled={timing.brp >= 64}
                                        className="w-10 h-10 flex items-center justify-center rounded bg-white dark:bg-[#111] border border-black/10 dark:border-[#222] text-dark-900 dark:text-[#f1f1f1] font-mono text-[12px] font-bold hover:border-light-600 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        aria-label="Increase BRP"
                                    >+</button>
                                </div>
                                {brpError && (
                                    <span id="brp-error" role="alert" className="text-[9px] font-mono text-red-400 block mt-1 animate-pulse">
                                        {brpError}
                                    </span>
                                )}
                                <span className="text-[9px] font-mono text-light-400 dark:text-gray-500 block transition-colors">Baud rate prescaler (Tq = 2 × BRP / Fosc)</span>
                            </div>
                             <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Tooltip content="Oscillator Frequency: The controller clock source used with BRP to compute Time Quanta duration">
                                        <span className="text-[10px] font-mono text-light-400 dark:text-gray-500 transition-colors uppercase cursor-help">OSCILLATOR FREQUENCY</span>
                                    </Tooltip>
                                    <span className="text-[10px] font-mono text-light-400 dark:text-gray-500 transition-colors">Fosc</span>
                                </div>
                                <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Oscillator Frequency">
                                    {[8, 16, 20, 24, 40].map(f => (
                                        <button
                                            key={f}
                                            role="radio"
                                            aria-checked={timing.oscillator === f * 1_000_000}
                                            onClick={() => handleChange('oscillator', f * 1_000_000)}
                                            className={`px-1 py-1.5 rounded text-[10px] font-mono font-bold border transition-all ${timing.oscillator === f * 1_000_000
                                                ? 'bg-cyan-500/10 dark:bg-[#00f3ff10] text-cyan-600 dark:text-[#00f3ff] border-cyan-500/30 dark:border-[#00f3ff40]'
                                                : 'bg-white dark:bg-[#111] text-light-500 dark:text-gray-400 border-black/10 dark:border-[#222] hover:border-light-600 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            {f} MHz
                                        </button>
                                    ))}
                                </div>
                                <span className="text-[9px] font-mono text-light-400 dark:text-gray-500 block transition-colors">Controller clock source</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-light-500 dark:text-[#6b7280] transition-colors">
                                        SAMPLE MODE (SAM)
                                    </span>
                                    {timing.sam === 1 && (
                                        <span className="text-[9px] font-mono text-amber-500 font-bold uppercase transition-colors">Triple enabled</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleChange('sam', timing.sam === 1 ? 0 : 1)}
                                    className={`w-full group relative flex items-center gap-3 p-2 rounded border transition-all ${timing.sam === 1
                                        ? 'bg-amber-500/10 border-amber-500/40'
                                        : 'bg-white dark:bg-[#111] border-black/10 dark:border-[#222] hover:border-light-600 dark:hover:border-gray-600'
                                        }`}
                                    title="Toggle Triple Sampling mode"
                                >
                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${timing.sam === 1 ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                                        <motion.div
                                            className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm"
                                            animate={{ left: timing.sam === 1 ? '1.1rem' : '0.125rem' }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    </div>
                                    <span className={`text-[10px] font-mono font-bold transition-colors ${timing.sam === 1 ? 'text-amber-500' : 'text-light-500 dark:text-gray-400'}`}>
                                        {timing.sam === 1 ? 'TRIPLE SAMPLE (Majority Logic)' : 'SINGLE SAMPLE (Standard)'}
                                    </span>
                                </button>
                                <span className="text-[9px] font-mono text-light-400 dark:text-gray-500 block transition-colors leading-tight">
                                    Triple sampling reduces error rates at lower bitrates (≤125k) by using majority voting on three sample points.
                                </span>
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
                        <span className="text-[11px] font-mono" style={{ color: analysis.color }}>{analysis.msg}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Preset Tab Strip Component ─────────────────────────────
function PresetTabStrip({ presets, activePreset, onApply }: {
    presets: readonly Preset[];
    activePreset: string | null;
    onApply: (preset: Preset) => void;
}) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0c0c0e] border border-black/5 dark:border-[#222] mb-4 transition-colors">
            <span className="text-[10px] font-mono font-bold text-light-500 dark:text-gray-400 uppercase tracking-widest block mb-2 transition-colors">BAUD RATE PRESETS</span>
            <div className="pb-1">
                <div className="flex flex-wrap gap-2 w-full">
                    {presets.map(preset => (
                        <button
                            key={preset.name}
                            onClick={() => onApply(preset)}
                            className="relative flex-none px-3 py-2.5 rounded text-[10px] font-mono font-bold transition-all active:scale-95 transition-colors min-h-[44px]"
                            style={{
                                color: activePreset === preset.name ? (isDark ? '#00f3ff' : '#0891b2') : (isDark ? '#888' : '#666'),
                                zIndex: activePreset === preset.name ? 1 : 0,
                            }}
                        >
                            <div className="leading-none flex flex-col items-center">
                                <div className="text-[11px] font-bold">{preset.name.split(' ')[0]}</div>
                                <div className="text-[10px] opacity-60 mt-1">{preset.clock}</div>
                            </div>
                            {activePreset === preset.name && (
                                <motion.div
                                    layoutId="preset-pill"
                                    className="absolute inset-0 rounded bg-cyan-500/5 dark:bg-[#00f3ff08] border border-cyan-500/30 dark:border-[#00f3ff40]"
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
}

// ─── Segment Slider Component ─────────────────────────────
interface SegmentSliderProps {
    label: string;
    color: string;
    value: number;
    max: number;
    onChange: (value: number) => void;
    description: string;
}

function SegmentSlider({ label, color, value, max, onChange, description }: SegmentSliderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);

    const { theme } = useTheme();
    const isDark = theme === 'dark';

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
        const range = max - 1;
        const largeStep = Math.round(range * 0.1) || 1;

        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
                newValue = Math.max(1, value - 1);
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                newValue = Math.min(max, value + 1);
                break;
            case 'Home':
                newValue = 1;
                break;
            case 'End':
                newValue = max;
                break;
            case 'PageDown':
                newValue = Math.max(1, value - largeStep);
                break;
            case 'PageUp':
                newValue = Math.min(max, value + largeStep);
                break;
        }

        if (newValue !== value) {
            e.preventDefault();
            onChange(newValue);
        }
    };

    const percent = (value / max) * 100;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span 
                    className="text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-help" 
                    style={{ color }}
                    title={description}
                    aria-label={`${label}: ${description}`}
                >
                    {label}
                </span>
                <span className="text-[9px] font-mono text-light-400 dark:text-gray-500 transition-colors">1 – {max}</span>
            </div>

            <div
                ref={trackRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="relative h-8 bg-white dark:bg-[#080808] border border-black/5 dark:border-[#1a1a20] rounded cursor-pointer group transition-colors"
                tabIndex={0}
                role="slider"
                style={{ outline: isFocused ? `2px solid ${color}` : 'none', outlineOffset: '2px' }}
                aria-label={label}
                aria-valuenow={value}
                aria-valuemin={1}
                aria-valuemax={max}
            >
                {/* Filled track */}
                <motion.div
                    className="absolute h-full rounded-l transition-colors"
                    style={{ backgroundColor: isDark ? `${color}15` : `${color}25`, width: `${percent}%` }}
                    animate={{ width: `${percent}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                />

                {/* Tick marks */}
                <div className="absolute inset-0 flex pointer-events-none">
                    {Array.from({ length: max }, (_, i) => (
                        <div
                            key={i}
                            className="flex-1 border-r border-black/5 dark:border-white/5 transition-colors"
                            style={{
                                opacity: (i + 1) % 2 === 0 ? 0.3 : 0,
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
                    className="absolute -top-7 px-2 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap pointer-events-none transition-colors"
                    style={{
                        backgroundColor: color,
                        color: isDark ? '#000' : '#fff',
                        left: `${percent}%`,
                        transform: 'translateX(-50%)',
                    }}
                    animate={{ opacity: isDragging ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {value} TQ
                </motion.div>
            </div>

            <span className="text-[10px] font-mono text-light-400 dark:text-gray-500 block transition-colors leading-tight">{description}</span>
        </div>
    );
}

// ─── Register Row Component (Enhanced) ─────────────────────────────
function RegisterRow({ name, hex, binary, fields, onCopy, onEdit, isCopied, isExternalShaking, highlightedField }: {
    name: string;
    hex: string;
    binary: string;
    fields: { bits: string; name: string; value: number; color: string; tooltip?: string }[];
    onCopy: (reg: string, value: number) => void;
    onEdit: (hex: string) => boolean;
    isCopied: boolean;
    isExternalShaking?: boolean;
    highlightedField?: string | null;
}) {
    const hexValue = parseInt(hex, 16);
    const [isEditing, setIsEditing] = useState(false);
    const [editVal, setEditVal] = useState(hex);
    const [isInvalid, setIsInvalid] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [hexError, setHexError] = useState('');

    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const isValidHex = (s: string): boolean => {
        const v = parseInt(s.replace(/^0x/i, ''), 16);
        return !isNaN(v) && v >= 0 && v <= 255 && /^(0x)?[0-9A-Fa-f]{1,2}$/.test(s);
    };

    const handleEditChange = (val: string) => {
        setEditVal(val);
        const valid = isValidHex(val);
        setIsInvalid(!valid);
        if (valid) setHexError('');
    };

    const submitEdit = () => {
        if (isValidHex(editVal)) {
            const clean = editVal.replace(/^0x/i, '').padStart(2, '0');
            const success = onEdit(clean.toUpperCase());
            if (success) {
                setIsEditing(false);
                setIsInvalid(false);
                setHexError('');
            } else {
                setIsShaking(true);
                setHexError('Internal error');
                setTimeout(() => setIsShaking(false), 500);
            }
        } else {
            setIsShaking(true);
            setHexError('Invalid hex (00–FF)');
            setTimeout(() => setIsShaking(false), 500);
        }
    };

    return (
        <div className="mb-3 last:mb-0 transition-colors">
            <div className="flex items-center justify-between mb-1.5 px-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black text-light-600 dark:text-[#f1f1f1] transition-colors">{name}</span>
                    <div className="text-[9px] font-mono text-light-400 dark:text-gray-500 transition-colors">
                        {isEditing ? (
                            <div className="relative">
                                <motion.input
                                    autoFocus
                                    animate={(isShaking || isExternalShaking) ? { x: [-2, 2, -2, 2, 0] } : {}}
                                    transition={{ duration: 0.4 }}
                                    value={editVal}
                                    aria-invalid={!!hexError}
                                    aria-describedby={`hex-error-${name}`}
                                    onChange={e => handleEditChange(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            submitEdit();
                                        }
                                        if (e.key === 'Escape') {
                                            setEditVal(hex);
                                            setIsEditing(false);
                                            setIsInvalid(false);
                                            setHexError('');
                                        }
                                    }}
                                    onBlur={() => {
                                        if (!isInvalid) {
                                            submitEdit();
                                        } else {
                                            setIsEditing(false);
                                            setIsInvalid(false);
                                            setHexError('');
                                        }
                                    }}
                                    className={cn(
                                        "w-12 bg-white dark:bg-[#111] border outline-none px-1 rounded transition-all font-mono font-bold text-[10px]",
                                        hexError 
                                            ? "border-red-500 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" 
                                            : "border-cyan-500 text-cyan-600 dark:text-[#00f3ff] shadow-[0_0_8px_rgba(0,243,255,0.2)]"
                                    )}
                                />
                                {hexError && (
                                    <span
                                        id={`hex-error-${name}`}
                                        role="alert"
                                        className="absolute top-full left-0 text-[8px] font-mono text-red-400 block mt-0.5 whitespace-nowrap z-20"
                                    >
                                        {hexError}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span
                                onClick={() => { 
                                    setEditVal('0x' + hex); 
                                    setIsEditing(true); 
                                    setIsInvalid(false);
                                    setHexError('');
                                }}
                                title="Click to edit register value"
                                className="cursor-pointer hover:text-cyan-600 dark:hover:text-[#00f3ff] transition-colors border-b border-dashed border-cyan-500/30 hover:underline hover:decoration-dashed"
                            >
                                0x{hex}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => onCopy(name, hexValue)}
                    className={`text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded transition-all transition-colors cursor-pointer ${
                        isCopied 
                            ? 'bg-cyan-500/20 text-cyan-600 dark:text-[#00f3ff]' 
                            : 'text-light-400 dark:text-gray-500 hover:text-[#00f3ff] dark:hover:text-[#00f3ff] hover:bg-[#00f3ff08] border border-transparent hover:border-[#00f3ff30]'
                        }`}
                >
                    {isCopied ? 'COPIED' : 'COPY HEX'}
                </button>
            </div>

            <div className="flex h-7 bg-white dark:bg-[#080808] border border-black/5 dark:border-[#1a1a20] rounded-md overflow-hidden transition-colors">
                {binary.split('').map((bit, i) => {
                    const field = fields.find(f => {
                        const [start, end] = f.bits.includes(':') ? f.bits.split(':').map(Number) : [Number(f.bits), Number(f.bits)];
                        const bitIndex = 7 - i;
                        const min = Math.min(start, end);
                        const max = Math.max(start, end);
                        return bitIndex >= min && bitIndex <= max;
                    });

                    const isHighlighted = highlightedField && field?.name === highlightedField;

                    return (
                        <div
                            key={i}
                            className={cn(
                                "flex-1 flex flex-col items-center justify-center border-r border-black/5 dark:border-white/5 last:border-0 relative group outline-none focus:bg-cyan-500/10 dark:focus:bg-[#00f3ff08] transition-all duration-150",
                                bit === '1' ? 'bg-black/[0.02] dark:bg-white/[0.02]' : '',
                                isHighlighted && "ring-1 ring-inset z-10 shadow-[0_0_8px_rgba(0,243,255,0.3)]"
                            )}
                            style={{ 
                                ringColor: isHighlighted ? `${field?.color ?? '#00f3ff'}80` : undefined,
                                backgroundColor: isHighlighted ? `${field?.color ?? '#00f3ff'}15` : undefined
                            }}
                            role="img"
                            aria-label={`Bit ${7 - i}: ${bit}${field ? ` (${field.name})` : ''}`}
                        >
                            <span className={cn(
                                "text-[11px] font-mono font-bold transition-colors",
                                isHighlighted ? "text-light-900 dark:text-[#f1f1f1]" : (bit === '1' ? (isDark ? 'text-[#f1f1f1]' : 'text-dark-900') : (isDark ? 'text-gray-700' : 'text-light-300'))
                            )}>
                                {bit}
                            </span>
                            {field && (
                                <div
                                    className={cn(
                                        "absolute bottom-0 left-0 w-full h-[2px] transition-all",
                                        isHighlighted ? "opacity-100 h-[3px]" : "opacity-60"
                                    )}
                                    style={{ backgroundColor: field.color }}
                                />
                            )}
                            <span className={cn(
                                "absolute -top-4 text-[9px] font-mono transition-opacity transition-colors",
                                isHighlighted ? "opacity-100 text-light-900 dark:text-[#f1f1f1] font-bold" : "opacity-0 group-hover:opacity-100 text-light-400 dark:text-gray-600"
                            )}>
                                {7 - i}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 px-1">
                {fields.map(f => (
                    <div key={f.name} className="flex items-center gap-1.5 group cursor-help transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full transition-colors" style={{ backgroundColor: f.color }} />
                        <span className="text-[8px] font-mono font-bold text-light-500 dark:text-gray-400 transition-colors">{f.name}</span>
                        <span className="text-[8px] font-mono text-light-400 dark:text-gray-600 transition-colors">{f.bits}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
