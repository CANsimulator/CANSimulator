import React, { useState, useCallback, useEffect } from 'react';
import '../can/scope.css';
import { motion, AnimatePresence } from 'framer-motion';

import { LeftRail, KnobRail } from './scope/ScopeControls';
import { WaveformViewer, type ScopeSync } from './scope/WaveformViewer';
import { LogicRibbon } from './scope/LogicRibbon';
import { ScopeMetrics } from './scope/ScopeMetrics';
import { ProtocolDecoder } from './scope/ProtocolDecoder';
import type { OscState, OscMeas, SignalType, LayoutType } from './scope/types';
import { ReferencePlots } from './ReferencePlots';

// ── SVG icons ────────────────────────────────────────────────────────────────
const Waves = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0" />
    </svg>
);
const Fft = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10" /><path d="M9 20V4" /><path d="M14 20v-8" /><path d="M19 20V7" />
    </svg>
);
const CursorIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20" /><path d="M2 12h20" /><circle cx="12" cy="12" r="2" />
    </svg>
);
const Download = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v12" /><path d="M6 10l6 6 6-6" /><path d="M4 20h16" />
    </svg>
);
const Camera = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h4l2-3h6l2 3h4v12H3z" /><circle cx="12" cy="13" r="4" />
    </svg>
);
const GearIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </svg>
);
const ResetIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" />
    </svg>
);
const ReferenceIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);
const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// ── Frame ribbon ─────────────────────────────────────────────────────────────

// ── Defaults ─────────────────────────────────────────────────────────────────
const getInitialState = (): OscState => ({
    running: true,
    timebase: 200,
    axisOffsetY: 0,
    channels: {
        h: { on: true, vpd: 1, off: 0 },
        l: { on: true, vpd: 1, off: 0 },
        d: { on: true, vpd: 1, off: 0 },
    },
    trig: { 
        source: 'CH1', 
        mode: 'Edge', 
        level: 2.9, 
        sweep: 'Auto',
        slope: 'Rising',
        coupling: 'DC',
        holdoff: 1.0,
        canTrigger: {
            type: 'ID',
            targetID: '0C9',
            errorType: 'CRC',
            payloadPattern: 'AA FF'
        }
    },
});

const getInitialMeas = (): OscMeas => ({
    vppH: 1.03, vppL: 1.01, vppD: 2.04,
    freq: 500, rmsD: 1.18, rise: 92, fall: 86,
    cmDrift: 0.0,
});

// ── Component ─────────────────────────────────────────────────────────────────
export const VoltageScope: React.FC = () => {
    const linesViewerRef = React.useRef<{ reset: () => void }>(null);
    const diffViewerRef = React.useRef<{ reset: () => void }>(null);
    const scopeSyncRef = React.useRef<ScopeSync>({ zoom: 1, pan: 0, scroll: 0 });
    const [state, setState] = useState<OscState>(getInitialState);
    const [meas, setMeas] = useState<OscMeas>(getInitialMeas);
    const [layout, setLayout] = useState<LayoutType>('standard');
    const [signal, setSignal] = useState<SignalType>('can');
    const [fftMode, setFftMode] = useState(false);
    const [cursorsOn, setCursorsOn] = useState(true);
    const [cursors] = useState({ t1: -400, t2: 520, v1: 0.2, v2: 2.3 });
    const [persistence, setPersistence] = useState(false);
    const [selectedFrame, setSelectedFrame] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [showReference, setShowReference] = useState(false);
    const [panPositionUs, setPanPositionUs] = useState(0);
    const [decoderFilter, setDecoderFilter] = useState<{ type: 'err' | 'warn'; timestamp: number; frameIdx?: number } | null>(null);
    const [flash, setFlash] = useState(false);

    const handleScreenshot = useCallback(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 300);
        // Actual screenshot logic would go here
    }, []);

    const handleFilterRequest = useCallback((type: 'err' | 'warn', frameIdx?: number) => {
        setDecoderFilter({ type, timestamp: Date.now(), frameIdx });
    }, []);

    const handleReset = useCallback(() => {
        linesViewerRef.current?.reset();
        diffViewerRef.current?.reset();
        scopeSyncRef.current.zoom = 1;
        scopeSyncRef.current.pan = 0;
        setState(getInitialState());
        setMeas(getInitialMeas());
        setFftMode(false);
        setCursorsOn(true);
        setPersistence(false);
        setLayout('standard');
        setSignal('can');
    }, []);

    const handleAutoscale = useCallback(() => {
        setState(s => ({
            ...s,
            channels: {
                h: { ...s.channels.h, vpd: 1, off: 0 },
                l: { ...s.channels.l, vpd: 1, off: 0 },
                d: { ...s.channels.d, vpd: 1, off: 0 },
            },
            timebase: 200,
        }));
    }, []);

    const handleExportCSV = useCallback(() => {
        const content = 'Timestamp (us),CANH (V),CANL (V),VDiff (V)\n';
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `scope_export_${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            if (e.key === ' ') { e.preventDefault(); setState(s => ({ ...s, running: !s.running })); }
            if (e.key.toLowerCase() === 's') setState(s => ({ ...s, running: false }));
            if (e.key.toLowerCase() === 'f') setFftMode(v => !v);
            if (e.key.toLowerCase() === 'c') setCursorsOn(v => !v);
            if (e.key === 'Escape') {
                setShowReference(false);
                setShowSettings(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const fmtTb = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)} ms` : `${v} µs`;

    const springTransition = { type: 'spring', stiffness: 400, damping: 25 };

    return (
        <main className="osc-app theme-industrial density-comfortable">

            {/* ── TOPBAR ───────────────────────────────────────────────── */}
            <header className="osc-topbar" role="banner">
                <div className="osc-brand" role="presentation">
                    <motion.div 
                        className="osc-logo" 
                        aria-hidden="true"
                        initial={{ rotateY: 90 }}
                        animate={{ rotateY: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >DV</motion.div>
                    <div>
                        <h1 className="osc-title">VOLTAGE SCOPE</h1>
                        <div className="osc-sub">500 KBIT/S · ISO 11898-2</div>
                    </div>
                </div>
                <div className="osc-topbar-meta">
                    <motion.div 
                        className="osc-meta-cell"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <span className="osc-meta-k">Specs</span>
                        <span className="osc-meta-v">2.0 GSa/s · 400 Mpts</span>
                    </motion.div>
                    <motion.div 
                        className="osc-meta-cell"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <span className="osc-meta-k">Lab</span>
                        <span className="osc-meta-v">CAN-A · Session 3</span>
                    </motion.div>
                </div>
                <div className="osc-top-actions">
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="osc-iconbtn" 
                        title="Capture" 
                        aria-label="Capture Screenshot"
                        onClick={handleScreenshot}
                    >
                        <Camera />
                    </motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="osc-iconbtn" 
                        title="Export CSV" 
                        aria-label="Export Waveform Data as CSV" 
                        onClick={handleExportCSV}
                    >
                        <Download />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02, backgroundColor: 'var(--bg-3)' }}
                        whileTap={{ scale: 0.98 }}
                        className="osc-reset-btn"
                        title="Reset entire oscilloscope to default state"
                        aria-label="Reset Oscilloscope"
                        onClick={handleReset}
                    >
                        <ResetIcon />
                        <span>RESET</span>
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02, filter: 'brightness(1.2)' }}
                        whileTap={{ scale: 0.98 }}
                        className="osc-reset-btn osc-bg-accent"
                        aria-label="Open Technical Reference"
                        onClick={() => setShowReference(true)}
                    >
                        <ReferenceIcon />
                        <span>REFERENCE</span>
                    </motion.button>
                    <motion.button 
                        whileHover={{ rotate: 90 }}
                        transition={springTransition as any}
                        className="osc-iconbtn" 
                        title="Settings" 
                        aria-label="Open Oscilloscope Settings" 
                        onClick={() => setShowSettings(v => !v)}
                    >
                        <GearIcon />
                    </motion.button>
                </div>
            </header>

            {/* ── SCREEN FLASH EFFECT ─────────────────────────────────── */}
            <AnimatePresence>
                {flash && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] pointer-events-none bg-white"
                    />
                )}
            </AnimatePresence>

            {/* ── REFERENCE OVERLAY ─────────────────────────────────────── */}
            {showReference && (
                <div className="osc-overlay-modal" role="dialog" aria-modal="true" aria-labelledby="ref-title">
                    <div className="osc-overlay-head">
                        <div className="osc-brand" role="presentation">
                            <div className="osc-logo osc-bg-accent" aria-hidden="true">REF</div>
                            <div>
                                <div id="ref-title" className="osc-title">Signal Technical Reference</div>
                                <div className="osc-sub">ISO 11898-2 · High Fidelity Analysis</div>
                            </div>
                        </div>
                        <button className="osc-close-btn" onClick={() => setShowReference(false)} aria-label="Close Reference">
                            <XIcon /> <span>CLOSE</span>
                        </button>
                    </div>
                    <div className="osc-overlay-body">
                        <ReferencePlots standalone={false} />
                    </div>
                </div>
            )}

            {/* ── LEFT RAIL ────────────────────────────────────────────── */}
            {layout === 'knobs'
                ? <KnobRail state={state} setState={setState} onFilterRequest={handleFilterRequest} />
                : <LeftRail state={state} setState={setState} onFilterRequest={handleFilterRequest} />}

            {/* ── STAGE ────────────────────────────────────────────────── */}
            <div className="osc-stage">
                <div className="osc-scope">
                    {/* Channel scale header */}
                    <div className="osc-scope-top">
                        <div className="osc-scale-grp osc-ch-h">
                            <span className="osc-sw" /><span className="osc-lbl">CH1</span>
                            <span className="osc-val">{state.channels.h.vpd} V/div</span>
                        </div>
                        <div className="osc-scale-grp osc-ch-l">
                            <span className="osc-sw" /><span className="osc-lbl">CH2</span>
                            <span className="osc-val">{state.channels.l.vpd} V/div</span>
                        </div>
                        <div className="osc-scale-grp osc-ch-d">
                            <span className="osc-sw" /><span className="osc-lbl">DIFF</span>
                            <span className="osc-val">{state.channels.d.vpd} V/div</span>
                        </div>
                        <div className="osc-scale-grp">
                            <span className="osc-lbl osc-text-accent">TIME</span>
                            <span className="osc-val">{fmtTb(state.timebase)}/div</span>
                        </div>
                        <div className="osc-right">
                            <button className={`osc-tbtn ${!fftMode ? 'active' : ''}`} onClick={() => setFftMode(false)}>
                                <Waves /> TIME
                            </button>
                            <button className={`osc-tbtn ${fftMode ? 'active' : ''}`} onClick={() => setFftMode(true)}>
                                <Fft /> FFT
                            </button>
                            <button className={`osc-tbtn ${cursorsOn ? 'active' : ''}`} onClick={() => setCursorsOn(v => !v)}>
                                <CursorIcon /> CURSORS
                            </button>
                        </div>
                    </div>

                    {/* Waveform canvases — split into two panes: lines (CAN_H/CAN_L) and diff (V_diff) */}
                    <div className="osc-scope-body osc-scope-split">
                        <div className="osc-scope-pane osc-scope-pane-lines" role="region" aria-label="CAN_H and CAN_L Waveform View">
                                    <WaveformViewer
                                        ref={linesViewerRef}
                                        state={state}
                                        signal={signal}
                                        fftMode={fftMode}
                                        cursorsOn={cursorsOn}
                                        cursors={cursors}
                                        persistence={persistence}
                                        traceGlow={true}
                                        onMeas={setMeas}
                                        onStateChange={setState}
                                        onPanChange={setPanPositionUs}
                                        channelSet="lines"
                                        syncRef={scopeSyncRef}
                                        reportMeas={true}
                                    />
                                    <div className="osc-scope-badge" aria-live="polite">
                                        <span className="osc-dot" aria-hidden="true" />
                                        <span>{state.running ? 'CAPTURING' : 'HELD'} · 500 kbit/s</span>
                                    </div>
                                    <div className="osc-scope-pane-label">
                                        <span className="osc-pane-title">LINES</span>
                                        <span className="osc-legend-item osc-ch-h">
                                            <span className="osc-sw osc-sw-ch-h" aria-hidden="true" /> CAN_H
                                        </span>
                                        <span className="osc-legend-item osc-ch-l">
                                            <span className="osc-sw osc-sw-ch-l" aria-hidden="true" /> CAN_L
                                        </span>
                                    </div>
                                </div>


                                <div className="osc-scope-pane osc-scope-pane-diff" role="region" aria-label="Differential Waveform View">
                                    <WaveformViewer
                                        ref={diffViewerRef}
                                        state={state}
                                        signal={signal}
                                        fftMode={fftMode}
                                        cursorsOn={cursorsOn}
                                        cursors={cursors}
                                        persistence={persistence}
                                        traceGlow={true}
                                        onMeas={setMeas}
                                        onStateChange={setState}
                                        onPanChange={setPanPositionUs}
                                        channelSet="diff"
                                        syncRef={scopeSyncRef}
                                        reportMeas={false}
                                    />
                                    <div className="osc-scope-pane-label">
                                        <span className="osc-pane-title text-[var(--ch-d)]">V_diff</span>
                                    </div>
                                </div>

                                {/* Logic Analyzer Ribbon - Synchronized temporal mapping layer */}
                                {signal === 'can' && !fftMode && (
                                    <LogicRibbon syncRef={scopeSyncRef} running={state.running} />
                                )}
                    </div>

                    {/* Annotation bar — dedicated row below canvas, above frame ribbon */}
                    <div className="osc-scope-ann text-[9px] font-black uppercase tracking-[0.1em]">
                        <div className="flex items-center gap-3">
                            <span className="text-[var(--ink)]">T_POS: {panPositionUs === 0 ? '0.00µs' : `${panPositionUs > 0 ? '+' : ''}${panPositionUs.toFixed(1)}µs`}</span>
                            <span className="h-2.5 w-px bg-[var(--stroke)]" />
                            <span className="text-[var(--ink-dim)]">DC · 200MHz · 10:1</span>
                        </div>
                        <span className="text-[var(--ch1)] opacity-70">
                            AUTO-SYNC ACTIVE · LOGIC MAPPING ENABLED
                        </span>
                    </div>

                </div>
            </div>

            {/* ── RIGHT RAIL ───────────────────────────────────────────── */}
            <ScopeMetrics 
                meas={meas} 
                running={state.running} 
                state={state}
                setState={setState}
                onAutoscale={handleAutoscale}
            />

            {/* ── DECODER ──────────────────────────────────────────────── */}
            <ProtocolDecoder 
                selected={selectedFrame} 
                onSelect={setSelectedFrame} 
                syncRef={scopeSyncRef}
                setOscState={setState}
                externalFilter={decoderFilter}
                timebase={state.timebase}
                running={state.running}
            />

            {/* ── SETTINGS PANEL ───────────────────────────────────────── */}
            {showSettings && (
                <div className="osc-settings-panel" role="dialog" aria-labelledby="settings-title">
                    <div className="osc-settings-header">
                        <span id="settings-title" className="osc-settings-title">Settings</span>
                        <button onClick={() => setShowSettings(false)} className="osc-settings-close" aria-label="Close Settings">×</button>
                    </div>
                    <SettingRow label="Layout">
                        <ToggleGroup
                            value={layout}
                            options={[{ v: 'standard', l: 'Buttons' }, { v: 'knobs', l: 'Knobs' }]}
                            ariaLabel="UI Layout Mode"
                            onChange={v => setLayout(v as LayoutType)}
                        />
                    </SettingRow>
                    <SettingRow label="Demo Signal">
                        <ToggleGroup
                            value={signal}
                            options={[{ v: 'can', l: 'CAN' }, { v: 'sine', l: 'Sine' }, { v: 'square', l: 'Sq.' }, { v: 'noisy', l: 'Noisy' }]}
                            ariaLabel="Simulated Signal Source"
                            onChange={v => setSignal(v as SignalType)}
                        />
                    </SettingRow>
                    <SettingCheck label="Phosphor Persistence" value={persistence} onChange={setPersistence} />
                </div>
            )}
        </main>
    );
};

// ── Settings helpers ──────────────────────────────────────────────────────────
const SettingRow: React.FC<{ label: string; children: React.ReactNode }> = React.memo(({ label, children }) => (
    <div className="osc-setting-row">
        <span className="osc-setting-label">{label}</span>
        {children}
    </div>
));

const ToggleGroup: React.FC<{
    value: string;
    options: { v: string; l: string }[];
    ariaLabel?: string;
    onChange: (v: string) => void;
}> = React.memo(({ value, options, ariaLabel, onChange }) => (
    <div className="osc-toggle-group" role="group" aria-label={ariaLabel}>
        {options.map(o => (
            <button
                key={o.v}
                onClick={() => onChange(o.v)}
                aria-pressed={value === o.v}
                className={`osc-toggle-btn focus-ring-cyber ${value === o.v ? 'active' : ''}`}
            >
                {o.l}
            </button>
        ))}
    </div>
));

const SettingCheck: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = React.memo(({ label, value, onChange }) => (
    <button
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className="osc-switch focus-ring-cyber"
    >
        <span className="osc-font-mono osc-fs-11 osc-ink">{label}</span>
        <div className="osc-switch-track">
            <div className="osc-switch-thumb" />
        </div>
    </button>
));
