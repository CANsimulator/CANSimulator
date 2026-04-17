import React from 'react';
import {
    Activity,
    BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface MetricsData {
    ch1Vpp: number; ch1Avg: number; ch1Min: number; ch1Max: number;
    ch2Vpp: number; ch2Avg: number; ch2Min: number; ch2Max: number;
    vdiff: number; riseTime: number; fallTime: number;
    symmetry: number; busLoad: number; bitRate: number;
    eyeWidth: number; eyeHeight: number;
    isoCANH: boolean; isoCANL: boolean; isoDiff: boolean;
}

interface ScopeMetricsProps {
    metrics: MetricsData;
}

export const ScopeMetrics: React.FC<ScopeMetricsProps> = ({ metrics }) => {
    return (
        <div className="flex flex-col gap-4 pb-4 pl-1">
            {/* Health Monitor */}
            <section className="flex-shrink-0 glass-panel p-4 flex flex-col gap-3 !rounded-none border-white/5 bg-white/[0.01]">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-outfit font-semibold tracking-wide text-white/90">
                        Hardware Health
                    </h3>
                    <div className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-[#00ff9f]/10 text-[#00ff9f]/90 border border-[#00ff9f]/20">
                        Live
                    </div>
                </div>

                <div className="space-y-px bg-white/[0.03]">
                    {[
                        { label: 'CANH Level', ok: metrics.isoCANH, detail: `${metrics.ch1Max.toFixed(2)}V` },
                        { label: 'CANL Level', ok: metrics.isoCANL, detail: `${metrics.ch2Min.toFixed(2)}V` },
                        { label: 'Differential', ok: metrics.isoDiff, detail: `${metrics.vdiff.toFixed(2)}V` }
                    ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between px-3 py-2 bg-[#020617]">
                            <span className="text-[11px] font-outfit text-white/60">
                                {item.label}
                            </span>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-white/40 tabular-nums">
                                    {item.detail}
                                </span>
                                <span className={cn(
                                    "text-[10px] font-mono font-semibold uppercase tracking-wider tabular-nums",
                                    item.ok ? "text-[#00ff9f]" : "text-[#ff4444]"
                                )}>
                                    {item.ok ? 'PASS' : 'FAIL'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-1 px-3 py-2.5 bg-white/[0.02] border-l border-[#00f3ff]/60">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-outfit uppercase tracking-wider text-white/40">Bus Load</span>
                        <Activity size={10} className="text-[#00f3ff]/60" />
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-2xl font-mono font-light text-white tabular-nums leading-none">
                            {metrics.busLoad.toFixed(1)}
                        </span>
                        <span className="text-sm font-outfit text-white/40">%</span>
                    </div>
                    <div className="w-full h-[3px] bg-white/5 overflow-hidden">
                        <motion.div
                            animate={{ width: `${metrics.busLoad}%` }}
                            className={cn(
                                "h-full transition-colors duration-500",
                                metrics.busLoad > 80 ? "bg-[#ff4444]" : metrics.busLoad > 50 ? "bg-[#ffd000]" : "bg-[#00ff9f]"
                            )}
                        />
                    </div>
                </div>
            </section>

            {/* Signal Metrics */}
            <section className="flex-shrink-0 glass-panel p-4 flex flex-col gap-4 !rounded-none border-white/5 bg-white/[0.01]">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-outfit font-semibold tracking-wide text-white/90">
                        Signal Metrics
                    </h3>
                    <BarChart3 size={12} className="text-white/30" />
                </div>

                <div className="flex flex-col gap-4">
                    <div>
                        <label className="text-[10px] font-outfit uppercase tracking-wider text-white/40 block mb-2">Amplitude</label>
                        <div className="grid grid-cols-2 gap-px bg-white/5">
                            <MetricBox label="CH1 Vpp" value={metrics.ch1Vpp.toFixed(2)} unit="V" accent="#00f3ff" />
                            <MetricBox label="CH2 Vpp" value={metrics.ch2Vpp.toFixed(2)} unit="V" accent="#bf00ff" />
                            <MetricBox label="V Diff" value={metrics.vdiff.toFixed(2)} unit="V" accent="#00ff9f" />
                            <MetricBox label="Bit Rate" value={metrics.bitRate.toString()} unit="kb/s" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-outfit uppercase tracking-wider text-white/40 block mb-2">Timing</label>
                        <div className="grid grid-cols-2 gap-px bg-white/5">
                            <MetricBox label="Rise" value={metrics.riseTime.toFixed(1)} unit="ns" />
                            <MetricBox label="Fall" value={metrics.fallTime.toFixed(1)} unit="ns" />
                            <MetricBox label="Symmetry" value={metrics.symmetry.toString()} unit="%" accent="#00ff9f" />
                            <MetricBox label="Jitter" value="1.4" unit="ns" accent="#ffd000" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Eye Quality */}
            <section className="flex-shrink-0 glass-panel !rounded-none border-white/5 p-4 flex flex-col gap-3 bg-white/[0.01]">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-outfit font-semibold tracking-wide text-white/90">
                        Eye Quality
                    </h3>
                    <span className={cn(
                        "text-[10px] font-mono uppercase tracking-wider",
                        metrics.eyeWidth > 70 ? "text-[#00ff9f]/90" : metrics.eyeWidth > 50 ? "text-[#ffd000]/90" : "text-[#ff4444]/90"
                    )}>
                        {metrics.eyeWidth > 70 ? 'Stable' : metrics.eyeWidth > 50 ? 'Warn' : 'Fail'}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                    <EyeMetric label="Eye Width" value={metrics.eyeWidth} />
                    <EyeMetric label="Eye Height" value={metrics.eyeHeight} />
                </div>

                <p className="text-[11px] font-outfit text-white/50 leading-snug pt-1">
                    Trace fidelity within expected envelope. See eye diagram panel for persistence view.
                </p>
            </section>
        </div>
    );
};

const MetricBox: React.FC<{ label: string; value: string; unit: string; accent?: string }> = ({ label, value, unit, accent }) => (
    <div className="px-3 py-2.5 bg-[#020617] flex flex-col">
        <span className="text-[10px] font-outfit text-white/40 mb-1">{label}</span>
        <div className="flex items-baseline gap-1">
            <span
                className="text-base font-mono font-light tabular-nums leading-none"
                style={{ color: accent ?? '#e2e8f0' }}
            >
                {value}
            </span>
            <span className="text-[10px] font-mono text-white/30">{unit}</span>
        </div>
    </div>
);

const EyeMetric: React.FC<{ label: string; value: number }> = ({ label, value }) => {
    const color = value > 70 ? '#00ff9f' : value > 50 ? '#ffd000' : '#ff4444';
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-outfit text-white/50">{label}</span>
                <span className="text-sm font-mono font-light tabular-nums" style={{ color }}>{value}%</span>
            </div>
            <div className="h-[3px] w-full bg-white/5 overflow-hidden">
                <motion.div
                    animate={{ width: `${value}%` }}
                    className="h-full"
                    style={{ backgroundColor: color }}
                />
            </div>
        </div>
    );
};
