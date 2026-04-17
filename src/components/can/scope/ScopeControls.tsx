import React from 'react';
import { 
    Zap, 
    Clock,
    Target,
    Settings2,
    Play,
    Pause,
    SkipForward,
    RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface ChannelCfg { 
    enabled: boolean; 
    vdiv: number; 
    offset: number; 
    coupling: 'AC' | 'DC';
    bwLimit: boolean;
}

interface ScopeControlsProps {
    ch1: ChannelCfg;
    ch2: ChannelCfg;
    tdiv: number;
    runMode: 'run' | 'stop' | 'single';
    triggerMode: 'auto' | 'SOF' | 'error' | 'ID';
    triggerLevel: number;
    activeCh: 'ch1' | 'ch2';
    onUpdateCh: (ch: 'ch1' | 'ch2', vals: Partial<ChannelCfg>) => void;
    onUpdateTDiv: (tdiv: number) => void;
    onUpdateRunMode: (mode: 'run' | 'stop' | 'single') => void;
    onUpdateTrigger: (mode: 'auto' | 'SOF' | 'error' | 'ID', level: number) => void;
    onReset: () => void;
}

const VDIV_OPTIONS = [0.2, 0.5, 1, 2, 5];
const TDIV_OPTIONS = [5, 10, 20, 50, 100, 200, 500];

export const ScopeControls: React.FC<ScopeControlsProps> = ({
    ch1,
    ch2,
    tdiv,
    runMode,
    triggerMode,
    triggerLevel,
    activeCh,
    onUpdateCh,
    onUpdateTDiv,
    onUpdateRunMode,
    onUpdateTrigger,
    onReset
}) => {
    return (
        <div className="flex flex-col gap-4 pb-4 pr-1">
            {/* Acquire Section */}
            <section className="flex-shrink-0 glass-panel !rounded-none p-4 flex flex-col gap-3 border-white/5 bg-white/[0.01]">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-outfit font-semibold tracking-wide text-white/90">
                        Acquisition
                    </h3>
                    <motion.div
                        animate={{ opacity: runMode === 'run' ? [0.3, 1, 0.3] : 0.3 }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="flex items-center gap-1.5"
                    >
                        <div className={cn("w-1.5 h-1.5 rounded-full", runMode === 'run' ? "bg-[#00ff9f]" : "bg-white/30")} />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                            {runMode === 'run' ? 'Live' : runMode === 'stop' ? 'Paused' : 'Armed'}
                        </span>
                    </motion.div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => onUpdateRunMode('run')}
                        className={cn(
                            "flex items-center justify-center gap-2 py-2 border transition-all font-mono text-[10px] font-black uppercase tracking-widest !rounded-none",
                            runMode === 'run' 
                                ? "bg-[#00ff9f]/20 border-[#00ff9f] text-[#00ff9f] shadow-[0_0_8px_rgba(0,255,159,0.2)]" 
                                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20"
                        )}
                    >
                        <Play size={10} fill={runMode === 'run' ? "currentColor" : "none"} />
                        Run
                    </button>
                    <button 
                        onClick={() => onUpdateRunMode('stop')}
                        className={cn(
                            "flex items-center justify-center gap-2 py-2 border transition-all font-mono text-[10px] font-black uppercase tracking-widest !rounded-none",
                            runMode === 'stop' 
                                ? "bg-[#ff4444]/20 border-[#ff4444] text-[#ff4444] shadow-[0_0_8px_rgba(255,68,68,0.2)]" 
                                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20"
                        )}
                    >
                        <Pause size={10} fill={runMode === 'stop' ? "currentColor" : "none"} />
                        Stop
                    </button>
                </div>
                <button 
                    onClick={() => onUpdateRunMode('single')}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 py-2 border transition-all font-mono text-[10px] font-black uppercase tracking-widest !rounded-none",
                        runMode === 'single' 
                            ? "bg-[#bf00ff]/20 border-[#bf00ff] text-[#bf00ff] shadow-[0_0_8px_rgba(191,0,255,0.2)]" 
                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20"
                    )}
                >
                    <SkipForward size={10} />
                    Single Capture
                </button>
            </section>

            {/* Channel Settings */}
            <section className="flex-shrink-0 glass-panel p-4 flex flex-col gap-4 !rounded-none border-white/5 bg-white/[0.01]">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-outfit font-semibold tracking-wide text-white/90">
                        Channels
                    </h3>
                    <Settings2 size={12} className="text-white/30" />
                </div>
                
                {[
                    { id: 'ch1' as const, cfg: ch1, color: '#00f3ff', label: 'CH1 (CANH)' },
                    { id: 'ch2' as const, cfg: ch2, color: '#bf00ff', label: 'CH2 (CANL)' }
                ].map((channel) => (
                    <div key={channel.id} className={cn(
                        "p-3 border transition-all !rounded-none",
                        activeCh === channel.id ? "bg-white/[0.04] border-white/10" : "bg-transparent border-transparent opacity-60"
                    )}>
                        <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={channel.cfg.enabled}
                                    onChange={(e) => onUpdateCh(channel.id, { enabled: e.target.checked })}
                                />
                                <div className={cn(
                                    "w-4 h-4 border flex items-center justify-center transition-all !rounded-none",
                                    channel.cfg.enabled ? "bg-current border-transparent shadow-[0_0_8px_currentColor]" : "bg-transparent border-white/20"
                                )} style={{ color: channel.color }}>
                                    {channel.cfg.enabled && <Zap size={10} className="text-[#020617]" />}
                                </div>
                                <span className={cn(
                                    "text-[10px] font-mono font-black uppercase tracking-widest transition-colors",
                                    channel.cfg.enabled ? "text-white" : "text-white/20"
                                )}>
                                    {channel.label}
                                </span>
                            </label>
                        </div>

                        <div className="flex flex-col gap-3 ml-7">
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] font-outfit text-white/50">Vertical scale</span>
                                    <span className="text-[11px] font-mono tabular-nums" style={{ color: channel.color }}>{channel.cfg.vdiv} V/div</span>
                                </div>
                                <div className="flex gap-1">
                                    {VDIV_OPTIONS.map(v => (
                                        <button
                                            key={v}
                                            onClick={() => onUpdateCh(channel.id, { vdiv: v })}
                                            className={cn(
                                                "flex-1 h-5 border text-[9px] font-mono font-black transition-all !rounded-none",
                                                channel.cfg.vdiv === v 
                                                    ? "bg-current border-transparent text-[#020617]" 
                                                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                            )}
                                            style={channel.cfg.vdiv === v ? { backgroundColor: channel.color } : {}}
                                        >
                                            {v < 1 ? `.${(v * 10).toFixed(0)}` : v}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] font-outfit text-white/50">Offset</span>
                                    <span className="text-[11px] font-mono tabular-nums text-white/70">{(channel.cfg.offset >= 0 ? '+' : '') + channel.cfg.offset.toFixed(2)} V</span>
                                </div>
                                <input 
                                    type="range"
                                    min="-4"
                                    max="4"
                                    step="0.1"
                                    value={channel.cfg.offset}
                                    onChange={(e) => onUpdateCh(channel.id, { offset: parseFloat(e.target.value) })}
                                    className="w-full h-1 bg-white/[0.05] appearance-none cursor-pointer accent-[#e2e8f0] border-0"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </section>

            {/* Time & Trigger */}
            <section className="flex-shrink-0 glass-panel p-4 flex flex-col gap-4 !rounded-none border-white/5 bg-white/[0.01]">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-outfit font-semibold tracking-wide text-white/90">
                        Time &amp; Trigger
                    </h3>
                    <Clock size={12} className="text-white/30" />
                </div>

                <div className="space-y-4 px-1">
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-baseline">
                            <span className="text-[11px] font-outfit text-white/50">Horizontal scale</span>
                            <span className="text-[11px] font-mono tabular-nums text-[#00f3ff]">{tdiv} µs/div</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                            {TDIV_OPTIONS.map(t => (
                                <button
                                    key={t}
                                    onClick={() => onUpdateTDiv(t)}
                                    className={cn(
                                        "h-5 border text-[9px] font-mono font-black transition-all !rounded-none",
                                        tdiv === t 
                                            ? "bg-[#00f3ff] border-transparent text-[#020617] shadow-[0_0_8px_rgba(0,243,255,0.2)]" 
                                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-4 space-y-4">
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[11px] font-outfit text-white/50">Trigger source</span>
                                <span className="text-[11px] font-mono uppercase tabular-nums text-[#00ff9f]">{triggerMode}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                {(['auto', 'SOF', 'error', 'ID'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => onUpdateTrigger(mode, triggerLevel)}
                                        className={cn(
                                            "h-5 border text-[9px] font-mono font-black transition-all uppercase !rounded-none",
                                            triggerMode === mode 
                                                ? "bg-[#00ff9f] border-transparent text-[#020617] shadow-[0_0_8px_rgba(0,255,159,0.2)]" 
                                                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                        )}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[11px] font-outfit text-white/50">Level threshold</span>
                                <span className="text-[11px] font-mono tabular-nums text-white/70">{triggerLevel.toFixed(2)} V</span>
                            </div>
                            <input 
                                type="range"
                                min="0"
                                max="5"
                                step="0.1"
                                value={triggerLevel}
                                onChange={(e) => onUpdateTrigger(triggerMode, parseFloat(e.target.value))}
                                className="w-full h-1 bg-white/[0.05] appearance-none cursor-pointer accent-[#00ff9f] border-0"
                            />
                        </div>

                        <div className="pt-2">
                            <button 
                                onClick={onReset}
                                className="w-full h-9 flex items-center justify-center gap-2 bg-transparent border border-white/10 text-white/40 hover:text-[#00f3ff] hover:bg-white/5 transition-all font-mono text-[9px] font-black uppercase tracking-[0.2em] !rounded-none"
                            >
                                <Target size={12} />
                                Zero-Point Calibrate
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <button 
                onClick={onReset}
                className="flex-shrink-0 w-full flex items-center justify-center gap-2 py-3 border border-white/10 bg-white/5 text-white/40 hover:text-[#ff4444] hover:bg-[#ff4444]/5 transition-all font-mono text-[10px] font-black uppercase tracking-widest mt-auto !rounded-none"
            >
                <RefreshCw size={12} />
                Master Reset
            </button>
        </div>
    );
};
