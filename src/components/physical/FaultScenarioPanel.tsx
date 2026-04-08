import React, { useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePower } from '../../context/PowerContext';
import { useTestBench } from '../../context/TestBenchContext';
import { findBitTimingPresetByBaudRate } from '../../types/testbench';
import { useMomentaryAction } from '../../hooks/useMomentaryAction';
import { useTheme } from '../../context/ThemeContext';
import { Power, Key, Zap, Activity, Settings, Battery, RotateCcw } from 'lucide-react';

type ScenarioId =
    | 'power-off'
    | 'cranking'
    | 'short-gnd'
    | 'no-term'
    | 'baud-1m'
    | 'low-voltage';

interface ScenarioConfig {
    id: ScenarioId;
    label: string;
    icon: React.ElementType;
    color: string;
    description: string;
    holdable?: boolean;
    critical?: boolean;
}

const SCENARIOS: ScenarioConfig[] = [
    {
        id: 'power-off',
        label: 'POWER OFF',
        icon: Power,
        color: '#ff3131',
        description: 'Complete bench blackout. All ECUs offline and signal flatlined.',
        critical: true,
    },
    {
        id: 'cranking',
        label: 'SIM CRANK',
        icon: Key,
        color: '#f59e0b',
        description: 'Voltage sags to 6V, simulating ignition-start battery drop.',
    },
    {
        id: 'short-gnd',
        label: 'SHORT_GND',
        icon: Zap,
        color: '#ff4444',
        description: 'CAN_L / CAN_H short to ground. Heavy signal reflection and error spikes.',
        holdable: true,
        critical: true,
    },
    {
        id: 'no-term',
        label: 'NO TERM',
        icon: Activity,
        color: '#f59e0b',
        description: 'Termination resistors removed. Signal ringing and reflections occur.',
    },
    {
        id: 'baud-1m',
        label: 'BAUD 1M',
        icon: Settings,
        color: '#00f3ff',
        description: 'Switches controller to High-Speed 1Mbps protocol.',
    },
    {
        id: 'low-voltage',
        label: 'LOW VOLT',
        icon: Battery,
        color: '#bf00ff',
        description: 'Drops supply below 8.2V, causing transceiver regulation dropout.',
    },
] as const;

export const FaultScenarioPanel: React.FC = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const bench = useTestBench();
    const power = usePower();
    const shouldReduceMotion = useReducedMotion();

    const shortGndAction = useMomentaryAction({
        isActive: power.faultState === 'SHORT_GND',
        onStart: () => power.setFaultState('SHORT_GND'),
        onEnd: () => power.setFaultState('NONE'),
    });

    const isScenarioActive = useCallback((id: ScenarioId) => {
        switch (id) {
            case 'power-off':
                return power.powerState === 'OFF';
            case 'cranking':
                return power.powerState === 'CRANKING';
            case 'short-gnd':
                return power.faultState === 'SHORT_GND';
            case 'no-term':
                return bench?.terminationLeft === false && bench?.terminationRight === false;
            case 'baud-1m':
                return findBitTimingPresetByBaudRate(bench?.baudRate ?? 0)?.id === '1m';
            case 'low-voltage':
                return power.powerState !== 'OFF' && power.targetVoltage < 7;
            default:
                return false;
        }
    }, [bench?.baudRate, bench?.terminationLeft, bench?.terminationRight, power.faultState, power.powerState, power.targetVoltage]);

    const toggleScenario = useCallback((id: ScenarioId) => {
        if (!bench) return;

        switch (id) {
            case 'power-off':
                if (power.powerState === 'OFF') {
                    power.setPowerState('ON');
                    if (power.targetVoltage < 7) power.setTargetVoltage(12);
                } else {
                    power.setPowerState('OFF');
                }
                break;

            case 'cranking':
                power.simulateCranking();
                bench.resetEyeBuffer();
                break;

            case 'no-term': {
                const isCurrentlyActive = isScenarioActive('no-term');
                // If scenario is active (both OFF), toggle to normal (both ON). 
                // If not active (normal or partial), toggle to fault (both OFF).
                const targetState = isCurrentlyActive; 
                bench.setTerminationLeft(targetState);
                bench.setTerminationRight(targetState);
                bench.resetEyeBuffer();
                break;
            }

            case 'baud-1m':
                bench.applyBitTimingPreset(isScenarioActive('baud-1m') ? '500k' : '1m');
                bench.resetEyeBuffer();
                break;

            case 'low-voltage':
                if (power.powerState === 'OFF') power.setPowerState('ON');
                power.setTargetVoltage(isScenarioActive('low-voltage') ? 12 : 6);
                break;

            default:
                break;
        }
    }, [bench, isScenarioActive, power]);

    const handleResetAll = useCallback(() => {
        if (!bench) return;
        power.setPowerState('ON');
        power.setTargetVoltage(12);
        power.setFaultState('NONE');
        bench.setTerminationLeft(true);
        bench.setTerminationRight(true);
        bench.applyBitTimingPreset('500k');
        bench.resetEyeBuffer();
    }, [bench, power]);

    const supplyV = bench?.supplyVoltage ?? 12;
    const sigQuality = Math.round((1 - (bench?.signalDegradation ?? 0)) * 100);
    const onlineEcus = bench?.onlineNodeCount ?? 0;
    const xcvrOk = bench?.transceiverActive ?? true;
    const hasTermIssue = !(bench?.terminationLeft) || !(bench?.terminationRight);

    return (
        <div
            className="overflow-hidden rounded-2xl border border-black/10 dark:border-[#1a1a22] bg-white dark:bg-[#0c0c10] shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors"
            role="region"
            aria-label="Fault Scenario Injector"
        >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 dark:border-[#14141e] bg-gray-50/50 dark:bg-[#09090d] px-4 py-2 transition-colors">
                <div className="flex items-center gap-3">
                    <motion.div
                        className="h-2 w-2 rounded-full"
                        animate={{
                            backgroundColor: xcvrOk ? '#22c55e' : '#ef4444',
                            boxShadow: xcvrOk ? '0 0 6px #22c55e60' : '0 0 6px #ef444460',
                        }}
                    />
                    <span className="text-[10px] font-mono font-black uppercase tracking-widest text-dark-950 dark:text-[#f1f1f1] transition-colors">
                        FAULT-INJECTOR
                    </span>
                    <span className="text-[8px] font-mono tracking-wider text-light-500 dark:text-gray-500 transition-colors">
                        SCENARIO CONSOLE · RACK 1.5
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                    <LivePill label="VCC" value={`${supplyV.toFixed(1)}V`} ok={supplyV >= 7} />
                    <LivePill label="SIG" value={`${sigQuality}%`} ok={sigQuality >= 60} />
                    <LivePill label="ECU" value={`${onlineEcus}`} ok={onlineEcus > 0} />
                    {hasTermIssue && (
                        <motion.span
                            className="rounded px-1.5 py-0.5 text-[7px] font-mono font-bold"
                            style={{ backgroundColor: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40' }}
                            animate={{ opacity: shouldReduceMotion ? 0.8 : [1, 0.5, 1] }}
                            transition={{ duration: 1.2, repeat: shouldReduceMotion ? 0 : Infinity }}
                        >
                            RINGING
                        </motion.span>
                    )}
                    
                    <div className="flex items-center gap-2 border-l border-black/5 dark:border-white/5 pl-2 ml-1">
                        <span className={`text-[8px] font-mono font-black tracking-widest ${bench.isArmed ? 'text-red-500' : 'text-gray-500'}`}>
                            {bench.isArmed ? 'ARMED' : 'DISARMED'}
                        </span>
                        <button
                            onClick={() => bench.setArmed(!bench.isArmed)}
                            className="relative h-4 w-8 rounded-full border border-black/10 dark:border-white/10 transition-colors bg-gray-200 dark:bg-[#1a1a22] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-blue focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0c0c10]"
                            aria-label="Toggle Fault Injector Arming State"
                        >
                            <motion.div
                                className="absolute left-0.5 top-0.5 h-2.5 w-2.5 rounded-full"
                                animate={{
                                    x: bench.isArmed ? 15 : 0,
                                    backgroundColor: bench.isArmed ? '#ef4444' : '#6b7280',
                                    boxShadow: bench.isArmed ? '0 0 8px #ef4444' : 'none',
                                }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        </button>
                    </div>

                    <motion.button
                        onClick={handleResetAll}
                        className="rounded px-2.5 py-1 text-[7px] font-mono font-black uppercase tracking-wider transition-all active:scale-95 ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 shadow-inner"
                        style={{ color: '#00ff9f', backgroundColor: '#00ff9f10', border: '1px solid #00ff9f30' }}
                        whileHover={{ backgroundColor: '#00ff9f15', borderColor: '#00ff9f60' }}
                        aria-label="Reset all scenarios to nominal state"
                    >
                        <RotateCcw size={10} className="inline mr-1" /> SYSTEM RESET
                    </motion.button>
                </div>
            </div>

            <div className="p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {SCENARIOS.map((scenario) => {
                        const active = isScenarioActive(scenario.id);

                        if (scenario.holdable) {
                            return (
                                <div key={scenario.id} className="flex flex-col gap-1.5">
                                    <motion.button
                                        onClick={shortGndAction.handleClick}
                                        onPointerDown={shortGndAction.handlePointerDown}
                                        onPointerUp={shortGndAction.handlePointerUp}
                                        onPointerCancel={shortGndAction.handlePointerUp}
                                        onPointerLeave={shortGndAction.handlePointerUp}
                                        onKeyDown={shortGndAction.handleKeyDown}
                                        onKeyUp={shortGndAction.handleKeyUp}
                                        onBlur={shortGndAction.handleBlur}
                                        className={`relative flex min-h-[96px] select-none flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-4 transition-all focus:outline-none border-2 ${
                                            bench.isArmed 
                                                ? 'focus-visible:ring-2 focus-visible:ring-cyber-blue cursor-pointer' 
                                                : 'opacity-40 grayscale-[0.5] cursor-not-allowed pointer-events-none'
                                        }`}
                                        animate={{
                                            backgroundColor: active ? `${scenario.color}15` : (isDark ? '#0a0a0f' : '#f8f9fa'),
                                            borderColor: active ? scenario.color : (isDark ? (scenario.critical ? '#3a1a1a' : '#1a1a22') : '#e5e7eb'),
                                            boxShadow: active ? `0 0 25px ${scenario.color}30, inset 0 0 10px ${scenario.color}10` : 'none',
                                        }}
                                        whileHover={bench.isArmed ? {
                                            scale: 1.04,
                                            backgroundColor: `${scenario.color}20`,
                                            borderColor: scenario.color,
                                            boxShadow: `0 0 24px ${scenario.color}35`,
                                        } : {}}
                                        whileTap={bench.isArmed ? { scale: 0.94 } : {}}
                                        aria-pressed={active}
                                        aria-disabled={!bench.isArmed}
                                        aria-keyshortcuts="Space Enter"
                                        aria-label={`${scenario.label} fault, ${shortGndAction.interactionHint.toLowerCase()}`}
                                        title={bench.isArmed ? shortGndAction.interactionHint : 'Unlock Master Arm to activate'}
                                    >
                                        <AnimatePresence>
                                            {active && (
                                                <motion.div
                                                    className="absolute inset-0 rounded-xl overflow-hidden"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 0.1 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    <motion.div 
                                                        className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent"
                                                        animate={{ y: ['-100%', '100%'] }}
                                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <span className={`z-10 leading-none transition-all duration-300 ${active ? 'scale-125' : ''}`} style={{ color: active ? scenario.color : undefined }} aria-hidden="true">
                                            <scenario.icon size={22} strokeWidth={active ? 2.5 : 2} />
                                        </span>
                                        <span
                                            className="z-10 text-[8px] font-mono font-black uppercase tracking-widest text-center leading-tight"
                                            style={{ color: active ? scenario.color : (isDark ? '#777' : '#555') }}
                                        >
                                            {scenario.label}
                                        </span>
                                        <div className="flex flex-col items-center gap-1 mt-1">
                                            <span className="z-10 text-[6px] font-mono font-black uppercase tracking-[0.15em] text-light-500 opacity-60">
                                                {shortGndAction.interactionHint}
                                            </span>
                                            {active && (
                                                <motion.div 
                                                    className="h-1 w-8 rounded-full bg-current opacity-40 overflow-hidden"
                                                    style={{ color: scenario.color }}
                                                >
                                                    <motion.div 
                                                        className="h-full bg-current" 
                                                        animate={{ width: ['0%', '100%', '0%'] }} 
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                    />
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.button>
                                    <ScenarioEffect text={scenario.description} visible={active} color={scenario.color} />
                                </div>
                            );
                        }

                        return (
                            <div key={scenario.id} className="flex flex-col gap-1.5">
                                <motion.button
                                    onClick={() => bench.isArmed && toggleScenario(scenario.id)}
                                    className={`relative flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-4 transition-all focus:outline-none border-2 ${
                                        bench.isArmed 
                                            ? 'focus-visible:ring-2 focus-visible:ring-cyber-blue cursor-pointer' 
                                            : 'opacity-40 grayscale-[0.5] cursor-not-allowed pointer-events-none'
                                    }`}
                                    animate={{
                                        backgroundColor: active ? `${scenario.color}12` : (isDark ? '#0a0a0f' : '#f8f9fa'),
                                        borderColor: active ? scenario.color : (isDark ? (scenario.critical ? '#3a1a1a' : '#1a1a22') : '#e5e7eb'),
                                        boxShadow: active ? `0 0 18px ${scenario.color}20` : 'none',
                                    }}
                                    whileHover={bench.isArmed ? {
                                        scale: 1.04,
                                        backgroundColor: `${scenario.color}18`,
                                        borderColor: `${scenario.color}80`,
                                        boxShadow: `0 0 20px ${scenario.color}25`,
                                    } : {}}
                                    whileTap={bench.isArmed ? { scale: 0.95 } : {}}
                                    aria-pressed={active}
                                    aria-disabled={!bench.isArmed}
                                    aria-label={`${scenario.label}, click to toggle`}
                                    title={bench.isArmed ? 'Toggle scenario' : 'Unlock Master Arm to activate'}
                                >
                                    <AnimatePresence>
                                        {active && (
                                            <motion.div
                                                className="absolute inset-0 rounded-xl"
                                                style={{ backgroundColor: scenario.color }}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 0.08 }}
                                                exit={{ opacity: 0 }}
                                            />
                                        )}
                                    </AnimatePresence>
                                    <motion.div
                                        className="absolute left-0 right-0 top-0 h-[3px] rounded-t-xl"
                                        animate={{ backgroundColor: active ? scenario.color : 'transparent' }}
                                    />
                                    <span className={`z-10 leading-none transition-all duration-300 ${active ? 'scale-110' : ''}`} style={{ color: active ? scenario.color : undefined }} aria-hidden="true">
                                        <scenario.icon size={22} strokeWidth={active ? 2.5 : 2} />
                                    </span>
                                    <span
                                        className="z-10 text-[8px] font-mono font-black uppercase tracking-widest text-center leading-tight"
                                        style={{ color: active ? scenario.color : (isDark ? '#777' : '#555') }}
                                    >
                                        {scenario.label}
                                    </span>
                                    <motion.div
                                        className="z-10 h-1.5 w-1.5 rounded-full"
                                        animate={{
                                            backgroundColor: active ? scenario.color : (isDark ? '#222' : '#cbd5e1'),
                                            boxShadow: active ? `0 0 8px ${scenario.color}` : 'none',
                                            scale: active ? [1, 1.3, 1] : 1
                                        }}
                                        transition={active ? { repeat: Infinity, duration: 2 } : {}}
                                    />
                                </motion.button>
                                <ScenarioEffect text={scenario.description} visible={active} color={scenario.color} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const LivePill: React.FC<{ label: string; value: string; ok: boolean }> = ({ label, value, ok }) => (
    <div
        className="flex items-center gap-1 rounded border px-2 py-0.5 text-[7px] font-mono transition-colors"
        style={{
            borderColor: ok ? '#22c55e30' : '#ef444430',
            backgroundColor: ok ? '#22c55e08' : '#ef444408',
        }}
    >
        <span className="text-light-500 dark:text-gray-500 transition-colors uppercase">{label}</span>
        <span className="font-bold transition-colors" style={{ color: ok ? '#22c55e' : '#ef4444' }}>{value}</span>
        <div 
            className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} 
            role="img" 
            aria-label={`Status: ${ok ? 'OK' : 'FAIL'}`}
        />
    </div>
);

const ScenarioEffect: React.FC<{ text: string; visible: boolean; color: string }> = ({ text, visible, color }) => (
    <AnimatePresence>
        {visible && (
            <motion.div
                className="rounded-md px-1.5 py-1 text-[6px] font-mono leading-relaxed"
                style={{ backgroundColor: `${color}10`, border: `1px solid ${color}25`, color: `${color}cc` }}
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
            >
                {text}
            </motion.div>
        )}
    </AnimatePresence>
);
