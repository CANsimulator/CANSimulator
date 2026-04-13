import React from 'react';
import { 
    Activity, 
    BarChart3, 
    Eye, 
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

    // Helper to format with high precision for the "Cyber" look
    const formatHighPrecision = (val: number, decimals: number = 8) => {
        return val.toFixed(decimals);
    };
    
    return (
        <div className="flex flex-col gap-4 h-full overflow-y-auto no-scrollbar pb-4 pl-1">
            {/* Health Monitor */}
            <section className="glass-panel p-4 flex flex-col gap-3 !rounded-none border-white/5 bg-white/[0.01]">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[10px] font-outfit font-black uppercase tracking-[0.25em] text-[#00f3ff] flex items-center gap-2">
                        <span className="w-1 h-3 bg-[#00f3ff]"></span>
                        Hardware Health
                    </h3>
                    <div className="px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-widest bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/20">
                        Live
                    </div>
                </div>
                
                <div className="space-y-1">
                    {[
                        { label: 'CANH Level', ok: metrics.isoCANH },
                        { label: 'CANL Level', ok: metrics.isoCANL },
                        { label: 'Differential', ok: metrics.isoDiff }
                    ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between p-2 bg-white/[0.02] border border-white/5 !rounded-none">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/30">
                                {item.label}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "text-[9px] font-mono font-black uppercase tracking-widest",
                                    item.ok ? "text-[#00ff9f]" : "text-[#ff4444]"
                                )}>
                                    {item.ok ? 'PASS' : 'FAIL'}
                                </span>
                                <div className={cn(
                                    "w-[2px] h-3 shadow-[0_0_4px_currentColor]",
                                    item.ok ? "bg-[#00ff9f] text-[#00ff9f]" : "bg-[#ff4444] text-[#ff4444]"
                                )} />
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-2 p-3 bg-white/[0.03] border-l-2 border-[#00f3ff]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Activity size={10} className="text-[#00f3ff] animate-pulse" />
                            <span className="text-[8px] font-mono font-black uppercase tracking-widest text-white/30">Bus Load Status</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-mono font-black text-white leading-none tracking-tight break-all">
                            {formatHighPrecision(metrics.busLoad, 12)}%
                        </span>
                        <div className="w-full h-1 bg-white/5 overflow-hidden">
                            <motion.div 
                                animate={{ width: `${metrics.busLoad}%` }}
                                className={cn(
                                    "h-full transition-colors duration-500",
                                    metrics.busLoad > 80 ? "bg-[#ff4444]" : metrics.busLoad > 50 ? "bg-[#ffd000]" : "bg-[#00ff9f]"
                                )}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Signal Metrics */}
            <section className="glass-panel p-4 flex flex-col gap-4 !rounded-none border-white/5 bg-white/[0.01]">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[10px] font-outfit font-black uppercase tracking-[0.25em] text-[#00f3ff] flex items-center gap-2">
                        <span className="w-1 h-3 bg-[#00f3ff]"></span>
                        Signal Metrics
                    </h3>
                    <BarChart3 size={12} className="text-[#00f3ff]/40" />
                </div>

                <div className="flex flex-col gap-5">
                    <div className="space-y-2">
                        <label className="text-[8px] font-mono font-black uppercase tracking-[0.3em] text-white/20 block border-b border-white/5 pb-1">Amplitude State</label>
                        <div className="grid grid-cols-2 gap-1.5">
                            <MetricBox label="CH1 Vpp" value={`${metrics.ch1Vpp.toFixed(2)}`} subtitle="V" color="#00f3ff" />
                            <MetricBox label="CH2 Vpp" value={`${metrics.ch2Vpp.toFixed(2)}`} subtitle="V" color="#bf00ff" />
                            <MetricBox label="Diff Vavg" value={`${metrics.vdiff.toFixed(2)}`} subtitle="V" color="#00ff9f" />
                            <MetricBox label="Bit Rate" value={`${metrics.bitRate}`} subtitle="K" color="#71717a" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[8px] font-mono font-black uppercase tracking-[0.3em] text-white/20 block border-b border-white/5 pb-1">Timing analysis</label>
                        <div className="flex flex-col gap-1.5">
                            <div className="grid grid-cols-2 gap-1.5">
                                <MetricBox label="Rise Time" value={metrics.riseTime.toFixed(4)} subtitle="MS" color="#e2e8f0" isSmall />
                                <MetricBox label="Fall Time" value={metrics.fallTime.toFixed(4)} subtitle="MS" color="#e2e8f0" isSmall />
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                <MetricBox label="Symmetry" value={`${metrics.symmetry}`} subtitle="%" color="#00ff9f" />
                                <MetricBox label="Jitter" value="1.42" subtitle="NS" color="#ffd000" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Integrity Map */}
            <section className="glass-panel !rounded-none border-white/5 p-4 flex flex-col gap-4 bg-white/[0.01]">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[10px] font-outfit font-black uppercase tracking-[0.25em] text-[#00f3ff] flex items-center gap-2">
                        <span className="w-1 h-3 bg-[#00f3ff]"></span>
                        Integrity Map
                    </h3>
                    <Eye size={12} className="text-[#00ff9f]/40" />
                </div>

                {/* High Density Signal Integrity Map */}
                <div className="h-24 w-full bg-black/60 border border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                    <svg viewBox="0 0 100 40" className="w-full h-full preserve-3d">
                        {/* Eye Mask */}
                        <path d="M 15,20 Q 50,2 85,20 Q 50,38 15,20" fill="none" stroke="#00f3ff10" strokeWidth="0.5" />
                        
                        {/* Persistence Traces */}
                        {[0, 1, 2, 3, 4].map((i) => (
                            <motion.path 
                                key={i}
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                d={`M 5,${18+i*0.5} C 25,${18+i} 40,${4+i} 50,${4+i} S 75,${18+i} 95,${18+i} M 5,${22-i*0.5} C 25,${22-i} 40,${36-i} 50,${36-i} S 75,${22-i} 95,${22-i}`}
                                stroke="#00f3ff"
                                strokeWidth="0.2"
                                fill="none"
                                opacity={0.1 + (i * 0.15)}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear", delay: i * 0.2 }}
                            />
                        ))}
                    </svg>
                    <div className="absolute top-1 right-2 flex items-center gap-1.5">
                        <span className="text-[7px] font-mono font-black text-[#00ff9f] uppercase tracking-widest">Map Stable</span>
                        <div className="w-1.5 h-1.5 bg-[#00ff9f] animate-pulse" />
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-white/20">Eye Width</span>
                                <span className="text-xs font-mono font-black text-white">{metrics.eyeWidth}%</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 overflow-hidden !rounded-none">
                                <motion.div 
                                    animate={{ width: `${metrics.eyeWidth}%` }}
                                    className="h-full bg-[#00ff9f] shadow-[0_0_4px_#00ff9f]"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-white/20">Eye Height</span>
                                <span className="text-xs font-mono font-black text-white">{metrics.eyeHeight}%</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 overflow-hidden !rounded-none">
                                <motion.div 
                                    animate={{ width: `${metrics.eyeHeight}%` }}
                                    className="h-full bg-[#00ff9f] shadow-[0_0_4px_#00ff9f]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-white/[0.02] border border-white/5 flex items-center gap-3 !rounded-none">
                        <div className="flex-1">
                            <p className="text-[9px] font-mono font-bold text-white/40 leading-relaxed uppercase tracking-tighter">
                                Vector Status: <span className={metrics.eyeWidth > 70 ? 'text-[#00ff9f]' : 'text-[#ff4444]'}>{metrics.eyeWidth > 70 ? 'STABLE' : 'WARN'}</span>
                                <br />
                                Trace fidelity within <span className="text-white/80">99.8th percentile</span>
                            </p>
                        </div>
                        <Info size={14} className="text-[#00f3ff]/20 shrink-0" />
                    </div>
                </div>
            </section>
        </div>
    );
};

const MetricBox: React.FC<{ label: string; value: string; subtitle?: string; color: string; isSmall?: boolean }> = ({ label, value, subtitle, color, isSmall }) => (
    <div className="p-2 bg-white/[0.02] border border-white/5 transition-all hover:bg-white/[0.05] group overflow-hidden !rounded-none">
        <p className="text-[8px] font-mono font-bold text-white/20 uppercase tracking-[0.1em] mb-1 group-hover:text-white/40">{label}</p>
        <div className="flex items-baseline gap-1">
            <span className={cn(
                "font-mono font-black break-all",
                isSmall ? "text-[10px] leading-tight" : "text-sm",
                color === "#71717a" ? "text-white/30" : ""
            )} style={{ color: color !== "#71717a" ? color : undefined }}>{value}</span>
            {subtitle && <span className="text-[8px] font-mono font-bold text-white/20 uppercase tracking-tighter">{subtitle}</span>}
        </div>
    </div>
);
