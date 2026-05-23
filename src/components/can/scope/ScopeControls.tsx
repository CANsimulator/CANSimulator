import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Binary } from 'lucide-react';
import { KnobControl, RockerSwitch } from './KnobControl';
import { DEMO_FRAMES } from './protocolUtils';
import type { OscState } from './types';

type SetState = React.Dispatch<React.SetStateAction<OscState>>;

interface RailProps {
    state: OscState;
    setState: SetState;
    onFilterRequest?: (type: 'err' | 'warn', frameIdx?: number) => void;
}

const INTEGRITY_CELLS = Array.from({ length: 60 }, (_, i) => {
    if (i < DEMO_FRAMES.length) {
        const fr = DEMO_FRAMES[i];
        return { cls: fr.status, o: 0.9, frameIdx: i };
    }
    const r = ((i * 2654435761) >>> 0) / 0xffffffff;
    const cls = r > 0.99 ? 'err' : r > 0.97 ? 'warn' : 'ok';
    const o = 0.35 + ((i * 1234567) % 100) / 250;
    return { cls, o };
});

const VPD_OPTS = [0.1, 0.2, 0.5, 1, 2, 5];
const TB_OPTS = [20, 50, 100, 200, 500, 1000];
const fmtTb = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)} ms` : `${v} µs`;

// ── SVG icon helpers ────────────────────────────────────────────────────────
const Play = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16">
        <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
);
const Stop = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16">
        <rect x="5" y="5" width="14" height="14" rx="1" />
    </svg>
);
const Single = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M5 12h9" /><path d="M14 6l6 6-6 6" />
    </svg>
);

// ── Premium Mini Waveform ───────────────────────────────────────────────────
const MiniWaveform: React.FC = () => {
    return (
        <div className="p-1 rounded bg-[var(--bg-darker)] border border-[var(--stroke)] relative overflow-hidden h-12 flex flex-col justify-center select-none">
            {/* Header / Meta */}
            <div className="absolute top-1 left-1.5 right-1.5 flex justify-between items-center text-[7px] font-black uppercase tracking-wider text-[var(--ink-faint)] pointer-events-none z-10">
                <span>Bus Activity</span>
                <span className="text-[var(--ok)] animate-pulse flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-[var(--ok)] animate-ping" style={{ animationDuration: '2s' }} />
                    Active
                </span>
            </div>
            
            {/* Symmetrical digital waves */}
            <svg className="w-full h-8" viewBox="0 0 200 40" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="glow-h" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--ch1)" stopOpacity="0.2"/>
                        <stop offset="50%" stopColor="var(--ch1)" stopOpacity="0.8"/>
                        <stop offset="100%" stopColor="var(--ch1)" stopOpacity="0.2"/>
                    </linearGradient>
                    <linearGradient id="glow-l" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--ch2)" stopOpacity="0.2"/>
                        <stop offset="50%" stopColor="var(--ch2)" stopOpacity="0.8"/>
                        <stop offset="100%" stopColor="var(--ch2)" stopOpacity="0.2"/>
                    </linearGradient>
                    <linearGradient id="glow-d" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--chd)" stopOpacity="0.2"/>
                        <stop offset="50%" stopColor="var(--chd)" stopOpacity="0.8"/>
                        <stop offset="100%" stopColor="var(--chd)" stopOpacity="0.2"/>
                    </linearGradient>
                </defs>
                
                {/* CAN_H line (symmetrical dominant peaks going up to 10 from recessive 20) */}
                <path
                    d="M 0,20 L 10,20 L 15,8 L 25,8 L 30,20 L 45,20 L 50,8 L 65,8 L 70,20 L 95,20 L 100,8 L 110,8 L 115,20 L 130,20 L 135,8 L 145,8 L 150,20 L 175,20 L 180,8 L 190,8 L 195,20 L 200,20"
                    fill="none"
                    stroke="var(--ch1)"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                    className="osc-flowing-wave"
                    style={{ filter: 'drop-shadow(0 0 3px var(--ch1))' }}
                />
                
                {/* CAN_L line (symmetrical dominant peaks going down to 32 from recessive 20) */}
                <path
                    d="M 0,20 L 10,20 L 15,32 L 25,32 L 30,20 L 45,20 L 50,32 L 65,32 L 70,20 L 95,20 L 100,32 L 110,32 L 115,20 L 130,20 L 135,32 L 145,32 L 150,20 L 175,20 L 180,32 L 190,32 L 195,20 L 200,20"
                    fill="none"
                    stroke="var(--ch2)"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                    className="osc-flowing-wave-reverse"
                    style={{ filter: 'drop-shadow(0 0 3px var(--ch2))' }}
                />
                
                {/* CAN_Diff (differential line offset at bottom from baseline 35 going up to 22) */}
                <path
                    d="M 0,35 L 10,35 L 15,22 L 25,22 L 30,35 L 45,35 L 50,22 L 65,22 L 70,35 L 95,35 L 100,22 L 110,22 L 115,35 L 130,35 L 135,22 L 145,22 L 150,35 L 175,35 L 180,22 L 190,22 L 195,35 L 200,35"
                    fill="none"
                    stroke="var(--chd)"
                    strokeWidth="1.2"
                    strokeOpacity="0.85"
                    strokeDasharray="4 6"
                    className="osc-flowing-wave-diff"
                    style={{ filter: 'drop-shadow(0 0 2px var(--chd))' }}
                />
            </svg>
        </div>
    );
};

// ── Integrity Map ───────────────────────────────────────────────────────────
const IntegrityMap: React.FC<{ onFilter?: (type: 'err' | 'warn', idx?: number) => void }> = React.memo(({ onFilter }) => {
    const shouldReduceMotion = useReducedMotion();
    
    // Calculate counters from static grid state
    const okCount = INTEGRITY_CELLS.filter(c => c.cls === 'ok').length;
    const warnCount = INTEGRITY_CELLS.filter(c => c.cls === 'warn').length;
    const errCount = INTEGRITY_CELLS.filter(c => c.cls === 'err').length;

    return (
        <div className="flex flex-col gap-2 p-1.5">
            {/* QoS Score & Index Header */}
            <div className="flex items-center justify-between rounded-[4px] border border-[var(--stroke)] bg-[var(--bg-3)] px-2 py-1 shadow-inner">
                <div className="flex flex-col">
                    <span className="text-[6.5px] font-black uppercase tracking-wider text-[var(--ink-faint)]">Quality Index</span>
                    <span className="text-[8px] font-bold text-[var(--ink-dim)]">500k CAN-Bus</span>
                </div>
                <div className="text-right">
                    <span className="font-mono text-[11px] font-black text-[var(--ok)] drop-shadow-[0_0_4px_rgba(34,197,94,0.35)]">98.2%</span>
                </div>
            </div>

            {/* Frame Matrix Card */}
            <div className="rounded-[4px] border border-[var(--stroke)] bg-[var(--bg-2)] p-2 relative">
                <div className="absolute top-1 left-1.5 text-[6.5px] font-black uppercase tracking-wider text-[var(--ink-faint)]">
                    Frame Consistency Matrix
                </div>
                
                {/* Responsive 10x6 Grid with visible and interactive cells */}
                <div className="grid grid-cols-10 gap-1.5 mt-3.5">
                    {INTEGRITY_CELLS.map((cell, i) => {
                        const bgClass = cell.cls === 'ok' 
                            ? 'bg-[var(--ok)] hover:bg-emerald-400' 
                            : cell.cls === 'warn' 
                            ? 'bg-[var(--warn)] hover:bg-amber-400 shadow-[0_0_6px_var(--warn)]' 
                            : 'bg-[var(--danger)] hover:bg-red-400 shadow-[0_0_6px_var(--danger)]';
                            
                        const focusRing = cell.cls === 'ok' 
                            ? 'focus:ring-[var(--ok)]' 
                            : cell.cls === 'warn' 
                            ? 'focus:ring-[var(--warn)]' 
                            : 'focus:ring-[var(--danger)]';

                        return (
                            <motion.button
                                key={i}
                                type="button"
                                aria-label={`Frame ${i + 1} status: ${cell.cls}`}
                                className={`w-full h-3 rounded-[2px] transition-colors focus:outline-none focus:ring-1 ${focusRing} ${bgClass}`}
                                style={{ 
                                    opacity: cell.o, 
                                    cursor: cell.cls !== 'ok' ? 'pointer' : 'default' 
                                } as React.CSSProperties}
                                whileHover={shouldReduceMotion ? {} : { 
                                    scale: 1.25, 
                                    zIndex: 10,
                                    opacity: 1 
                                }}
                                onClick={() => (cell.cls === 'err' || cell.cls === 'warn') && onFilter?.(cell.cls as 'err' | 'warn', cell.frameIdx)}
                            />
                        );
                    })}
                </div>

                {/* Cyber Diagnostics Legend */}
                <div className="mt-2.5 pt-2 border-t border-[var(--stroke)] grid grid-cols-3 gap-0.5 text-[7px] font-black uppercase tracking-wider">
                    <div className="flex items-center gap-1 text-[var(--ok)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] flex-shrink-0" />
                        <span className="truncate">Pass: {okCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--warn)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)] flex-shrink-0 animate-pulse" />
                        <span className="truncate">Drift: {warnCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--danger)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] flex-shrink-0 animate-pulse" />
                        <span className="truncate">Fail: {errCount}</span>
                    </div>
                </div>
            </div>

            {/* Premium Mini Waveform */}
            <MiniWaveform />
        </div>
    );
});

// ── Button-based left rail ──────────────────────────────────────────────────
export const LeftRail: React.FC<RailProps> = React.memo(({ state, setState, onFilterRequest }) => {
    const { running, channels, trig, timebase } = state;
    const [activeTab, setActiveTab] = React.useState<'h' | 'l' | 'd'>('h');

    return (
        <div className="osc-leftrail">
            {/* Acquisition */}
            <section className="osc-panel" aria-labelledby="acquisition-title">
                <div className="osc-panel-h">
                    <span id="acquisition-title" className="osc-t">Acquisition</span>
                    <span className={`osc-pill live ${running ? 'ok' : 'dim'}`}>
                        <span className="osc-dot" />
                        {running ? 'Live' : 'Held'}
                    </span>
                </div>
                <div className="osc-panel-b">
                    <div className="osc-btn-row">
                        <button
                            className={`osc-bigbtn focus-ring-cyber ${running ? 'primary' : ''}`}
                            onClick={() => setState(s => ({ ...s, running: true }))}
                        >
                            <Play /><span>Run</span>
                        </button>
                        <button
                            className={`osc-bigbtn focus-ring-cyber ${!running ? 'primary danger' : 'danger'}`}
                            onClick={() => setState(s => ({ ...s, running: false }))}
                        >
                            <Stop /><span>Stop</span>
                        </button>
                    </div>
                    <button className="osc-bigbtn focus-ring-cyber" onClick={() => setState(s => ({ ...s, running: false }))}>
                        <Single /><span>Single</span><span className="osc-k" aria-label="Shortcut: S">S</span>
                    </button>
                </div>
            </section>

            {/* Channel Map */}
            <section className="osc-panel" aria-labelledby="channel-map-title">
                <div className="osc-panel-h">
                    <span id="channel-map-title" className="osc-t">Channel Controls</span>
                    <span className="osc-pill dim">Select Tab</span>
                </div>
                <div className="osc-panel-b">
                    <div className="osc-tabs" role="tablist" aria-label="Select active channel">
                        {(['h', 'l', 'd'] as const).map(k => {
                            const nameLbl = k === 'h' ? 'CH1' : k === 'l' ? 'CH2' : 'MATH';
                            const chcClass = k === 'h' ? 'osc-ch-h' : k === 'l' ? 'osc-ch-l' : 'osc-ch-d';
                            const isOn = channels[k].on;
                            const color = k === 'h' ? 'var(--ch1)' : k === 'l' ? 'var(--ch2)' : 'var(--chd)';
                            return (
                                <button
                                    key={k}
                                    role="tab"
                                    aria-selected={activeTab === k}
                                    aria-label={`${nameLbl} controls`}
                                    className={`osc-tab focus-ring-cyber ${chcClass} ${activeTab === k ? 'active' : ''}`}
                                    onClick={() => setActiveTab(k)}
                                >
                                    <span className="flex items-center justify-center gap-1.5">
                                        <span 
                                            className="w-1.5 h-1.5 rounded-full" 
                                            style={{ 
                                                backgroundColor: isOn ? color : 'var(--stroke-2)',
                                                boxShadow: isOn ? `0 0 6px ${color}` : 'none'
                                            }}
                                            aria-hidden="true"
                                        />
                                        {nameLbl}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {(['h', 'l', 'd'] as const).filter(k => k === activeTab).map(k => {
                        const cfg = channels[k];
                        const chcClass = k === 'h' ? 'osc-ch-h' : k === 'l' ? 'osc-ch-l' : 'osc-ch-d';
                        const nameLbl = k === 'h' ? 'CH1' : k === 'l' ? 'CH2' : 'MATH';
                        const subLbl = k === 'h' ? '· CAN_H' : k === 'l' ? '· CAN_L' : '· DIFF (H−L)';
                        return (
                            <div key={k}
                                className={`osc-ch-card ${chcClass}`}
                                data-on={String(cfg.on)}
                                id={`panel-${k === 'h' ? 'ch1' : k === 'l' ? 'ch2' : 'math'}`}
                                role="tabpanel"
                            >
                                <div className="osc-ch-head">
                                    <div className="osc-sw" />
                                    <div className="osc-name">{nameLbl}</div>
                                    <div className="osc-label">{subLbl}</div>
                                    <button 
                                        type="button"
                                        className="osc-ch-on focus-ring-cyber"
                                        aria-label={`Toggle ${nameLbl} Visibility`}
                                        aria-pressed={cfg.on}
                                        onClick={() => setState(s => ({
                                            ...s,
                                            channels: { ...s.channels, [k]: { ...s.channels[k], on: !s.channels[k].on } }
                                        }))}
                                    />
                                </div>
                                <div className="osc-ch-body">
                                    <div className="osc-kv">
                                        <span className="osc-k">V / div</span>
                                        <span className="osc-v">{cfg.vpd} V</span>
                                    </div>
                                    <div className="osc-stepper" role="group" aria-label={`${nameLbl} vertical scale`}>
                                        {VPD_OPTS.map(v => (
                                            <button
                                                key={v}
                                                className={`focus-ring-cyber ${cfg.vpd === v ? 'active' : ''}`}
                                                aria-label={`Set ${nameLbl} scale to ${v < 1 ? v.toFixed(1) : v} V/div`}
                                                aria-pressed={cfg.vpd === v}
                                                onClick={() => setState(s => ({
                                                    ...s,
                                                    channels: { ...s.channels, [k]: { ...s.channels[k], vpd: v } }
                                                }))}
                                            >{v < 1 ? v.toFixed(1) : v}</button>
                                        ))}
                                    </div>
                                    <div className="osc-kv">
                                        <span className="osc-k">Position</span>
                                        <span className="osc-v">{cfg.off >= 0 ? '+' : ''}{cfg.off.toFixed(2)} V</span>
                                    </div>
                                    <input
                                        className="osc-slider focus-ring-cyber"
                                        type="range" min="-2" max="2" step="0.05"
                                        value={cfg.off}
                                        onChange={e => setState(s => ({
                                            ...s,
                                            channels: { ...s.channels, [k]: { ...s.channels[k], off: parseFloat(e.target.value) } }
                                        }))}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Horizontal & Level */}
            <section className="osc-panel" aria-labelledby="time-level-title">
                <div className="osc-panel-h">
                    <span id="time-level-title" className="osc-t">Horizontal & Level</span>
                    <span className="osc-pill ok"><span className="osc-dot" />Armed</span>
                </div>
                <div className="osc-panel-b">
                    <div className="osc-kv">
                        <span className="osc-k">Time / div</span>
                        <span className="osc-v">{fmtTb(timebase)}</span>
                    </div>
                    <div className="osc-stepper">
                        {TB_OPTS.map(v => (
                            <button
                                key={v}
                                className={`focus-ring-cyber ${timebase === v ? 'active' : ''}`}
                                onClick={() => setState(s => ({ ...s, timebase: v }))}
                            >{v < 1000 ? v : `${v / 1000}m`}</button>
                        ))}
                    </div>
                    
                    <div className="osc-kv mt-2">
                        <span className="osc-k">Trigger Level</span>
                        <span className="osc-v">{trig.level.toFixed(2)} V</span>
                    </div>
                    <input
                        className="osc-slider focus-ring-cyber"
                        type="range" min="0" max="5" step="0.05"
                        value={trig.level}
                        onChange={e => setState(st => ({ ...st, trig: { ...st.trig, level: parseFloat(e.target.value) } }))}
                    />
                </div>
            </section>

            {/* Integrity Map */}
            <section className="osc-panel" aria-labelledby="integrity-map-title">
                <div className="osc-panel-h">
                    <span id="integrity-map-title" className="osc-t">Integrity Map</span>
                    <span className="osc-pill warn flex items-center gap-1">
                        <Binary className="h-3.5 w-3.5" />
                        <span>bit consistency</span>
                    </span>
                </div>
                <div className="osc-panel-b">
                    <IntegrityMap onFilter={onFilterRequest} />
                </div>
            </section>
        </div>
    );
});

// ── Knob-based left rail ────────────────────────────────────────────────────
export const KnobRail: React.FC<RailProps> = React.memo(({ state, setState, onFilterRequest }) => {
    const { running, channels, trig, timebase } = state;
    const [activeTab, setActiveTab] = React.useState<'h' | 'l' | 'd'>('h');

    const CH_CFG = [
        { k: 'h' as const, lbl: 'CH1 CAN_H', color: 'var(--ch1)' },
        { k: 'l' as const, lbl: 'CH2 CAN_L', color: 'var(--ch2)' },
        { k: 'd' as const, lbl: 'MATH DIFF',  color: 'var(--chd)' },
    ];

    return (
        <div className="osc-leftrail">
            {/* Acquisition */}
            <div className="osc-panel">
                <div className="osc-panel-h">
                    <span className="osc-t">Acquisition</span>
                    <span className={`osc-pill live ${running ? 'ok' : 'dim'}`}>
                        <span className="osc-dot" aria-hidden="true" />{running ? 'Live' : 'Held'}
                    </span>
                </div>
                <div className="osc-panel-b">
                    <div className="osc-btn-row">
                        <button
                            className={`osc-bigbtn focus-ring-cyber ${running ? 'primary' : ''}`}
                            aria-label="Run acquisition"
                            onClick={() => setState(s => ({ ...s, running: true }))}
                        ><Play /><span>Run</span></button>
                        <button
                            className={`osc-bigbtn focus-ring-cyber ${!running ? 'primary danger' : 'danger'}`}
                            aria-label="Stop acquisition"
                            onClick={() => setState(s => ({ ...s, running: false }))}
                        ><Stop /><span>Stop</span></button>
                    </div>
                    <button className="osc-bigbtn focus-ring-cyber" aria-label="Single acquisition trigger" onClick={() => setState(s => ({ ...s, running: false }))}>
                        <Single /><span>Single</span><span className="osc-k">S</span>
                    </button>
                </div>
            </div>

            {/* Channel knobs */}
            <div className="osc-panel">
                <div className="osc-panel-h">
                    <span className="osc-t">Channel Controls</span>
                    <span className="osc-pill dim">Select Tab</span>
                </div>
                <div className="osc-panel-b">
                    <div className="osc-tabs" role="tablist" aria-label="Select active channel">
                        {CH_CFG.map(ch => {
                            const nameLbl = ch.k === 'h' ? 'CH1' : ch.k === 'l' ? 'CH2' : 'MATH';
                            const chcClass = ch.k === 'h' ? 'osc-ch-h' : ch.k === 'l' ? 'osc-ch-l' : 'osc-ch-d';
                            const isOn = channels[ch.k].on;
                            return (
                                <button
                                    key={ch.k}
                                    role="tab"
                                    aria-selected={activeTab === ch.k}
                                    aria-label={`${nameLbl} controls`}
                                    className={`osc-tab focus-ring-cyber ${chcClass} ${activeTab === ch.k ? 'active' : ''}`}
                                    onClick={() => setActiveTab(ch.k)}
                                >
                                    <span className="flex items-center justify-center gap-1.5">
                                        <span 
                                            className="w-1.5 h-1.5 rounded-full" 
                                            style={{ 
                                                backgroundColor: isOn ? ch.color : 'var(--stroke-2)',
                                                boxShadow: isOn ? `0 0 6px ${ch.color}` : 'none'
                                            }}
                                            aria-hidden="true"
                                        />
                                        {nameLbl}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {CH_CFG.filter(ch => ch.k === activeTab).map(ch => (
                        <div key={ch.k} className="osc-ch-row" id={`panel-${ch.k === 'h' ? 'ch1' : ch.k === 'l' ? 'ch2' : 'math'}`} role="tabpanel">
                            <RockerSwitch
                                on={channels[ch.k].on}
                                color={ch.color}
                                label={ch.lbl}
                                onChange={v => setState(s => ({
                                    ...s,
                                    channels: { ...s.channels, [ch.k]: { ...s.channels[ch.k], on: v } }
                                }))}
                            />
                            <div className="osc-knob-grid">
                                <KnobControl
                                    value={channels[ch.k].vpd}
                                    options={VPD_OPTS}
                                    label="V / DIV"
                                    valueLabel={`${channels[ch.k].vpd} V`}
                                    color={ch.color}
                                    onChange={v => setState(s => ({
                                        ...s,
                                        channels: { ...s.channels, [ch.k]: { ...s.channels[ch.k], vpd: v } }
                                    }))}
                                />
                                <KnobControl
                                    value={channels[ch.k].off}
                                    min={-2} max={2} step={0.05}
                                    label="POSITION"
                                    valueLabel={`${channels[ch.k].off >= 0 ? '+' : ''}${channels[ch.k].off.toFixed(2)} V`}
                                    color={ch.color}
                                    onChange={v => setState(s => ({
                                        ...s,
                                        channels: { ...s.channels, [ch.k]: { ...s.channels[ch.k], off: v } }
                                    }))}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Horizontal & Level knobs */}
            <div className="osc-panel">
                <div className="osc-panel-h">
                    <span className="osc-t">Horizontal & Level</span>
                    <span className="osc-pill ok"><span className="osc-dot" />Armed</span>
                </div>
                <div className="osc-panel-b">
                    <div className="osc-knob-grid">
                        <KnobControl
                            value={timebase} options={TB_OPTS}
                            label="TIME / DIV"
                            valueLabel={fmtTb(timebase)}
                            color="var(--accent)"
                            onChange={v => setState(s => ({ ...s, timebase: v }))}
                        />
                        <KnobControl
                            value={trig.level} min={0} max={5} step={0.05}
                            label="TRIG LEVEL"
                            valueLabel={`${trig.level.toFixed(2)} V`}
                            color="var(--accent)"
                            onChange={v => setState(s => ({ ...s, trig: { ...s.trig, level: v } }))}
                        />
                    </div>
                </div>
            </div>

            {/* Integrity Map */}
            <div className="osc-panel">
                <div className="osc-panel-h">
                    <span className="osc-t">Integrity Map</span>
                    <span className="osc-pill warn flex items-center gap-1">
                        <Binary className="h-3.5 w-3.5" />
                        <span>bit consistency</span>
                    </span>
                </div>
                <div className="osc-panel-b">
                    <IntegrityMap onFilter={onFilterRequest} />
                </div>
            </div>
        </div>
    );
});
