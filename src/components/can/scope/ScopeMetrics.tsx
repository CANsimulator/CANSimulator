import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, ShieldCheck, Binary } from 'lucide-react';
import type { OscMeas } from './types';
import { DEMO_FRAMES } from './protocolUtils';

interface RightRailProps {
    meas: OscMeas;
    running: boolean;
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

export const ScopeMetrics: React.FC<RightRailProps> = ({ meas, onFilterRequest }) => {
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

    return (
        <aside className="osc-rightrail flex flex-col gap-2 p-1 select-none" role="complementary" aria-label="Oscilloscope Metrics">
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

            <RailPanel title="Integrity Map" eyebrow="bit consistency" icon={<Binary className="h-3.5 w-3.5" />} tone="var(--warn)">
                <IntegrityMap onFilter={onFilterRequest} />
            </RailPanel>
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

const IntegrityMap: React.FC<{ onFilter?: (type: 'err' | 'warn', idx?: number) => void }> = React.memo(({ onFilter }) => {
    const shouldReduceMotion = useReducedMotion();
    return (
        <div className="p-2">
            <div className="mb-2 flex items-center justify-between rounded-[4px] border border-[var(--stroke)] bg-[var(--bg-3)] px-2 py-1">
                <span className="text-[7px] font-black uppercase text-[var(--ink-dim)]">QoS Score</span>
                <span className="font-mono text-[10px] font-black text-[var(--ok)]">98.2%</span>
            </div>
            <div className="grid grid-cols-10 gap-[2px]">
                {INTEGRITY_CELLS.map((cell, i) => (
                    <motion.button
                        key={i}
                        type="button"
                        className={`h-1.5 rounded-[1px] ${cell.cls === 'ok' ? 'bg-[var(--ok)]' : cell.cls === 'warn' ? 'bg-[var(--warn)]' : 'bg-[var(--danger)]'}`}
                        style={{ opacity: cell.o, cursor: cell.cls !== 'ok' ? 'pointer' : 'default' } as React.CSSProperties}
                        whileHover={shouldReduceMotion ? {} : { scale: 1.5, zIndex: 10 }}
                        onClick={() => (cell.cls === 'err' || cell.cls === 'warn') && onFilter?.(cell.cls as 'err' | 'warn', cell.frameIdx)}
                    />
                ))}
            </div>
        </div>
    );
});
