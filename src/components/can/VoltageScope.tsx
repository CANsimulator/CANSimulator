import React, { useState, useCallback, useEffect } from 'react';
import '../can/scope.css';

import { LeftRail, KnobRail } from './scope/ScopeControls';
import { WaveformViewer } from './scope/WaveformViewer';
import { ScopeMetrics } from './scope/ScopeMetrics';
import { ProtocolDecoder } from './scope/ProtocolDecoder';
import type { OscState, OscMeas, SignalType, LayoutType } from './scope/types';

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

// ── Frame ribbon ─────────────────────────────────────────────────────────────
const FRAME_ZONES = [
    { cls: 'sof',  label: 'SOF',                           w: 2.5 },
    { cls: 'id',   label: 'ID 0x0C9',                      w: 14  },
    { cls: 'ctrl', label: 'CTRL',                          w: 8   },
    { cls: 'data', label: 'DATA 1A 6B 00 00 20 4F FF 1C', w: 45  },
    { cls: 'crc',  label: 'CRC 0x3A28',                    w: 16  },
    { cls: 'ack',  label: 'ACK',                           w: 5   },
    { cls: 'eof',  label: 'EOF + IFS',                     w: 9.5 },
];

// ── Defaults ─────────────────────────────────────────────────────────────────
const getInitialState = (): OscState => ({
    running: true,
    timebase: 200,
    channels: {
        h: { on: true, vpd: 1, off: 0 },
        l: { on: true, vpd: 1, off: 0 },
        d: { on: true, vpd: 1, off: -1.4 },
    },
    trig: { source: 'CH1', mode: 'Edge', level: 2.9, sweep: 'Auto' },
});

const getInitialMeas = (): OscMeas => ({
    vppH: 1.03, vppL: 1.01, vppD: 2.04,
    freq: 500, rmsD: 1.18, rise: 92, fall: 86,
});

// ── Component ─────────────────────────────────────────────────────────────────
export const VoltageScope: React.FC = () => {
    const [state, setState] = useState<OscState>(getInitialState);
    const [meas, setMeas] = useState<OscMeas>(getInitialMeas);
    const [layout, setLayout] = useState<LayoutType>('knobs');
    const [signal, setSignal] = useState<SignalType>('can');
    const [fftMode, setFftMode] = useState(false);
    const [cursorsOn, setCursorsOn] = useState(true);
    const [cursors] = useState({ t1: -400, t2: 520, v1: 0.2, v2: 2.3 });
    const [persistence, setPersistence] = useState(false);
    const [selectedFrame, setSelectedFrame] = useState(0);
    const [showSettings, setShowSettings] = useState(false);

    const handleAutoscale = useCallback(() => {
        setState(s => ({
            ...s,
            channels: {
                h: { ...s.channels.h, vpd: 1, off: 0 },
                l: { ...s.channels.l, vpd: 1, off: 0 },
                d: { ...s.channels.d, vpd: 1, off: -1.4 },
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
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const fmtTb = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)} ms` : `${v} µs`;

    return (
        <div className="osc-app theme-industrial density-comfortable">

            {/* ── TOPBAR ───────────────────────────────────────────────── */}
            <div className="osc-topbar">
                <div className="osc-brand">
                    <div className="osc-logo">DV</div>
                    <div>
                        <div className="osc-title">DIFFERENTIAL VOLTAGE OSCILLOSCOPE</div>
                        <div className="osc-sub">CAN · ISO 11898-2 · 500 KBIT/S</div>
                    </div>
                </div>
                <div className="osc-topbar-meta">
                    <div className="osc-meta-cell">
                        <span className="osc-meta-k">Session</span>
                        <span className="osc-meta-v">CAN-A · Lab 3</span>
                    </div>
                    <div className="osc-meta-cell">
                        <span className="osc-meta-k">Sample Rate</span>
                        <span className="osc-meta-v">2.0<span className="osc-unit">GSa/s</span></span>
                    </div>
                    <div className="osc-meta-cell">
                        <span className="osc-meta-k">Memory</span>
                        <span className="osc-meta-v">400<span className="osc-unit">Mpts</span></span>
                    </div>
                    <div className="osc-meta-cell">
                        <span className="osc-meta-k">Trigger</span>
                        <span className="osc-meta-v" style={{ color: 'var(--accent)' }}>
                            {state.trig.source} · {state.trig.level.toFixed(2)}V
                        </span>
                    </div>
                    <div className="osc-meta-cell">
                        <span className="osc-meta-k">Status</span>
                        <span className="osc-meta-v">
                            <span className={`osc-pill live ${state.running ? 'ok' : 'warn'}`}>
                                <span className="osc-dot" />
                                {state.running ? 'Live capture' : 'Held'}
                            </span>
                        </span>
                    </div>
                </div>
                <div className="osc-top-actions">
                    <button className="osc-iconbtn" title="Capture"><Camera /></button>
                    <button className="osc-iconbtn" title="Export CSV" onClick={handleExportCSV}><Download /></button>
                    <button className="osc-iconbtn" title="Settings" onClick={() => setShowSettings(v => !v)}><GearIcon /></button>
                </div>
            </div>

            {/* ── LEFT RAIL ────────────────────────────────────────────── */}
            {layout === 'knobs'
                ? <KnobRail state={state} setState={setState} onAutoscale={handleAutoscale} />
                : <LeftRail  state={state} setState={setState} onAutoscale={handleAutoscale} />}

            {/* ── STAGE ────────────────────────────────────────────────── */}
            <div className="osc-stage">
                <div className="osc-scope">
                    {/* Channel scale header */}
                    <div className="osc-scope-top">
                        <div className="osc-scale-grp" style={{ '--chc': 'var(--ch1)' } as React.CSSProperties}>
                            <span className="osc-sw" /><span className="osc-lbl">CH1</span>
                            <span className="osc-val">{state.channels.h.vpd} V/div</span>
                        </div>
                        <div className="osc-scale-grp" style={{ '--chc': 'var(--ch2)' } as React.CSSProperties}>
                            <span className="osc-sw" /><span className="osc-lbl">CH2</span>
                            <span className="osc-val">{state.channels.l.vpd} V/div</span>
                        </div>
                        <div className="osc-scale-grp" style={{ '--chc': 'var(--chd)' } as React.CSSProperties}>
                            <span className="osc-sw" /><span className="osc-lbl">DIFF</span>
                            <span className="osc-val">{state.channels.d.vpd} V/div</span>
                        </div>
                        <div className="osc-scale-grp">
                            <span className="osc-lbl" style={{ color: 'var(--accent)' }}>TIME</span>
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
                            <button className="osc-tbtn" onClick={handleExportCSV}>
                                <Download /> EXPORT
                            </button>
                        </div>
                    </div>

                    {/* Waveform canvas */}
                    <div className="osc-scope-body">
                        <WaveformViewer
                            state={state}
                            signal={signal}
                            fftMode={fftMode}
                            cursorsOn={cursorsOn}
                            cursors={cursors}
                            persistence={persistence}
                            traceGlow={true}
                            onMeas={setMeas}
                            onStateChange={setState}
                        />
                        <div className="osc-scope-badge">
                            <span className="osc-dot" />
                            {state.running ? 'CAPTURING' : 'HELD'} · 500 kbit/s
                        </div>
                        <div className="osc-scope-legend">
                            {[
                                { label: 'CAN_H',      color: 'var(--ch1)' },
                                { label: 'CAN_L',      color: 'var(--ch2)' },
                                { label: 'DIFF = H−L', color: 'var(--chd)' },
                            ].map(item => (
                                <div key={item.label} className="osc-legend-item"
                                    style={{ '--chc': item.color } as React.CSSProperties}>
                                    <span className="osc-sw" style={{ background: item.color }} />
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Annotation bar — dedicated row below canvas, above frame ribbon */}
                    <div className="osc-scope-ann">
                        <span>◄ POSITION  0.00 s</span>
                        <span>·</span><span>COUPLING  DC</span>
                        <span>·</span><span>BW  200 MHz</span>
                        <span>·</span><span>PROBE  10×</span>
                        <span>·</span><span style={{ color: 'var(--accent)', marginLeft: 'auto', paddingRight: 4 }}>
                            Scroll to zoom · Drag to pan · Dbl-click to reset
                        </span>
                    </div>

                    {/* CAN frame ribbon */}
                    <div className="osc-frame-ribbon">
                        {(() => {
                            let acc = 0;
                            return FRAME_ZONES.map((z, i) => {
                                const left = `${acc}%`;
                                acc += z.w;
                                return (
                                    <div key={i}
                                        className={`osc-frame ${z.cls} ${i === 1 ? 'selected' : ''}`}
                                        style={{ left, width: `${z.w - 0.4}%` }}
                                        onClick={() => setSelectedFrame(0)}
                                        title={z.label}
                                    >{z.label}</div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>

            {/* ── RIGHT RAIL ───────────────────────────────────────────── */}
            <ScopeMetrics meas={meas} running={state.running} />

            {/* ── DECODER ──────────────────────────────────────────────── */}
            <ProtocolDecoder selected={selectedFrame} onSelect={setSelectedFrame} />

            {/* ── SETTINGS PANEL ───────────────────────────────────────── */}
            {showSettings && (
                <div style={{
                    position: 'fixed', right: 18, bottom: 18, zIndex: 51,
                    background: 'var(--panel)', border: '1px solid var(--stroke-2)',
                    borderRadius: 'var(--radius-lg)', padding: '14px 16px',
                    minWidth: 260, boxShadow: '0 20px 50px rgba(0,0,0,.6)',
                    fontFamily: 'var(--mono)', display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink)' }}>Settings</span>
                        <button onClick={() => setShowSettings(false)} style={{ color: 'var(--ink-dim)', fontSize: 20, lineHeight: 1, cursor: 'pointer' }}>×</button>
                    </div>
                    <SettingRow label="Layout">
                        <ToggleGroup
                            value={layout}
                            options={[{ v: 'standard', l: 'Buttons' }, { v: 'knobs', l: 'Knobs' }]}
                            onChange={v => setLayout(v as LayoutType)}
                        />
                    </SettingRow>
                    <SettingRow label="Demo Signal">
                        <ToggleGroup
                            value={signal}
                            options={[{ v: 'can', l: 'CAN' }, { v: 'sine', l: 'Sine' }, { v: 'square', l: 'Sq.' }, { v: 'noisy', l: 'Noisy' }]}
                            onChange={v => setSignal(v as SignalType)}
                        />
                    </SettingRow>
                    <SettingCheck label="Phosphor Persistence" value={persistence} onChange={setPersistence} />
                </div>
            )}
        </div>
    );
};

// ── Settings helpers ──────────────────────────────────────────────────────────
const SettingRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 10, letterSpacing: '.12em', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>{label}</span>
        {children}
    </div>
);

const ToggleGroup: React.FC<{
    value: string;
    options: { v: string; l: string }[];
    onChange: (v: string) => void;
}> = ({ value, options, onChange }) => (
    <div style={{ display: 'flex', gap: 4 }}>
        {options.map(o => (
            <button key={o.v} onClick={() => onChange(o.v)} style={{
                flex: 1, padding: '6px 4px', borderRadius: 4, border: '1px solid',
                borderColor: value === o.v ? 'var(--accent)' : 'var(--stroke)',
                background: value === o.v ? 'var(--accent)' : 'var(--bg-3)',
                color: value === o.v ? 'var(--accent-ink)' : 'var(--ink-dim)',
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.04em',
            }}>{o.l}</button>
        ))}
    </div>
);

const SettingCheck: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
    <div onClick={() => onChange(!value)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', background: 'var(--bg-3)',
        border: '1px solid var(--stroke)', borderRadius: 4, cursor: 'pointer',
    }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink)' }}>{label}</span>
        <div style={{
            width: 36, height: 18, borderRadius: 10,
            background: value ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--stroke)',
            position: 'relative', flexShrink: 0,
        }}>
            <div style={{
                position: 'absolute', top: 2, borderRadius: '50%', width: 14, height: 14,
                background: value ? 'var(--accent)' : 'var(--ink-faint)',
                left: value ? 19 : 2, transition: 'left .15s, background .15s',
            }} />
        </div>
    </div>
);
