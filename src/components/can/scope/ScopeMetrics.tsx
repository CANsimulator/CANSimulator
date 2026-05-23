import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, Target, ChevronDown, ChevronUp, Sliders } from 'lucide-react';
import type { OscMeas, OscState } from './types';
import { CanTriggerMenu } from './CanTriggerMenu';

type SetState = React.Dispatch<React.SetStateAction<OscState>>;

interface RightRailProps {
    meas: OscMeas;
    running: boolean;
    state: OscState;
    setState: SetState;
    onAutoscale: () => void;
}


interface HealthEntry {
    label: string;
    badge: 'PASS' | 'DRIFT' | 'WARN' | 'FAIL';
    value: string;
    unit: string;
    num: number;
    range: [number, number];
    nominal?: number;
}

interface SignalMetric {
    label: string;
    value: string;
    unit: string;
    trend?: 'up' | 'down' | 'flat';
    accent?: 'ok' | 'warn' | 'err';
}

interface RailPanelProps {
    title: string;
    eyebrow: string;
    icon: React.ReactNode;
    tone: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

export const ScopeMetrics: React.FC<RightRailProps> = ({ meas, state, setState, onAutoscale }) => {
    const [isEditingLevel, setIsEditingLevel] = React.useState(false);
    const [editLevelVal, setEditLevelVal] = React.useState(state.trig.level.toFixed(2));
    const [showAdvanced, setShowAdvanced] = React.useState(false);

    React.useEffect(() => {
        setEditLevelVal(state.trig.level.toFixed(2));
    }, [state.trig.level]);

    const handleLevelSubmit = () => {
        setIsEditingLevel(false);
        let val = parseFloat(editLevelVal);
        if (isNaN(val)) {
            setEditLevelVal(state.trig.level.toFixed(2));
            return;
        }
        val = Math.max(0, Math.min(5, val));
        setState(st => ({ ...st, trig: { ...st.trig, level: parseFloat(val.toFixed(2)) } }));
    };

    const handleLevelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleLevelSubmit();
        } else if (e.key === 'Escape') {
            setIsEditingLevel(false);
            setEditLevelVal(state.trig.level.toFixed(2));
        }
    };

    const stepLevel = (direction: 'up' | 'down') => {
        const delta = 0.05;
        const current = state.trig.level;
        const next = direction === 'up' ? Math.min(5, current + delta) : Math.max(0, current - delta);
        setState(st => ({ ...st, trig: { ...st.trig, level: parseFloat(next.toFixed(2)) } }));
    };

    const healthMetrics: HealthEntry[] = useMemo(() => {
        const cmVal = meas.cmDrift * 1000;
        const cmBadge = Math.abs(cmVal) > 100 ? 'FAIL' : Math.abs(cmVal) > 50 ? 'DRIFT' : 'PASS';
        
        return [
            { label: 'CAN_H', badge: 'PASS', value: (2.5 + meas.vppH/2).toFixed(2), unit: 'V', num: 2.5 + meas.vppH/2, range: [2.5, 4.5], nominal: 3.5 },
            { label: 'CAN_L', badge: 'PASS', value: (2.5 - meas.vppL/2).toFixed(2), unit: 'V', num: 2.5 - meas.vppL/2, range: [0.5, 2.5], nominal: 1.5 },
            { label: 'DIFFERENTIAL', badge: meas.vppD < 1.5 ? 'FAIL' : 'PASS', value: meas.vppD.toFixed(2), unit: 'V', num: meas.vppD, range: [1.5, 3.0], nominal: 2.0 },
            { label: 'RESISTANCE', badge: 'PASS', value: '118.4', unit: 'Ω', num: 118.4, range: [108, 132], nominal: 120 },
            { label: 'CM DRIFT', badge: cmBadge, value: (cmVal >= 0 ? '+' : '') + cmVal.toFixed(0), unit: 'mV', num: cmVal, range: [-150, 150], nominal: 0 },
        ];
    }, [meas]);

    const analyticsMetrics: SignalMetric[] = useMemo(() => [
        { label: 'RISE', value: meas.rise.toFixed(1), unit: 'ns', trend: 'flat' },
        { label: 'FALL', value: meas.fall.toFixed(1), unit: 'ns', trend: 'flat' },
        { label: 'JITTER', value: '2.1', unit: 'ns', trend: 'down' },
        { label: 'BAUD', value: '500', unit: 'k', trend: 'flat' },
        { label: 'LOAD', value: '14.8', unit: '%', trend: 'up' },
        { label: 'ERR RATE', value: '0.01', unit: '%', trend: 'flat' },
    ], [meas.rise, meas.fall]);

    const sourceColor = state.trig.source === 'CH1' ? 'var(--ch1)' : state.trig.source === 'CH2' ? 'var(--ch2)' : 'var(--chd)';
    const sourceGlow = state.trig.source === 'CH1' ? '0 0 8px rgba(0, 243, 255, 0.4)' : state.trig.source === 'CH2' ? '0 0 8px rgba(191, 0, 255, 0.4)' : '0 0 8px rgba(0, 255, 159, 0.4)';

    return (
        <aside className="osc-rightrail flex flex-col p-1 select-none relative" role="complementary" aria-label="Oscilloscope Metrics">
            <div className="osc-rightrail-scroll">
                <RailPanel title="Trigger" eyebrow="controls & sync" icon={<Target className="h-3.5 w-3.5" />} tone="var(--accent)">
                <div className="p-2 flex flex-col gap-2 bg-[var(--bg-2)]">
                    {/* Dynamic Status / Sync Banner */}
                    <div className="flex items-center justify-between px-2 py-1 bg-black/40 rounded border border-[var(--stroke)] text-[9px] font-black uppercase tracking-wider font-mono shadow-inner">
                        <span className="text-[var(--ink-faint)]">Sync Status</span>
                        <div className="flex items-center gap-1.5">
                            <span 
                                className={`w-1.5 h-1.5 rounded-full ${state.running ? 'bg-[var(--ok)] shadow-[0_0_6px_var(--ok)] animate-pulse' : 'bg-[var(--danger)] shadow-[0_0_6px_var(--danger)]'}`}
                                style={{ animationDuration: '1.5s' }}
                            />
                            <span className={state.running ? 'text-[var(--ok)] font-bold' : 'text-[var(--danger)] font-bold'}>
                                {state.running ? (state.trig.sweep === 'Auto' ? 'AUTO / TRIG\'D' : 'ARMED') : 'HELD'}
                            </span>
                        </div>
                    </div>

                    {/* Source Selection Header */}
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] px-0.5 mt-0.5">
                        <span className="text-[var(--ink-faint)]">Source</span>
                        <span className="font-bold font-mono" style={{ color: sourceColor, textShadow: sourceGlow }}>{state.trig.source}</span>
                    </div>

                    {/* Source selection */}
                    <div className="grid grid-cols-3 gap-1.5">
                        {(['CH1', 'CH2', 'DIFF'] as const).map(s => {
                            const isAct = state.trig.source === s;
                            const btnColor = s === 'CH1' ? 'var(--ch1)' : s === 'CH2' ? 'var(--ch2)' : 'var(--chd)';
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setState(st => ({ ...st, trig: { ...st.trig, source: s } }))}
                                    className={`osc-chip focus-ring-cyber !py-1.5 transition-all duration-150 ${isAct ? 'active' : ''}`}
                                    style={isAct ? { 
                                        backgroundColor: btnColor, 
                                        borderColor: btnColor, 
                                        color: '#000',
                                        fontWeight: 900,
                                        boxShadow: `0 0 10px ${btnColor}`
                                    } : {}}
                                >
                                    {s}
                                </button>
                            );
                        })}
                    </div>

                    {/* Mode selection (EDGE, PULSE, LEVEL, CAN) - Perfectly Balanced 2x2 Grid */}
                    <div className="flex flex-col gap-1">
                        <div className="text-[9px] font-black uppercase tracking-wider text-[var(--ink-faint)] px-0.5 mt-0.5">Mode</div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {(['Edge', 'Pulse', 'Level'] as const).map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setState(st => ({ ...st, trig: { ...st.trig, mode: m } }))}
                                    className={`osc-chip focus-ring-cyber !py-1.5 ${state.trig.mode === m ? 'active' : ''}`}
                                >
                                    {m}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setState(st => ({ ...st, trig: { ...st.trig, mode: 'CAN/Protocol' } }))}
                                className={`osc-chip focus-ring-cyber !py-1.5 ${state.trig.mode === 'CAN/Protocol' ? 'active' : ''}`}
                            >
                                CAN Protocol
                            </button>
                        </div>
                    </div>

                    {/* Sweep Selection */}
                    <div className="flex flex-col gap-1">
                        <div className="text-[9px] font-black uppercase tracking-wider text-[var(--ink-faint)] px-0.5 mt-0.5">Sweep</div>
                        <div className="grid grid-cols-3 gap-1.5">
                            {(['Auto', 'Normal', 'Single'] as const).map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setState(st => ({ ...st, trig: { ...st.trig, sweep: m } }))}
                                    className={`osc-chip focus-ring-cyber !py-1.5 ${state.trig.sweep === m ? 'active' : ''}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Integrated Interactive Trigger Level Control */}
                    <div className="flex flex-col gap-1 border-t border-[var(--stroke)] pt-2 mt-1">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] px-0.5">
                            <span className="text-[var(--ink-faint)]">Trigger Level</span>
                            <div className="flex items-center gap-1">
                                {isEditingLevel ? (
                                    <input
                                        type="text"
                                        value={editLevelVal}
                                        onChange={e => setEditLevelVal(e.target.value.replace(/[^0-9.]/g, ''))}
                                        onBlur={handleLevelSubmit}
                                        onKeyDown={handleLevelKeyDown}
                                        className="w-12 text-right bg-[var(--bg-3)] border border-[var(--stroke-2)] rounded px-1 text-[10px] font-mono font-bold text-white focus:outline-none focus:border-[var(--accent)]"
                                        autoFocus
                                    />
                                ) : (
                                    <span 
                                        onClick={() => setIsEditingLevel(true)}
                                        className="font-mono font-bold cursor-pointer hover:underline text-[10px] py-0.5 px-1 rounded bg-[var(--bg-3)] border border-[var(--stroke-2)]"
                                        title="Click to edit numerically"
                                    >
                                        {state.trig.level.toFixed(2)} V
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Fine tuning decrement */}
                            <button
                                type="button"
                                onClick={() => stepLevel('down')}
                                className="w-5 h-5 rounded border border-[var(--stroke-2)] bg-[var(--bg-3)] hover:bg-[var(--stroke)] text-[var(--ink-dim)] hover:text-white flex items-center justify-center font-bold text-xs transition-colors focus-ring-cyber"
                                aria-label="Decrement Trigger Level 0.05V"
                            >
                                -
                            </button>

                            {/* Range slider styled dynamically to match source color */}
                            <input
                                type="range"
                                min="0"
                                max="5"
                                step="0.05"
                                value={state.trig.level}
                                onChange={e => setState(st => ({ ...st, trig: { ...st.trig, level: parseFloat(e.target.value) } }))}
                                className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-[var(--bg-3)] accent-color"
                                style={{ 
                                    accentColor: sourceColor,
                                    outline: 'none'
                                } as React.CSSProperties}
                                aria-label="Trigger Level Slider"
                            />

                            {/* Fine tuning increment */}
                            <button
                                type="button"
                                onClick={() => stepLevel('up')}
                                className="w-5 h-5 rounded border border-[var(--stroke-2)] bg-[var(--bg-3)] hover:bg-[var(--stroke)] text-[var(--ink-dim)] hover:text-white flex items-center justify-center font-bold text-xs transition-colors focus-ring-cyber"
                                aria-label="Increment Trigger Level 0.05V"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Advanced Settings collapsible drawer */}
                    <div className="flex flex-col gap-1 border-t border-[var(--stroke)] pt-2 mt-0.5">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center justify-between w-full text-[9px] font-black uppercase tracking-wider text-[var(--ink-dim)] hover:text-white py-0.5 transition-colors focus-ring-cyber"
                            aria-expanded={showAdvanced}
                        >
                            <span className="flex items-center gap-1.5">
                                <Sliders className="h-3 w-3" />
                                Advanced Settings
                            </span>
                            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        <motion.div
                            initial={false}
                            animate={showAdvanced ? { height: 'auto', opacity: 1, marginTop: 4 } : { height: 0, opacity: 0, marginTop: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden flex flex-col gap-2"
                        >
                            {/* Slope Toggle */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[7.5px] font-black uppercase tracking-wider text-[var(--ink-faint)]">Slope</span>
                                <div className="grid grid-cols-2 gap-1">
                                    {(['Rising', 'Falling'] as const).map(sl => {
                                        const isAct = state.trig.slope === sl;
                                        return (
                                            <button
                                                key={sl}
                                                type="button"
                                                onClick={() => setState(st => ({ ...st, trig: { ...st.trig, slope: sl } }))}
                                                className={`osc-chip focus-ring-cyber !py-1 text-[8px] ${isAct ? 'active' : ''}`}
                                                aria-pressed={isAct}
                                            >
                                                {sl === 'Rising' ? 'Rising (↑)' : 'Falling (↓)'}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Coupling Selector */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[7.5px] font-black uppercase tracking-wider text-[var(--ink-faint)]">Coupling</span>
                                <div className="grid grid-cols-3 gap-1">
                                    {(['DC', 'AC', 'HF REJ'] as const).map(cp => {
                                        const isAct = state.trig.coupling === cp;
                                        return (
                                            <button
                                                key={cp}
                                                type="button"
                                                onClick={() => setState(st => ({ ...st, trig: { ...st.trig, coupling: cp } }))}
                                                className={`osc-chip focus-ring-cyber !py-1 text-[7.5px] ${isAct ? 'active' : ''}`}
                                                aria-pressed={isAct}
                                            >
                                                {cp}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Holdoff Stepper */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[7.5px] font-black uppercase tracking-wider text-[var(--ink-faint)]">
                                    <span>Holdoff</span>
                                    <span className="font-mono font-bold text-[var(--ink)]">{(state.trig.holdoff ?? 1.0).toFixed(1)} µs</span>
                                </div>
                                <div className="flex items-stretch border border-[var(--stroke-2)] bg-[var(--bg-3)] rounded overflow-hidden h-6">
                                    <button
                                        type="button"
                                        className="flex-1 hover:bg-[var(--stroke)] text-[var(--ink-dim)] hover:text-white transition-colors text-xs font-bold"
                                        onClick={() => setState(st => {
                                            const val = Math.max(1.0, (st.trig.holdoff ?? 1.0) - 0.5);
                                            return { ...st, trig: { ...st.trig, holdoff: parseFloat(val.toFixed(1)) } };
                                        })}
                                        aria-label="Decrement Holdoff"
                                    >
                                        -
                                    </button>
                                    <button
                                        type="button"
                                        className="flex-1 hover:bg-[var(--stroke)] text-[var(--ink-dim)] hover:text-white transition-colors text-xs font-bold"
                                        onClick={() => setState(st => {
                                            const val = Math.min(10.0, (st.trig.holdoff ?? 1.0) + 0.5);
                                            return { ...st, trig: { ...st.trig, holdoff: parseFloat(val.toFixed(1)) } };
                                        })}
                                        aria-label="Increment Holdoff"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Actions: Auto / Cal */}
                    <div className="grid grid-cols-2 gap-1.5 mt-1 border-t border-[var(--stroke)] pt-2">
                        <button
                            type="button"
                            onClick={onAutoscale}
                            className="flex items-center justify-center gap-1.5 h-8 rounded-[4px] border border-[var(--stroke-2)] bg-[var(--bg-3)] hover:bg-[var(--stroke)] hover:text-white text-[var(--ink)] font-bold text-[10px] uppercase tracking-wider transition-all focus-ring-cyber"
                            aria-label="Auto-scale all channels"
                        >
                            <Target className="h-3 w-3" />
                            <span>Auto</span>
                        </button>
                        <button
                            type="button"
                            className="flex items-center justify-center gap-1.5 h-8 rounded-[4px] border border-[var(--stroke-2)] bg-[var(--bg-3)] hover:bg-[var(--stroke)] hover:text-white text-[var(--ink)] font-bold text-[10px] uppercase tracking-wider transition-all focus-ring-cyber"
                            aria-label="Calibrate channels"
                        >
                            <span>Cal</span>
                        </button>
                    </div>
                </div>
            </RailPanel>

            <RailPanel title="Physical Health" eyebrow="line status" icon={<ShieldCheck className="h-3.5 w-3.5" />} tone="var(--ok)">
                <div className="flex flex-col gap-1 p-1.5">
                    {healthMetrics.map(entry => <HealthRow key={entry.label} entry={entry} />)}
                </div>
            </RailPanel>

            <RailPanel title="Analytics" eyebrow="signal & bus" icon={<Activity className="h-3.5 w-3.5" />} tone="var(--ch1)">
                <div className="grid grid-cols-2 gap-px bg-[var(--stroke)] p-px">
                    {analyticsMetrics.map(metric => <MetricCard key={metric.label} metric={metric} />)}
                </div>
            </RailPanel>
            </div>
            <CanTriggerMenu 
                isOpen={state.trig.mode === 'CAN/Protocol'} 
                state={state} 
                setState={setState} 
                onClose={() => setState(st => ({ ...st, trig: { ...st.trig, mode: 'Edge' } }))} 
            />
        </aside>
    );
};

const RailPanel: React.FC<RailPanelProps> = React.memo(({ title, eyebrow, icon, tone, action, children }) => (
    <section className="overflow-hidden rounded-[6px] border border-[var(--stroke)] bg-[var(--bg)]" style={{ '--panel-tone': tone } as React.CSSProperties}>
        <div className="relative flex items-center justify-between gap-3 bg-[var(--bg-2)] px-2 py-1.5">
            <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-[4px] border border-[var(--panel-tone)]/20 bg-black/30 text-[var(--panel-tone)]">{icon}</span>
                <div className="min-w-0">
                    <h3 className="truncate text-[8px] font-black uppercase tracking-[0.16em] text-[var(--ink)]">{title}</h3>
                    <div className="truncate text-[7px] font-bold uppercase tracking-[0.24em] text-[var(--ink-faint)]">{eyebrow}</div>
                </div>
            </div>
            {action}
        </div>
        {children}
    </section>
));

const HealthRow: React.FC<{ entry: HealthEntry }> = React.memo(({ entry }) => {
    const statusClass = `status-${entry.badge.toLowerCase()}`;
    const [lo, hi] = entry.range;
    const pos = clampPercent(((entry.num - lo) / (hi - lo)) * 100);
    const nominal = entry.nominal === undefined ? null : clampPercent(((entry.nominal - lo) / (hi - lo)) * 100);

    return (
        <div className={`rounded-[4px] border border-[var(--stroke)] bg-[var(--bg-2)] px-2 py-1 ${statusClass}`}>
            <div className="flex items-center justify-between gap-1.5">
                <span className="truncate text-[7px] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{entry.label}</span>
                <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-black text-[var(--ink)] tabular-nums">{entry.value}<span className="ml-0.5 text-[7px] text-[var(--ink-faint)]">{entry.unit}</span></span>
                    <span className="rounded-[2px] border border-[var(--status-ring)] bg-[var(--status-bg)] px-1 py-0.5 text-[6px] font-black text-[var(--status-color)]">{entry.badge}</span>
                </div>
            </div>
            <div className="relative mt-1 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                {nominal !== null && <div className="absolute top-0 h-full w-px bg-white/20 z-10" style={{ left: `${nominal}%` } as React.CSSProperties} />}
                <motion.div className="h-full bg-[var(--status-color)]" style={{ width: `${pos}%` } as React.CSSProperties} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5 }} />
            </div>
        </div>
    );
});

const MetricCard: React.FC<{ metric: SignalMetric }> = React.memo(({ metric }) => {
    const trendGlyph = metric.trend === 'up' ? '▲' : metric.trend === 'down' ? '▼' : '▬';
    const trendClass = metric.trend === 'up' ? 'text-[var(--ok)]' : metric.trend === 'down' ? 'text-[var(--danger)]' : 'text-[var(--ink-faint)]';

    return (
        <div className="bg-[var(--bg-2)] px-2 py-1.5 transition-colors hover:bg-[var(--bg-3)]">
            <div className="flex items-center justify-between text-[7px] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">
                <span className="truncate">{metric.label}</span>
                <span className={`font-mono ${trendClass}`}>{trendGlyph}</span>
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
                <span className="font-mono text-[13px] font-black text-[var(--ink)]">{metric.value}</span>
                <span className="text-[7px] font-bold text-[var(--ink-faint)]">{metric.unit}</span>
            </div>
        </div>
    );
});


