import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePower } from '../../context/PowerContext';
import { useMomentaryAction } from '../../hooks/useMomentaryAction';
import { BorderBeam } from '../ui/BorderBeam';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';

export const PowerSupplyDashboard: React.FC = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const {
        voltage,
        current,
        powerState,
        targetVoltage,
        currentLimit,
        systemVoltage,
        faultState,
        setTargetVoltage,
        setCurrentLimit,
        setPowerState,
        setSystemVoltage,
        setFaultState,
        simulateCranking,
        rpsEnabled,
        rpsCountdown,
    } = usePower();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [history, setHistory] = useState<number[]>(new Array(100).fill(0));
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
        setHistory(prev => {
            const next = [...prev.slice(1), voltage];
            return next;
        });
    }, [voltage]);

    // Draw waveform
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // Match the buffer size to physical pixels
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
        }

        // Scale context so we can continue drawing in CSS pixels
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const width = rect.width;
        const height = rect.height;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < width; x += 30) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0; y < height; y += 30) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Waveform Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(0, 243, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 243, 255, 0)');

        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();

        const maxV = systemVoltage === 12 ? 18 : 36;
        const scaleY = height / maxV;

        history.forEach((v, i) => {
            const x = (i / (history.length - 1)) * width;
            const y = height - (v * scaleY);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Fill
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

    }, [history, systemVoltage]);

    const isCC = current >= currentLimit && powerState !== 'OFF';
    const isOVP = voltage > (systemVoltage === 12 ? 16 : 30);
    const powerW = voltage * current;

    const getVoltageColor = () => {
        if (powerState === 'OFF') return 'text-gray-600';
        if (faultState !== 'NONE') return 'text-red-500';
        if (voltage < 9 && systemVoltage === 12) return 'text-amber-500';
        return 'text-cyber-blue shadow-glow';
    };

    return (
        <div className="glass-panel p-6 relative overflow-hidden group">
            <BorderBeam size={200} duration={8} className="opacity-20 group-hover:opacity-40 transition-opacity" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 border-b border-white/5 pb-4 gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-2.5 h-2.5 rounded-full shadow-glow-sm",
                        powerState !== 'OFF' ? "bg-cyber-blue animate-pulse" : "bg-gray-700"
                    )} />
                    <h2 className="text-sm font-black text-dark-950 dark:text-[#f1f1f1] font-mono tracking-widest uppercase transition-colors">
                        Lab Power Supply
                        <span className="text-[10px] text-light-400 dark:text-gray-400 ml-3 font-normal tracking-normal uppercase opacity-60">PPS-3005-Cyber</span>
                    </h2>
                </div>

                <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/5 dark:border-white/5 transition-colors">
                    {[12, 24].map(v => (
                        <button
                            key={v}
                            onClick={() => setSystemVoltage(v as any)}
                            className={cn(
                                "px-4 py-1 rounded text-[10px] font-bold transition-all uppercase tracking-widest font-mono",
                                systemVoltage === v
                                    ? "bg-cyber-blue text-dark-950 shadow-neon/20"
                                    : "text-gray-400 hover:text-gray-200"
                            )}
                        >
                            {v}V Mode
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Monitoring Display (Left) */}
                <div className="lg:col-span-1 bg-white/40 dark:bg-black/40 rounded-xl p-5 border border-black/5 dark:border-white/5 flex flex-col justify-between relative overflow-hidden shadow-inner transition-colors">
                    {/* Status Badges */}
                    <div className="absolute top-4 right-4 flex gap-2">
                        <span className={cn(
                            "text-[9px] px-2 py-0.5 rounded-full font-black font-mono border",
                            isCC ? "bg-red-500/20 text-red-500 border-red-500/30" : "text-gray-700 border-transparent"
                        )}>CC</span>
                        <span className={cn(
                            "text-[9px] px-2 py-0.5 rounded-full font-black font-mono border",
                            !isCC && powerState !== 'OFF' ? "bg-cyber-blue/20 text-cyber-blue border-cyber-blue/30" : "text-gray-500 border-transparent"
                        )}>CV</span>
                        <span className={cn(
                            "text-[9px] px-2 py-0.5 rounded-full font-black font-mono border",
                            isOVP ? "bg-red-500 text-[#f1f1f1] animate-pulse" : "text-gray-500 border-transparent"
                        )}>OVP</span>
                        <span className={cn(
                            "text-[9px] px-2 py-0.5 rounded-full font-black font-mono border",
                            rpsEnabled ? "bg-amber-500/20 text-amber-500 border-amber-500/30" : "text-gray-500 border-transparent"
                        )}>RPS</span>
                    </div>

                    {/* RPS Countdown Overlay */}
                    {rpsCountdown !== null && (
                        <div className="absolute inset-0 bg-cyber-purple/10 flex items-center justify-center pointer-events-none z-10 backdrop-blur-sm">
                            <div className="text-center">
                                <p className="text-cyber-purple text-[9px] font-black uppercase tracking-[0.2em] mb-1">Power Down</p>
                                <p className="text-[#f1f1f1] text-3xl font-mono font-black">{(rpsCountdown / 1000).toFixed(1)}s</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-mono tracking-widest mb-1">Output Voltage</p>
                            <div className={cn("text-5xl font-mono font-black tracking-tighter transition-colors", getVoltageColor())}>
                                {voltage.toFixed(2)}<span className="text-xl ml-1 opacity-40">V</span>
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-mono tracking-widest mb-1">Current Draw</p>
                            <div className="text-3xl font-mono font-black text-cyber-purple tracking-tighter">
                                {current < 1 ? (current * 1000).toFixed(0) : current.toFixed(3)}
                                <span className="text-sm ml-1 opacity-40">{current < 1 ? 'mA' : 'A'}</span>
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] text-light-400 dark:text-gray-400 uppercase font-mono tracking-widest mb-1">Total Power</p>
                            <div className="text-xl font-mono font-black text-dark-950/80 dark:text-[#f1f1f1]/80 transition-colors">
                                {powerW.toFixed(1)}<span className="text-xs ml-1 opacity-40 font-normal">W</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Control Panel (Middle) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="space-y-4 pt-2">
                        {/* Voltage Control */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="power-target-v" className="text-[10px] font-black text-gray-400 uppercase font-mono tracking-widest">Target V</label>
                                <span className="text-xs font-mono font-black text-cyber-blue bg-cyber-blue/10 px-2 py-0.5 rounded">{targetVoltage.toFixed(2)}V</span>
                            </div>
                            <input
                                id="power-target-v"
                                type="range"
                                min="0"
                                max="32"
                                step="0.1"
                                value={targetVoltage}
                                onChange={(e) => setTargetVoltage(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyber-blue transition-colors"
                            />
                            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                                {[3.3, 5.0, 12.0, 13.8, 24.0].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setTargetVoltage(v)}
                                        className="flex-shrink-0 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 rounded text-[9px] font-mono font-bold text-light-400 dark:text-gray-400 hover:text-dark-950 dark:hover:text-[#f1f1f1] transition-all shadow-sm"
                                    >
                                        {v}V
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Current Limit */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="power-ocp-limit" className="text-[10px] font-black text-gray-400 uppercase font-mono tracking-widest">O.C.P. Limit</label>
                                <span className="text-xs font-mono font-black text-cyber-purple bg-cyber-purple/10 px-2 py-0.5 rounded">{currentLimit.toFixed(2)}A</span>
                            </div>
                            <input
                                id="power-ocp-limit"
                                type="range"
                                min="0.1"
                                max="10"
                                step="0.1"
                                value={currentLimit}
                                onChange={(e) => setCurrentLimit(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyber-purple transition-colors"
                            />
                        </div>

                        {/* Ignition State */}
                        <div className={cn(
                            "mt-6 p-4 rounded-xl border transition-all duration-500",
                            powerState !== 'OFF'
                                ? "bg-cyber-blue/10 border-cyber-blue/30 shadow-[0_0_20px_rgba(0,243,255,0.05)]"
                                : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10"
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className={cn(
                                        "text-[10px] font-black uppercase tracking-widest font-mono",
                                        powerState !== 'OFF' ? "text-cyber-blue" : "text-gray-400"
                                    )}>Ignition Control</p>
                                    <p className="text-[9px] text-gray-500 font-mono tracking-tighter uppercase">{powerState !== 'OFF' ? 'KL15 ACTIVE' : 'TERMINAL 15 OFF'}</p>
                                </div>
                                <button
                                    onClick={() => setPowerState(powerState === 'OFF' ? 'ON' : 'OFF')}
                                    aria-pressed={powerState !== 'OFF'}
                                    aria-label={powerState !== 'OFF' ? 'Turn ignition off' : 'Turn ignition on'}
                                    className={cn(
                                        "w-12 h-6 rounded-full relative transition-all duration-300",
                                        powerState !== 'OFF' ? "bg-cyber-blue" : (isDark ? "bg-gray-800" : "bg-gray-300")
                                    )}
                                >
                                    <motion.div
                                        animate={{ x: powerState !== 'OFF' ? 24 : 4 }}
                                        className="w-4 h-4 bg-white rounded-full absolute top-1"
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Advanced Features (Right) */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    {/* Viewport Monitor */}
                    <div className="flex-1 bg-white/40 dark:bg-black/40 rounded-xl border border-black/5 dark:border-white/5 p-4 relative min-h-[140px] shadow-inner transition-colors">
                        <p className="absolute top-3 left-4 text-[9px] text-gray-600 font-black uppercase tracking-widest font-mono">V-OUT Oscillo</p>
                        <canvas ref={canvasRef} className="w-full h-full rounded-lg block" />
                    </div>

                    {/* Fault Selection */}
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <button
                                onClick={shortGndAction.handleClick}
                                onPointerDown={shortGndAction.handlePointerDown}
                                onPointerUp={shortGndAction.handlePointerUp}
                                onPointerCancel={shortGndAction.handlePointerUp}
                                onPointerLeave={shortGndAction.handlePointerUp}
                                onKeyDown={shortGndAction.handleKeyDown}
                                onKeyUp={shortGndAction.handleKeyUp}
                                onBlur={shortGndAction.handleBlur}
                                aria-pressed={faultState === 'SHORT_GND'}
                                aria-keyshortcuts="Space Enter"
                                aria-label={`Short ground fault, ${shortGndAction.interactionHint.toLowerCase()}`}
                                title={shortGndAction.interactionHint}
                                className={cn(
                                    "flex-1 min-h-[52px] rounded-lg border py-3 text-[10px] font-black uppercase tracking-widest font-mono transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50",
                                    faultState === 'SHORT_GND'
                                        ? "bg-red-500 text-dark-950 border-red-500 scale-95 shadow-neon-red/40"
                                        : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                                )}
                            >
                                Short GND
                            </button>
                            <button
                                onClick={openCircuitAction.handleClick}
                                onPointerDown={openCircuitAction.handlePointerDown}
                                onPointerUp={openCircuitAction.handlePointerUp}
                                onPointerCancel={openCircuitAction.handlePointerUp}
                                onPointerLeave={openCircuitAction.handlePointerUp}
                                onKeyDown={openCircuitAction.handleKeyDown}
                                onKeyUp={openCircuitAction.handleKeyUp}
                                onBlur={openCircuitAction.handleBlur}
                                aria-pressed={faultState === 'OPEN_CIRCUIT'}
                                aria-keyshortcuts="Space Enter"
                                aria-label={`Open circuit fault, ${openCircuitAction.interactionHint.toLowerCase()}`}
                                title={openCircuitAction.interactionHint}
                                className={cn(
                                    "flex-1 min-h-[52px] rounded-lg border py-3 text-[10px] font-black uppercase tracking-widest font-mono transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
                                    faultState === 'OPEN_CIRCUIT'
                                        ? "bg-amber-500 text-dark-950 border-amber-500 scale-95 shadow-neon-amber/40"
                                        : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                                )}
                            >
                                Open Cir
                            </button>
                        </div>
                        <button
                            onClick={simulateCranking}
                            disabled={powerState === 'OFF' || powerState === 'CRANKING'}
                            className="w-full py-4 rounded-lg border border-white/10 bg-white/5 text-gray-300 text-[10px] font-black uppercase tracking-widest font-mono hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        >
                            {powerState === 'CRANKING' ? 'Cranking...' : 'Simulate Engine Crank'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
