import React from 'react';
import { 
    Activity, 
    BarChart3, 
    Eye, 
    ShieldCheck, 
    ShieldAlert, 
    Info 
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
    const isError = !metrics.isoCANH || !metrics.isoCANL || !metrics.isoDiff;
    
    return (
        <div className="flex flex-col gap-4 h-full overflow-y-auto no-scrollbar pb-4 pl-1">
            {/* Health Monitor */}
            <section className="glass-panel p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#00f3ff]">System Health</h3>
                    {isError 
                        ? <ShieldAlert size={12} className="text-[#ff4444] animate-pulse" /> 
                        : <ShieldCheck size={12} className="text-[#00ff9f]" />
                    }
                </div>
                
                <div className="space-y-2.5">
                    {[
                        { label: 'CANH Level', ok: metrics.isoCANH },
                        { label: 'CANL Level', ok: metrics.isoCANL },
                        { label: 'Differential', ok: metrics.isoDiff }
                    ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#e2e8f0]/80">
                                {item.label}
                            </span>
                            <span className={cn(
                                "text-[9px] font-mono font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                                item.ok ? "text-[#00ff9f]/80 bg-[#00ff9f]/10" : "text-[#ff4444]/80 bg-[#ff4444]/10"
                            )}>
                                {item.ok ? 'PASS' : 'FAIL'}
                            </span>
                        </div>
                    ))}
                </div>
                
                <div className="mt-2 p-3 rounded bg-[#00f3ff]/5 border border-[#00f3ff]/10">
                    <div className="flex items-center gap-2 mb-1.5">
                        <Activity size={10} className="text-[#00f3ff]" />
                        <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#00f3ff]">Bus Load</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-lg font-mono font-black text-white leading-none">{metrics.busLoad}%</span>
                        <div className="flex-1 h-3 bg-white/5 rounded-sm overflow-hidden mb-0.5">
                            <motion.div 
                                animate={{ width: `${metrics.busLoad}%` }}
                                className={cn(
                                    "h-full transition-colors",
                                    metrics.busLoad > 80 ? "bg-[#ff4444]" : metrics.busLoad > 50 ? "bg-[#ff8800]" : "bg-[#00ff9f]"
                                )}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Signal Metrics */}
            <section className="glass-panel p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#00f3ff]">Signal Analysis</h3>
                    <BarChart3 size={12} className="text-white/20" />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2.5">
                        <label className="text-[8px] font-mono font-black uppercase tracking-[0.25em] text-white/30 ml-1">Amplitude</label>
                        <div className="grid grid-cols-2 gap-2">
                            <MetricBox label="CH1 Vpp" value={`${metrics.ch1Vpp.toFixed(2)}V`} color="#00f3ff" />
                            <MetricBox label="CH2 Vpp" value={`${metrics.ch2Vpp.toFixed(2)}V`} color="#bf00ff" />
                            <MetricBox label="Diff Vavg" value={`${metrics.vdiff.toFixed(2)}V`} color="#00ff9f" />
                            <MetricBox label="Bit Rate" value={`${metrics.bitRate}k`} subtitle="bits/s" color="#e2e8f0" />
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <label className="text-[8px] font-mono font-black uppercase tracking-[0.25em] text-white/30 ml-1">Timing & Edge</label>
                        <div className="grid grid-cols-2 gap-2">
                            <MetricBox label="Rise Time" value={`${metrics.riseTime}`} subtitle="ns" color="#e2e8f0" />
                            <MetricBox label="Fall Time" value={`${metrics.fallTime}`} subtitle="ns" color="#e2e8f0" />
                            <MetricBox label="Symmetry" value={`${metrics.symmetry}%`} color="#00ff9f" />
                            <MetricBox label="Jitter" value="1.4" subtitle="ns" color="#ff8800" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Quality (Eye Diagram Summary) */}
            <section className="glass-panel p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#00f3ff]">Integrity Map</h3>
                    <Eye size={12} className="text-white/20" />
                </div>

                {/* Mini Eye Map Visualization */}
                <div className="h-20 w-full bg-black/40 rounded border border-white/5 relative overflow-hidden group">
                    <svg viewBox="0 0 100 40" className="w-full h-full">
                        {/* Eye Mask (Conceptual) */}
                        <path d="M 20,20 Q 50,5 80,20 Q 50,35 20,20" fill="none" stroke="#00f3ff20" strokeWidth="0.5" />
                        
                        {/* Persistence Traces (Simulated) */}
                        {[0.2, 0.4, 0.6].map((a, i) => (
                            <path 
                                key={i}
                                d={`M 10,${15+i} C 30,${15+i} 40,${5+i} 50,${5+i} S 70,${15+i} 90,${15+i} M 10,${25-i} C 30,${25-i} 40,${35-i} 50,${35-i} S 70,${25-i} 90,${25-i}`}
                                stroke="#00f3ff"
                                strokeWidth="0.5"
                                fill="none"
                                opacity={a}
                                className="transition-all duration-1000"
                            />
                        ))}
                    </svg>
                    <div className="absolute top-1 right-2 text-[7px] font-mono font-black text-[#00ff9f] uppercase">READY</div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-white/40">Eye Width</span>
                            <span className="text-xl font-mono font-black text-white">{metrics.eyeWidth}%</span>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    animate={{ width: `${metrics.eyeWidth}%` }}
                                    className="h-full bg-[#00ff9f]"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-white/40">Eye Height</span>
                            <span className="text-xl font-mono font-black text-white">{metrics.eyeHeight}%</span>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    animate={{ width: `${metrics.eyeHeight}%` }}
                                    className="h-full bg-[#00ff9f]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-3 rounded-lg bg-black/40 border border-white/5 flex items-center gap-3">
                        <div className="flex-1">
                            <p className="text-[9px] font-mono font-bold text-white/60 leading-relaxed uppercase tracking-tighter">
                                Signal integrity is <span className="text-[#00ff9f]">{metrics.eyeWidth > 70 ? 'OPTIMAL' : 'DEGRADED'}</span>. 
                                {metrics.eyeWidth <= 70 && ' Check termination and cable length.'}
                            </p>
                        </div>
                        <Info size={14} className="text-[#00f3ff]/40 shrink-0" />
                    </div>
                </div>
            </section>
        </div>
    );
};

const MetricBox: React.FC<{ label: string; value: string; subtitle?: string; color: string }> = ({ label, value, subtitle, color }) => (
    <div className="p-2 rounded bg-white/5 border border-white/5 transition-all hover:bg-white/10 group">
        <p className="text-[8px] font-mono font-bold text-white/30 uppercase tracking-[0.1em] mb-1 group-hover:text-white/50">{label}</p>
        <div className="flex items-baseline gap-1">
            <span className="text-sm font-mono font-black text-[#e2e8f0]" style={{ color }}>{value}</span>
            {subtitle && <span className="text-[8px] font-mono font-bold text-white/20 uppercase tracking-tighter">{subtitle}</span>}
        </div>
    </div>
);
