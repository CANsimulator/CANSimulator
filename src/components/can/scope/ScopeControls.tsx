import React from 'react';
import { KnobControl, RockerSwitch } from './KnobControl';
import { CanTriggerMenu } from './CanTriggerMenu';
import type { OscState } from './types';

type SetState = React.Dispatch<React.SetStateAction<OscState>>;

interface RailProps {
    state: OscState;
    setState: SetState;
    onAutoscale: () => void;
}

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
const Target = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
    </svg>
);

// ── Button-based left rail ──────────────────────────────────────────────────
export const LeftRail: React.FC<RailProps> = React.memo(({ state, setState, onAutoscale }) => {
    const { running, channels, trig, timebase } = state;

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
                    <div className="osc-btn-row">
                        <button className="osc-bigbtn focus-ring-cyber" onClick={onAutoscale}><Target /><span>Auto</span></button>
                        <button className="osc-bigbtn focus-ring-cyber"><span>Cal</span></button>
                    </div>
                </div>
            </section>

            {/* Channel Map */}
            <section className="osc-panel" aria-labelledby="channel-map-title">
                <div className="osc-panel-h">
                    <span id="channel-map-title" className="osc-t">Channel Map</span>
                    <span className="osc-pill dim">2 + MATH</span>
                </div>
                <div className="osc-panel-b">
                    {(['h', 'l', 'd'] as const).map(k => {
                        const cfg = channels[k];
                        const chcClass = k === 'h' ? 'osc-ch-h' : k === 'l' ? 'osc-ch-l' : 'osc-ch-d';
                        const nameLbl = k === 'h' ? 'CH1' : k === 'l' ? 'CH2' : 'MATH';
                        const subLbl = k === 'h' ? '· CAN_H' : k === 'l' ? '· CAN_L' : '· DIFF (H−L)';
                        return (
                            <div key={k}
                                className={`osc-ch-card ${chcClass}`}
                                data-on={String(cfg.on)}
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

            {/* Time + Trigger */}
            <section className="osc-panel" aria-labelledby="time-trig-title">
                <div className="osc-panel-h">
                    <span id="time-trig-title" className="osc-t">Time · Trigger</span>
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
                    <div className="osc-kv">
                        <span className="osc-k">Trigger Source</span>
                        <span className="osc-v">{trig.source}</span>
                    </div>
                    <div className="osc-trig-type">
                        {(['CH1', 'CH2', 'DIFF'] as const).map(s => (
                            <button key={s}
                                className={`osc-chip focus-ring-cyber ${trig.source === s ? 'active' : ''}`}
                                onClick={() => setState(st => ({ ...st, trig: { ...st.trig, source: s } }))}
                            >{s}</button>
                        ))}
                    </div>
                    <div className="osc-kv">
                        <span className="osc-k">Mode</span>
                        <span className="osc-v">{trig.mode}</span>
                    </div>
                    <div className="osc-trig-type osc-relative">
                        {(['Edge', 'Pulse', 'Level', 'CAN/Protocol'] as const).map(m => (
                            <button key={m}
                                className={`osc-chip focus-ring-cyber ${trig.mode === m ? 'active' : ''}`}
                                onClick={() => setState(st => ({ ...st, trig: { ...st.trig, mode: m } }))}
                            >{m === 'CAN/Protocol' ? 'CAN' : m}</button>
                        ))}
                        <CanTriggerMenu 
                            isOpen={trig.mode === 'CAN/Protocol'} 
                            state={state} 
                            setState={setState} 
                            onClose={() => setState(st => ({ ...st, trig: { ...st.trig, mode: 'Edge' } }))} 
                        />
                    </div>
                    <div className="osc-kv">
                        <span className="osc-k">Level</span>
                        <span className="osc-v">{trig.level.toFixed(2)} V</span>
                    </div>
                    <input
                        className="osc-slider focus-ring-cyber"
                        type="range" min="0" max="5" step="0.05"
                        value={trig.level}
                        onChange={e => setState(st => ({ ...st, trig: { ...st.trig, level: parseFloat(e.target.value) } }))}
                    />
                    <div className="osc-trig-type">
                        {(['Auto', 'Normal', 'Single'] as const).map(m => (
                            <button key={m}
                                className={`osc-chip focus-ring-cyber ${trig.sweep === m ? 'active' : ''}`}
                                onClick={() => setState(st => ({ ...st, trig: { ...st.trig, sweep: m } }))}
                            >{m}</button>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
});

// ── Knob-based left rail ────────────────────────────────────────────────────
export const KnobRail: React.FC<RailProps> = React.memo(({ state, setState, onAutoscale }) => {
    const { running, channels, trig, timebase } = state;

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
                    <span className="osc-pill dim">Drag / Scroll</span>
                </div>
                <div className="osc-panel-b">
                    {CH_CFG.map(ch => (
                        <div key={ch.k} className="osc-ch-row">
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

            {/* Horizontal + Trigger knobs */}
            <div className="osc-panel">
                <div className="osc-panel-h">
                    <span className="osc-t">Horizontal · Trigger</span>
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
                    <div className="osc-kv">
                        <span className="osc-k">Source</span>
                        <span className="osc-v">{trig.source}</span>
                    </div>
                    <div className="osc-trig-type">
                        {(['CH1', 'CH2', 'DIFF'] as const).map(s => (
                            <button key={s}
                                className={`osc-chip focus-ring-cyber ${trig.source === s ? 'active' : ''}`}
                                aria-label={`Trigger source: ${s}`}
                                aria-pressed={trig.source === s}
                                onClick={() => setState(st => ({ ...st, trig: { ...st.trig, source: s } }))}
                            >{s}</button>
                        ))}
                    </div>
                    <div className="osc-trig-type osc-relative">
                        {(['Edge', 'Pulse', 'Level', 'CAN/Protocol'] as const).map(m => (
                            <button key={m}
                                className={`osc-chip focus-ring-cyber ${trig.mode === m ? 'active' : ''}`}
                                aria-label={`Trigger mode: ${m}`}
                                aria-pressed={trig.mode === m}
                                onClick={() => setState(st => ({ ...st, trig: { ...st.trig, mode: m } }))}
                            >{m === 'CAN/Protocol' ? 'CAN' : m}</button>
                        ))}
                        <CanTriggerMenu 
                            isOpen={trig.mode === 'CAN/Protocol'} 
                            state={state} 
                            setState={setState} 
                            onClose={() => setState(st => ({ ...st, trig: { ...st.trig, mode: 'Edge' } }))} 
                        />
                    </div>
                    <div className="osc-trig-type">
                        {(['Auto', 'Normal', 'Single'] as const).map(m => (
                            <button key={m}
                                className={`osc-chip focus-ring-cyber ${trig.sweep === m ? 'active' : ''}`}
                                aria-label={`Sweep mode: ${m}`}
                                aria-pressed={trig.sweep === m}
                                onClick={() => setState(st => ({ ...st, trig: { ...st.trig, sweep: m } }))}
                            >{m}</button>
                        ))}
                    </div>
                    <div className="osc-btn-row osc-mt-4">
                        <button className="osc-bigbtn focus-ring-cyber" aria-label="Auto-scale all channels" onClick={onAutoscale}><Target /><span>Auto</span></button>
                        <button className="osc-bigbtn focus-ring-cyber" aria-label="Calibrate channels"><span>Cal</span></button>
                    </div>
                </div>
            </div>
        </div>
    );
});
