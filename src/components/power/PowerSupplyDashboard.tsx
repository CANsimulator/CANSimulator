import React, { useEffect, useRef, useState } from 'react';
import { 
    Zap, 
    Activity, 
    Settings2, 
    Thermometer,
    RefreshCcw,
    AlertCircle,
    AlertTriangle,
    Info,
    History,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { usePower } from '../../context/PowerContext';
import { useMomentaryAction } from '../../hooks/useMomentaryAction';
import { BorderBeam } from '../ui/BorderBeam';
import { Tooltip } from '../ui/Tooltip';
import { cn } from '../../utils/cn';

export const PowerSupplyDashboard: React.FC = () => {
    const {
        voltage,
        current,
        powerState,
        targetVoltage,
        currentLimit,
        currentLoad,
        systemVoltage,
        faultState,
        setTargetVoltage,
        setCurrentLimit,
        setCurrentLoad,
        setPowerState,
        setSystemVoltage,
        setFaultState,
        resetToDefaults,
        simulateCranking,
        rpsCountdown,
    } = usePower();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [vHistory, setVHistory] = useState<number[]>(new Array(100).fill(voltage));
    const [iHistory, setIHistory] = useState<number[]>(new Array(100).fill(current));
    const [liveText, setLiveText] = useState('');
    const [isCoarsePointer, setIsCoarsePointer] = useState(false);
    
    // Telemetry & Output State (Issues 258, 259, 260)
    const [voltageMinMax, setVoltageMinMax] = useState({ min: voltage, max: voltage });
    const [currentMinMax, setCurrentMinMax] = useState({ min: current, max: current });
    const [outputEnabled, setOutputEnabled] = useState(true);
    const [events, setEvents] = useState<{ id: string; time: string; type: string; voltage: number; current: number }[]>([]);
    const [showEvents, setShowEvents] = useState(false);
    
    // Effective values based on output state
    const displayVoltage = outputEnabled ? voltage : 0;
    const displayCurrent = outputEnabled ? current : 0;

    useEffect(() => {
        setIsCoarsePointer(window.matchMedia('(pointer: coarse)').matches);
    }, []);

    // Min/Max tracking logic (Issue 258)
    useEffect(() => {
        if (powerState !== 'OFF' && outputEnabled) {
            setVoltageMinMax(prev => ({
                min: Math.min(prev.min, voltage),
                max: Math.max(prev.max, voltage)
            }));
            setCurrentMinMax(prev => ({
                min: Math.min(prev.min, current),
                max: Math.max(prev.max, current)
            }));
        }
    }, [voltage, current, powerState, outputEnabled]);

    // WCAG AAA: Live Region Status Updates (Issue 255)
    useEffect(() => {
        const updateInterval = setInterval(() => {
            const faultInfo = faultState !== 'NONE' 
                ? `${faultState.replace('_', ' ')} fault active.` 
                : 'System nominal.';
            const powerStateText = outputEnabled ? powerState : 'OUTPUT OFF';
            const powerInfo = powerState === 'OFF' ? 'Power OFF.' : `Power ${powerStateText}, outputting ${displayVoltage.toFixed(1)}V.`;
            setLiveText(`PSU Status: ${powerInfo} ${faultInfo}`);
        }, 2000);
        return () => clearInterval(updateInterval);
    }, [displayVoltage, faultState, powerState, outputEnabled]);

    // Event Logging logic (Issue 259)
    const isCC = current >= currentLimit && powerState !== 'OFF';
    const isOVP = voltage > (systemVoltage === 12 ? 16 : 30);

    const logEvent = (type: string) => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setEvents(prev => [{ id: Math.random().toString(36).substr(2, 9), time: timestamp, type, voltage, current }, ...prev].slice(0, 50));
    };

    const prevOVP = useRef(isOVP);
    const prevCC = useRef(isCC);

    useEffect(() => {
        if (isOVP && !prevOVP.current) logEvent('OVP');
        prevOVP.current = isOVP;
    }, [isOVP]);

    useEffect(() => {
        if (isCC && !prevCC.current) logEvent('OCP');
        prevCC.current = isCC;
    }, [isCC]);

    const shortGndAction = useMomentaryAction({
        isActive: faultState === 'SHORT_GND',
        onStart: () => setFaultState('SHORT_GND'),
        onEnd: () => setFaultState('NONE'),
    });
    const openCircuitAction = useMomentaryAction({
        isActive: faultState === 'OPEN_CIRCUIT',
        onStart: () => setFaultState('OPEN_CIRCUIT'),
        onEnd: () => setFaultState('NONE'),
    });

    // Update waveform history
    useEffect(() => {
        setVHistory(prev => [...prev.slice(1), displayVoltage]);
    }, [displayVoltage]);

    useEffect(() => {
        setIHistory(prev => [...prev.slice(1), displayCurrent]);
    }, [displayCurrent]);

    // Draw waveform with enhanced technical grid
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const width = rect.width;
        const height = rect.height;

        // Dark Obsidian Base
        ctx.fillStyle = '#080a0f';
        ctx.fillRect(0, 0, width, height);
        
        // Scanlines effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let y = 0; y < height; y += 2) {
            ctx.fillRect(0, y, width, 1);
        }

        // Technical Grid
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let x = 0; x < width; x += width / 10) {
            ctx.moveTo(x, 0); ctx.lineTo(x, height);
        }
        for (let y = 0; y < height; y += height / 8) {
            ctx.moveTo(0, y); ctx.lineTo(width, y);
        }
        ctx.stroke();

        // ─── Draw Voltage Trace (Cyan) ───
        const maxV = systemVoltage === 12 ? 18 : 36;
        const scaleV = height / maxV;
        
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#00f3ff';
        ctx.beginPath();
        vHistory.forEach((v, i) => {
            const x = (i / (vHistory.length - 1)) * width;
            const y = height - (v * scaleV);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Voltage Area Fill
        const vGradient = ctx.createLinearGradient(0, 0, 0, height);
        vGradient.addColorStop(0, 'rgba(0, 243, 255, 0.1)');
        vGradient.addColorStop(1, 'rgba(0, 243, 255, 0)');
        ctx.shadowBlur = 0;
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.fillStyle = vGradient;
        ctx.fill();

        // ─── Draw Current Trace (Purple) ───
        const maxI = 12.0; // Proportional to max limit
        const scaleI = height / maxI;
        
        ctx.strokeStyle = '#bd00ff';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#bd00ff';
        ctx.beginPath();
        iHistory.forEach((iVal, i) => {
            const x = (i / (iHistory.length - 1)) * width;
            const y = height - (iVal * scaleI);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Current Area Fill
        const iGradient = ctx.createLinearGradient(0, 0, 0, height);
        iGradient.addColorStop(0, 'rgba(189, 0, 255, 0.1)');
        iGradient.addColorStop(1, 'rgba(189, 0, 255, 0)');
        ctx.shadowBlur = 0;
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.fillStyle = iGradient;
        ctx.fill();

    }, [vHistory, iHistory, systemVoltage]);

    const vpp = Math.max(...vHistory) - Math.min(...vHistory);
    const stability = Math.max(98.5, 100 - (vpp * 2) - (current > 4 ? 0.5 : 0)).toFixed(1);
    const powerW = displayVoltage * displayCurrent;

    return (
        <div className="relative group">
            {/* Main Instrument Container */}
            <div className="bg-slate-50 dark:bg-[#0f131f] border-slate-200 dark:border-[#262a37] rounded-xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-cyan-500/5">
                <BorderBeam size={400} duration={12} className="opacity-10 group-hover:opacity-25" colorFrom="#00f3ff" colorTo="#bd00ff" />
                
                {/* ─── Top Chassis Header ─── */}
                <div className="bg-slate-100 dark:bg-[#1b1f2c] px-6 py-3 border-b border-slate-200 dark:border-[#262a37] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                powerState !== 'OFF' ? "bg-cyan-500 shadow-[0_0_10px_#06b6d4] animate-pulse" : "bg-gray-800"
                            )} />
                            <span className="text-[10px] font-black text-slate-900 dark:text-[#f1f1f1] uppercase tracking-[0.2em] font-mono">
                                PPS-3005 Cyber-Unit
                            </span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest leading-none">
                            Firmware Ver. 4.8.2 // SRC: PSU_CONTROLLER
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* System Voltage Mode Toggles */}
                        <div className="flex bg-black/40 p-1 rounded-md border border-white/5 gap-1">
                            {[12, 24].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setSystemVoltage(v as any)}
                                    className={cn(
                                        "px-3 py-1 rounded text-[9px] font-black transition-all font-mono",
                                        systemVoltage === v
                                            ? "bg-cyan-500 text-black shadow-glow-sm"
                                            : "text-gray-500 hover:text-gray-300"
                                    )}
                                >
                                    {v}V
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setOutputEnabled(v => !v)}
                            aria-pressed={outputEnabled}
                            aria-label={outputEnabled ? 'Disable output' : 'Enable output'}
                            className={cn(
                                "px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest font-mono transition-all border",
                                outputEnabled
                                  ? "bg-cyber-blue/10 text-cyber-blue border-cyber-blue/30 hover:bg-cyber-blue/20"
                                  : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                            )}
                        >
                            {outputEnabled ? 'Output ON' : 'Output OFF'}
                        </button>
                        <Settings2 className="w-3.5 h-3.5 text-gray-600 hover:text-cyan-400 cursor-pointer transition-colors" />
                    </div>
                </div>

                {/* ─── Main Content Grid ─── */}
                <div className="grid grid-cols-12 gap-px bg-slate-200 dark:bg-[#262a37]">
                    
                    {/* LEFT: MONITORING CORE */}
                    <div className="col-span-12 lg:col-span-4 bg-white dark:bg-[#0f131f] p-8 space-y-8">
                        <MonitorDisplay 
                            label="OUTPUT VOLTAGE" 
                            value={displayVoltage.toFixed(2)} 
                            unit="V" 
                            color={faultState !== 'NONE' ? "text-red-500" : "text-cyan-400"} 
                            subValue={targetVoltage.toFixed(1) + " V SET"}
                            minMax={voltageMinMax}
                            onResetMinMax={() => setVoltageMinMax({ min: voltage, max: voltage })}
                        />
                        <MonitorDisplay 
                            label="CURRENT CONSUMPTION" 
                            value={displayCurrent.toFixed(3)} 
                            unit="A" 
                            color="text-[#bd00ff]" 
                            subValue={currentLimit.toFixed(1) + " A LIM"}
                            customColor="#bd00ff"
                            minMax={currentMinMax}
                            onResetMinMax={() => setCurrentMinMax({ min: current, max: current })}
                        />
                        
                        {/* PSU Fault Indicators (Issue 251) */}
                        <div className="pt-2 space-y-3">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono">Hardware Fault Integrity</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <FaultIndicator 
                                    label="Open Circ" 
                                    active={faultState === 'OPEN_CIRCUIT'} 
                                    icon={<Info size={10} />}
                                    tooltip="Output circuit is physically disconnected or broken"
                                />
                                <FaultIndicator 
                                    label="Short GND" 
                                    active={faultState === 'SHORT_GND'} 
                                    icon={<AlertCircle size={10} />}
                                    tooltip="Output clamped to ground (0V) — high current potential"
                                />
                                <FaultIndicator 
                                    label="Rev Pol" 
                                    active={faultState === 'REVERSE_POLARITY'} 
                                    icon={<AlertTriangle size={10} />}
                                    tooltip="Input polarity reversed — protection active"
                                />
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Power</p>
                                <p className="text-sm font-mono font-black text-[#f1f1f1] transition-colors">{powerW.toFixed(1)}W</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Thermals</p>
                                <div className="flex items-center gap-1.5">
                                    <Thermometer className="w-3 h-3 text-amber-500" />
                                    <p className="text-sm font-mono font-black text-[#f1f1f1] transition-colors">42.5°C</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MIDDLE: SIGNAL ANALYSIS */}
                    <div className="col-span-12 lg:col-span-5 bg-white dark:bg-[#0f131f] p-px border-l border-r border-slate-200 dark:border-white/5">
                        <div className="h-full flex flex-col p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Activity className="w-4 h-4 text-cyan-500" />
                                    <span className="text-[10px] font-black text-[#f1f1f1] uppercase tracking-[0.15em] font-mono">V-OUT Realtime Trace</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setShowEvents(!showEvents)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 rounded border text-[8px] font-black font-mono transition-all",
                                            showEvents ? "bg-cyan-500 text-black border-cyan-400" : "bg-black/20 text-gray-500 border-white/5 hover:border-white/10"
                                        )}
                                    >
                                        <History size={10} />
                                        EVENTS
                                        {showEvents ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                    </button>
                                    <MetricBadge label="STABILITY" value={stability + "%"} color="#00f3ff" />
                                    <MetricBadge label="RIPPLE" value={(vpp * 1000).toFixed(1) + "mV"} color="#bd00ff" />
                                </div>
                            </div>

                            {showEvents && (
                                <div className="bg-black/40 rounded border border-white/5 p-3 space-y-2 animate-fade-in max-h-[120px] overflow-y-auto no-scrollbar">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest font-mono">System Event Log</span>
                                        <button onClick={() => setEvents([])} className="text-[8px] text-gray-600 hover:text-gray-400 font-mono uppercase">Clear</button>
                                    </div>
                                    {events.length === 0 ? (
                                        <p className="text-[9px] font-mono text-gray-700 italic">No events recorded</p>
                                    ) : (
                                        events.map(e => (
                                            <div key={e.id} className="flex gap-2 text-[9px] font-mono text-gray-400 border-l border-white/5 pl-2 py-0.5">
                                                <span className="text-gray-600">{e.time}</span>
                                                <span className={cn("font-bold", e.type === 'OVP' ? 'text-red-400' : 'text-amber-400')}>{e.type}</span>
                                                <span>{e.voltage.toFixed(2)}V / {e.current.toFixed(2)}A</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            <div className="flex-1 min-h-[220px] bg-black/40 rounded-lg border border-white/5 relative group/scope">
                                <canvas ref={canvasRef} className="w-full h-full rounded-lg" />
                                
                                {/* Status Badges with Tooltips (Issue 252, 256) */}
                                <div className="absolute top-2 right-2 flex flex-wrap gap-1.5 max-w-[160px] justify-end">
                                    <Tooltip content="Constant Voltage — regulated output">
                                        <StatusBadge label="CV" active={!isCC && powerState !== 'OFF'} color="bg-cyan-500" />
                                    </Tooltip>
                                    <Tooltip content="Constant Current — output current is being limited">
                                        <StatusBadge label="CC" active={isCC} color="bg-red-500" />
                                    </Tooltip>
                                    <Tooltip content="Over-Voltage Protection active">
                                        <StatusBadge label="OVP" active={isOVP} color="bg-amber-500" />
                                    </Tooltip>
                                    <Tooltip content="Rapid Power Shutdown enabled">
                                        <StatusBadge label="RPS" active={rpsCountdown !== null} color="bg-magenta-500" />
                                    </Tooltip>
                                </div>
                                
                                {/* Screen Reader Announcements (Issue 255) */}
                                <p className="sr-only" aria-live="polite" aria-atomic="true">
                                    {liveText}
                                </p>

                                {rpsCountdown !== null && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg z-20 transition-all">
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-2">Safe Discharge In Progress</p>
                                            <p className="text-4xl font-mono font-black text-[#f1f1f1]">{(rpsCountdown / 1000).toFixed(1)}s</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {[3.3, 5.0, 12.0].map(v => (
                                    <button 
                                        key={v}
                                        onClick={() => setTargetVoltage(v)}
                                        className="py-2 bg-white/5 border border-white/5 rounded text-[10px] font-mono font-bold text-gray-400 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/20 transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                    >
                                        {v.toFixed(1)}V
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: CONTROL & SIMULATION */}
                    <div className="col-span-12 lg:col-span-3 bg-[#111624] p-6 space-y-6">
                        
                        <div className="space-y-4">
                            <ControlSlider 
                                label="Target V" 
                                value={targetVoltage} 
                                max={32} 
                                unit="V" 
                                color="#00f3ff" 
                                onChange={setTargetVoltage} 
                            />
                            <ControlSlider 
                                label="O.C.P. Limit" 
                                value={currentLimit} 
                                max={12} 
                                unit="A" 
                                color="#bd00ff" 
                                onChange={setCurrentLimit} 
                            />
                            <ControlSlider 
                                label="Simulated Load" 
                                value={currentLoad} 
                                max={12} 
                                unit="A" 
                                color="#f97316" 
                                onChange={setCurrentLoad} 
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/5">
                            <StatusLED label="CV" active={!isCC && powerState !== 'OFF'} />
                            <StatusLED label="CC" active={isCC} color="text-red-500" />
                            <StatusLED label="OVP" active={isOVP} color="text-amber-500" />
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] font-mono">Terminal Simulation</h3>
                            
                            <div className="flex flex-col gap-2 p-3 bg-black/5 dark:bg-black/40 rounded-lg border border-black/10 dark:border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-slate-900 dark:text-[#f1f1f1] uppercase transition-colors">Ignition (KL15)</p>
                                        <p className="text-[8px] font-mono text-gray-500 transition-colors tracking-widest uppercase">{powerState}</p>
                                    </div>
                                    <div className="flex bg-slate-200 dark:bg-black/40 p-1 rounded-md border border-black/5 dark:border-white/5 gap-1">
                                        {(['OFF', 'ACC', 'ON'] as const).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setPowerState(s)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded text-[9px] font-black transition-all font-mono",
                                                    powerState === s
                                                        ? "bg-cyan-500 text-black shadow-glow-sm"
                                                        : "text-gray-500 hover:text-gray-700 hover:bg-black/5"
                                                )}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Tooltip content={powerState === 'OFF' ? 'Turn ignition ON to crank' : powerState === 'CRANKING' ? 'Cranking in progress...' : 'Momentary ignition drop simulation'}>
                                    <button
                                        onClick={simulateCranking}
                                        disabled={powerState === 'OFF' || powerState === 'CRANKING'}
                                        aria-describedby="crank-hint"
                                        className={cn(
                                            "w-full py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/btn active:scale-95 focus:outline-none focus:ring-2",
                                            powerState === 'OFF' 
                                                ? "bg-gray-800 text-gray-600 border border-transparent opacity-50 cursor-not-allowed"
                                                : "bg-[#e8c426]/10 border border-[#e8c426]/20 text-[#e8c426] hover:bg-[#e8c426]/20 focus:ring-[#e8c426]/50"
                                        )}
                                    >
                                        <Zap className={cn("w-3.5 h-3.5", powerState === 'CRANKING' && "animate-pulse")} />
                                        {powerState === 'CRANKING' ? 'Cranking...' : 'Simulate Engine Crank'}
                                    </button>
                                </Tooltip>
                                {powerState === 'OFF' && (
                                    <p id="crank-hint" className="text-[9px] text-gray-500 font-mono text-center uppercase tracking-wide">
                                        Requires ignition ON
                                    </p>
                                )}
                            </div>
                        </div>

                         <div className="space-y-2">
                              <div className="flex justify-between items-end">
                                <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] font-mono">Fault Matrix</h3>
                                {faultState !== 'NONE' && (
                                    <span className="text-[8px] font-mono font-black text-amber-500 animate-pulse uppercase tracking-widest mb-0.5">Fault Active</span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                 <FaultButton 
                                     label="Short GND" 
                                     active={faultState === 'SHORT_GND'} 
                                     onAction={shortGndAction} 
                                     tone="critical" 
                                 />
                                 <FaultButton 
                                     label="Open Ckt" 
                                     active={faultState === 'OPEN_CIRCUIT'} 
                                     onAction={openCircuitAction} 
                                     tone="warning" 
                                 />
                              </div>
                              <p className="text-[9px] text-gray-500 font-mono text-center uppercase tracking-[0.15em] opacity-60 mt-1">
                                {isCoarsePointer ? 'Tap to toggle fault' : 'Hold to inject · Release to clear'}
                              </p>
                         </div>

                        <button
                            onClick={resetToDefaults}
                            className="w-full py-2 bg-white/5 border border-white/5 rounded-lg text-[9px] font-black text-gray-500 uppercase tracking-widest hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/20 transition-all flex items-center justify-center gap-2 group/reset"
                        >
                            <RefreshCcw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                            Reset factory defaults
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-magenta-500/5 rounded-full blur-[100px] pointer-events-none" />
        </div>
    );
};

const MonitorDisplay: React.FC<{ 
    label: string; 
    value: string; 
    unit: string; 
    color: string; 
    subValue?: string; 
    customColor?: string;
    minMax?: { min: number; max: number };
    onResetMinMax?: () => void;
}> = ({ label, value, unit, color, subValue, customColor, minMax, onResetMinMax }) => (
    <div className="space-y-1">
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] font-mono transition-colors">{label}</p>
        <div className="flex items-baseline gap-2">
            <span className={cn("text-5xl font-mono font-black tracking-tighter transition-all", color)} style={customColor ? { color: customColor, textShadow: `0 0 20px ${customColor}30` } : {}}>
                {value}
            </span>
            <span className="text-xl font-mono font-black text-gray-600 uppercase tracking-widest transition-colors">{unit}</span>
            {minMax && (
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-[9px] font-mono text-gray-600">
                        ↓{minMax.min.toFixed(2)}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500">
                        ↑{minMax.max.toFixed(2)}
                    </span>
                    <button
                        onClick={onResetMinMax}
                        className="text-[8px] font-mono text-gray-600 hover:text-gray-400 ml-1 focus:outline-none"
                        title="Reset min/max tracking"
                        aria-label="Reset telemetry tracking"
                    >
                        RST
                    </button>
                </div>
            )}
        </div>
        {subValue && (
            <p className="text-[10px] font-mono text-gray-600 font-bold uppercase tracking-widest transition-colors">{subValue}</p>
        )}
    </div>
);

const MetricBadge: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
    <div className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded border border-white/5 transition-colors">
        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest font-mono">{label}</span>
        <span className="text-[10px] font-mono font-black transition-colors" style={{ color }}>{value}</span>
    </div>
);

const ControlSlider: React.FC<{ label: string; value: number; max: number; unit: string; color: string; onChange: (v: number) => void }> = ({ label, value, max, unit, color, onChange }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono transition-colors">{label}</label>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-black transition-colors" style={{ backgroundColor: `${color}15`, color }}>{value.toFixed(2)}{unit}</span>
        </div>
        <input
            type="range"
            min="0"
            max={max}
            step="0.1"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            onKeyDown={(e) => {
                if (e.shiftKey) {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        onChange(Math.min(max, parseFloat((value + 1).toFixed(1))));
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        onChange(Math.max(0, parseFloat((value - 1).toFixed(1))));
                    }
                }
            }}
            className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-current transition-all hover:h-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ color }}
        />
    </div>
);

const StatusLED: React.FC<{ label: string; active: boolean; color?: string }> = ({ label, active, color = "text-cyan-500" }) => (
    <div className={cn(
        "flex flex-col items-center gap-1.5 p-2 rounded border transition-all",
        active ? "bg-black/40 border-white/10" : "bg-transparent border-transparent opacity-30"
    )}>
        <div className={cn(
            "w-2 h-2 rounded-full transition-all",
            active ? (color.includes('cyan') ? "bg-cyan-500 shadow-glow-sm" : color.includes('red') ? "bg-red-500 shadow-neon-red" : "bg-amber-500 shadow-neon-amber") : "bg-gray-800"
        )} />
        <span className={cn("text-[9px] font-black font-mono tracking-widest transition-colors", active ? color : "text-gray-600")}>{label}</span>
    </div>
);

const FaultButton: React.FC<{ label: string; active: boolean; onAction: any; tone: 'critical' | 'warning' }> = ({ label, active, onAction, tone }) => (
    <button
        onClick={onAction.handleClick}
        onPointerDown={onAction.handlePointerDown}
        onPointerUp={onAction.handlePointerUp}
        onPointerCancel={onAction.handlePointerUp}
        onPointerLeave={onAction.handlePointerUp}
        onKeyDown={onAction.handleKeyDown}
        onKeyUp={onAction.handleKeyUp}
        onBlur={onAction.handleBlur}
        className={cn(
            "flex-1 py-3 rounded-lg border text-[9px] font-black uppercase tracking-widest font-mono transition-all focus:outline-none focus:ring-1 focus:ring-current",
            active 
                ? (tone === 'critical' ? "bg-red-500 text-black border-red-500 shadow-neon-red scale-95" : "bg-amber-500 text-black border-amber-500 shadow-neon-amber scale-95")
                : (tone === 'critical' ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20")
        )}
    >
        {label}
    </button>
);

const FaultIndicator: React.FC<{ label: string; active: boolean; icon: React.ReactNode; tooltip: string }> = ({ label, active, icon, tooltip }) => (
    <Tooltip content={tooltip}>
        <div className={cn(
            "flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition-all",
            active ? "bg-red-500/10 border-red-500/50" : "bg-black/20 border-white/5 opacity-40 hover:opacity-100"
        )}>
            <div className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                active ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" : "bg-gray-700"
            )} />
            <span className={cn("text-[9px] font-mono font-black uppercase tracking-tighter truncate", active ? "text-red-500" : "text-gray-500")}>
                {label}
            </span>
            <div className={cn("ml-auto transition-colors", active ? "text-red-500" : "text-gray-700")}>
                {icon}
            </div>
        </div>
    </Tooltip>
);

const StatusBadge: React.FC<{ label: string; active: boolean; color: string }> = ({ label, active, color }) => (
    <div className={cn(
        "px-1.5 py-0.5 rounded text-[8px] font-mono font-black border transition-all select-none",
        active 
            ? `${color} text-black border-white/20 shadow-glow-sm` 
            : "bg-black/40 text-gray-700 border-white/5 opacity-20"
    )}>
        {label}
    </div>
);
