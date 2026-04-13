import React, { useState, useRef, useEffect, useCallback } from 'react';
// import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

// Project Services & Utils
import { 
    ISO, 
    generateSample, 
    createInitialWaveState
} from '../../services/can/waveform-generator';
import type { Sample, WaveState } from '../../types/can';
import { 
    calculateVDiff 
} from '../../utils/scope-math';
// import { useTestBench } from '../../context/TestBenchContext';

// Sub-components
import { ScopeControls } from './scope/ScopeControls';
import { WaveformViewer } from './scope/WaveformViewer';
import { ScopeMetrics } from './scope/ScopeMetrics';
import { ProtocolDecoder } from './scope/ProtocolDecoder';

// Icons
import { 
    Cpu, 
    Activity, 
    Maximize2,
    Database,
    Binary,
    ShieldCheck,
    FileJson
} from 'lucide-react';

interface ChannelCfg { 
    enabled: boolean; 
    vdiv: number; 
    offset: number; 
    coupling: 'AC' | 'DC';
    bwLimit: boolean;
    color: string;
}

interface ScopeParams {
    activeCh: 'ch1' | 'ch2';
    ch1: ChannelCfg;
    ch2: ChannelCfg;
    math: boolean;
    tdiv: number;
    triggerMode: 'auto' | 'SOF' | 'error' | 'ID';
    triggerLevel: number;
    runMode: 'run' | 'stop' | 'single';
    cursorMode: 'off' | 'time';
    cursorA: number;
    cursorB: number;
    persistence: number;
}

const getInitialScopeParams = (): ScopeParams => ({
    activeCh: 'ch1',
    ch1: { enabled: true, vdiv: 1, offset: 0, coupling: 'DC', bwLimit: false, color: '#00f3ff' },
    ch2: { enabled: true, vdiv: 1, offset: 0, coupling: 'DC', bwLimit: false, color: '#bd00ff' },
    math: true,
    tdiv: 20,
    triggerMode: 'auto',
    triggerLevel: 2.5,
    runMode: 'run',
    cursorMode: 'off',
    cursorA: 0.25,
    cursorB: 0.75,
    persistence: 0,
});

export const VoltageScope: React.FC = () => {
    // const bench = useTestBench();
    const [scope, setScope] = useState<ScopeParams>(getInitialScopeParams());
    const [metrics, setMetrics] = useState<any>({
        ch1Vpp: 0, ch1Avg: 0, ch1Min: 0, ch1Max: 0,
        ch2Vpp: 0, ch2Avg: 0, ch2Min: 0, ch2Max: 0,
        vdiff: 0, riseTime: 0, fallTime: 0,
        symmetry: 0, busLoad: 0, bitRate: 0,
        eyeWidth: 0, eyeHeight: 0,
        isoCANH: true, isoCANL: true, isoDiff: true
    });
    
    const [view, setView] = useState({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 });
    const [samples, setSamples] = useState<Sample[]>([]);
    const [decodedFrames, setDecodedFrames] = useState<any[]>([]);
    const [showDiff, setShowDiff] = useState(true);
    const [showEye, setShowEye] = useState(true);
    
    const samplesRef = useRef<Sample[]>([]);
    const waveStateRef = useRef<WaveState>(createInitialWaveState());
    const lastTick = useRef(0);
    const animRef = useRef(0);

    const handleExportCSV = useCallback(() => {
        const header = "Timestamp (us),CANH (V),CANL (V),VDiff (V),BitIndex\n";
        const rows = samples.map((s, i) => 
            `${(i * 2).toFixed(1)},${s.canh.toFixed(3)},${s.canl.toFixed(3)},${(s.canh - s.canl).toFixed(3)},${s.bitIndex}`
        ).join("\n");
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `uds_scope_export_${Date.now()}.csv`;
        a.click();
    }, [samples]);

    // ── Generate Samples ──
    const tick = useCallback((time: number) => {
        if (scope.runMode === 'stop') return;
        
        const interval = scope.tdiv / 4;
        if (time - lastTick.current > interval) {
            const prev = samplesRef.current.length > 0 ? samplesRef.current[samplesRef.current.length - 1] : null;
            const newSample = generateSample(prev, waveStateRef.current, scope.ch1, scope.ch2);
            
            samplesRef.current.push(newSample);
            if (samplesRef.current.length > 200) {
                samplesRef.current = samplesRef.current.slice(-200);
            }
            
            // Frame detection for decoder
            if (newSample.bitIndex === 0 && (prev?.bitIndex ?? -1) !== 0) {
                const newFrame = {
                    id: Math.floor(Math.random() * 0x7FF),
                    timestamp: time / 1000,
                    dlc: 8,
                    data: Array.from({ length: 8 }, () => Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0')).join(' '),
                    crc: Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0'),
                    status: 'ok',
                    type: 'STD'
                };
                setDecodedFrames(prev => [newFrame, ...prev].slice(0, 50));
            }

            setSamples([...samplesRef.current]);
            lastTick.current = time;
        }
        animRef.current = requestAnimationFrame(tick);
    }, [scope.runMode, scope.tdiv, scope.ch1, scope.ch2]);

    useEffect(() => {
        animRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animRef.current);
    }, [tick]);

    // ── Metrics Computation ──
    useEffect(() => {
        const interval = setInterval(() => {
            if (samplesRef.current.length < 10) return;
            const s = samplesRef.current;
            const canh = s.map(x => x.canh);
            const canl = s.map(x => x.canl);
            
            const maxH = Math.max(...canh);
            const minH = Math.min(...canh);
            const maxL = Math.max(...canl);
            const minL = Math.min(...canl);
            
            setMetrics({
                ch1Vpp: maxH - minH,
                ch1Avg: canh.reduce((a, b) => a + b, 0) / canh.length,
                ch1Min: minH,
                ch1Max: maxH,
                ch2Vpp: maxL - minL,
                ch2Avg: canl.reduce((a, b) => a + b, 0) / canl.length,
                ch2Min: minL,
                ch2Max: maxL,
                vdiff: calculateVDiff(maxH, minL, scope.ch1.enabled, scope.ch2.enabled),
                riseTime: 45 + Math.random() * 10,
                fallTime: 42 + Math.random() * 10,
                symmetry: 98,
                busLoad: 32 + Math.random() * 5,
                bitRate: 500,
                eyeWidth: 88,
                eyeHeight: 92,
                isoCANH: maxH <= ISO.CANH_DOM_MAX && minH >= ISO.V_REC - 0.5,
                isoCANL: minL >= ISO.CANL_DOM_MIN && maxL <= ISO.V_REC + 0.5,
                isoDiff: true
            });
        }, 500);
        return () => clearInterval(interval);
    }, [scope.ch1.enabled, scope.ch2.enabled]);

    return (
        <div className="flex flex-col gap-6 w-full animate-fade-in">
            {/* Main Scope UI */}
            <div className="grid grid-cols-[300px_1fr_320px] gap-6 h-[720px]">
                {/* Left: Controls */}
                <aside className="h-full overflow-hidden">
                    <ScopeControls 
                        {...scope}
                        onUpdateCh={(ch, vals) => setScope(p => ({ ...p, [ch]: { ...p[ch], ...vals }, activeCh: ch }))}
                        onUpdateTDiv={(tdiv) => setScope(p => ({ ...p, tdiv }))}
                        onUpdateRunMode={(runMode) => setScope(p => ({ ...p, runMode }))}
                        onUpdateTrigger={(triggerMode, triggerLevel) => setScope(p => ({ ...p, triggerMode, triggerLevel }))}
                        onReset={() => {
                            setScope(getInitialScopeParams());
                            setDecodedFrames([]);
                            samplesRef.current = [];
                        }}
                    />
                </aside>

                {/* Center: Main Visualizer */}
                <main className="flex flex-col gap-6 h-full min-w-0">
                    <div className="flex-1 min-h-0">
                        <WaveformViewer 
                            samples={samples}
                            view={view}
                            ch1={scope.ch1}
                            ch2={scope.ch2}
                            tdiv={scope.tdiv}
                            cursorMode={scope.cursorMode}
                            cursorA={scope.cursorA}
                            cursorB={scope.cursorB}
                            showDiff={showDiff}
                            showEye={showEye}
                            onUpdateView={setView}
                            onUpdateCursors={(a, b) => setScope(p => ({ ...p, cursorA: a, cursorB: b }))}
                            onExportPNG={() => {}}
                            onResetView={() => setView({ zoomX: 1, zoomY: 1, panX: 0, panY: 0 })}
                        />
                    </div>
                    
                    {/* Integrated Quick Action Bar */}
                    <div className="glass-panel p-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setShowDiff(!showDiff)}
                                className={cn(
                                    "px-3 py-1.5 rounded text-[10px] font-mono font-black uppercase transition-all",
                                    showDiff ? "bg-[#00ff9f]/10 text-[#00ff9f] border border-[#00ff9f]/20" : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
                                )}
                            >
                                DIFF MATH
                            </button>
                            <button 
                                onClick={() => setShowEye(!showEye)}
                                className={cn(
                                    "px-3 py-1.5 rounded text-[10px] font-mono font-black uppercase transition-all",
                                    showEye ? "bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/20" : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
                                )}
                            >
                                EYE
                            </button>
                            <div className="w-px h-4 bg-white/10 mx-2" />
                            <button className="p-2 rounded hover:bg-white/5 text-white/40 hover:text-[#00f3ff] transition-all" title="Fast Fourier Transform">
                                <Binary size={16} />
                            </button>
                            <button 
                                onClick={handleExportCSV}
                                className="p-2 rounded hover:bg-white/5 text-white/40 hover:text-[#00f3ff] transition-all" title="Export CSV Data"
                            >
                                <FileJson size={16} />
                            </button>
                            <button 
                                onClick={() => setScope(p => ({ ...p, cursorMode: p.cursorMode === 'off' ? 'time' : 'off' }))}
                                className={cn(
                                    "p-2 rounded transition-all",
                                    scope.cursorMode === 'time' ? "bg-[#00f3ff]/10 text-[#00f3ff]" : "text-white/40 hover:text-[#00f3ff] hover:bg-white/5"
                                )} 
                                title="Toggle Cursors"
                            >
                                <Maximize2 size={16} className="rotate-45" />
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-4 pr-3">
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] font-mono font-black text-white/30 uppercase tracking-[0.2em] leading-none mb-1">Bus Status</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-black text-[#00ff9f]">ACTIVE-ERROR</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#00ff9f] shadow-[0_0_4px_#00ff9f]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Right: Metrics & Health */}
                <aside className="h-full overflow-hidden">
                    <ScopeMetrics metrics={metrics} />
                </aside>
            </div>

            {/* Bottom: Decoder Table */}
            <div className="w-full">
                <ProtocolDecoder 
                    frames={decodedFrames}
                    onRowClick={(_id) => {}}
                />
            </div>

            {/* Design System Reference (Issue #255) */}
            <div className="mt-4 flex flex-wrap gap-4 px-2 opacity-20 hover:opacity-100 transition-opacity">
                {[
                    { label: 'Voltage Precision', value: '12-bit ADC', icon: <Cpu size={12} /> },
                    { label: 'Sampling Rate', value: '500 MS/s', icon: <Activity size={12} /> },
                    { label: 'Memory Depth', value: '256 kpts', icon: <Database size={12} /> },
                    { label: 'Isolation', value: '2.5 kV RMS', icon: <ShieldCheck size={12} /> }
                ].map((stat) => (
                    <div key={stat.label} className="flex items-center gap-2">
                        <span className="text-white">{stat.icon}</span>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/60">{stat.label}:</span>
                        <span className="text-[9px] font-mono font-black text-[#00f3ff]">{stat.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
