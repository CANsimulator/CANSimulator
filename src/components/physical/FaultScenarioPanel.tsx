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
}

const SCENARIOS: ScenarioConfig[] = [
    {
        id: 'power-off',
        label: 'POWER OFF',
        icon: Power,
        color: '#ef4444',
        description: 'Scope flatlines, all ECUs offline, and the bench reports transceiver offline.',
    },
    {
        id: 'cranking',
        label: 'SIM CRANK',
        icon: Key,
        color: '#f59e0b',
        description: 'Voltage sags, the eye degrades, and ECUs may drop off the bus.',
    },
    {
        id: 'short-gnd',
        label: 'SHORT_GND',
        icon: Zap,
        color: '#ef4444',
        description: 'Heavy noise appears on the scope while ECU error counters spike.',
        holdable: true,
    },
    {
        id: 'no-term',
        label: 'NO TERM',
        icon: Activity,
        color: '#f59e0b',
        description: 'Termination is removed, reflections appear, and topology raises a warning.',
    },
    {
        id: 'baud-1m',
        label: 'BAUD 1M',
        icon: Settings,
        color: '#00f3ff',
        description: 'Controller timing switches to 1 Mbit/s and mismatch badges appear on 500k nodes.',
    },
    {
        id: 'low-voltage',
        label: 'V < 7V',
        icon: Battery,
        color: '#bf00ff',
        description: 'Supply target drops below 7 V and the transceiver falls out of regulation.',
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
                return !bench?.terminationLeft && !bench?.terminationRight;
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
                const willActivate = !isScenarioActive('no-term');
                bench.setTerminationLeft(!willActivate);
                bench.setTerminationRight(!willActivate);
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
                    <motion.button
                        onClick={handleResetAll}
                        className="rounded px-2.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider transition-all active:scale-95"
                        style={{ color: '#00ff9f', backgroundColor: '#00ff9f10', border: '1px solid #00ff9f30' }}
                        whileHover={{ backgroundColor: '#00ff9f20' }}
                        aria-label="Reset all scenarios to nominal state"
                    >
                        <RotateCcw size={10} className="inline mr-1" /> RESET ALL
                    </motion.button>
                </div>
            </div>

            <div className="p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {SCENARIOS.map((scenario) => {
                        const active = isScenarioActive(scenario.id);

                        if (scenario.holdable) {
                            return (
                                <div key={scenario.id} className="flex flex-col gap-1">
                                    <motion.button
                                        onClick={shortGndAction.handleClick}
                                        onPointerDown={shortGndAction.handlePointerDown}
                                        onPointerUp={shortGndAction.handlePointerUp}
                                        onPointerCancel={shortGndAction.handlePointerUp}
                                        onPointerLeave={shortGndAction.handlePointerUp}
                                        onKeyDown={shortGndAction.handleKeyDown}
                                        onKeyUp={shortGndAction.handleKeyUp}
                                        onBlur={shortGndAction.handleBlur}
                                        className="relative flex min-h-[88px] select-none flex-col items-center justify-center gap-1 rounded-lg px-2 py-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                                        animate={{
                                            backgroundColor: active ? `${scenario.color}12` : (isDark ? '#0e0e14' : '#f8f9fa'),
                                            borderColor: active ? `${scenario.color}50` : (isDark ? '#1a1a22' : '#e5e7eb'),
                                            boxShadow: active ? `0 0 20px ${scenario.color}40` : 'none',
                                        }}
                                        style={{ border: '1px solid' }}
                                        whileTap={{ scale: 0.96 }}
                                        aria-pressed={active}
                                        aria-keyshortcuts="Space Enter"
                                        aria-label={`${scenario.label} fault, ${shortGndAction.interactionHint.toLowerCase()}`}
                                        title={shortGndAction.interactionHint}
                                    >
                                        <motion.div
                                            className="absolute inset-0 rounded-lg opacity-0"
                                            style={{ backgroundColor: scenario.color }}
                                            animate={{ opacity: active ? 0.08 : 0 }}
                                            transition={{ duration: 0.2 }}
                                        />
                                        <span className="z-10 text-lg leading-none" aria-hidden="true">
                                            <scenario.icon size={20} />
                                        </span>
                                        <span
                                            className="z-10 text-[7px] font-mono font-black uppercase tracking-wider"
                                            style={{ color: active ? scenario.color : '#666' }}
                                        >
                                            {scenario.label}
                                        </span>
                                        <span className="z-10 text-[6px] font-mono uppercase tracking-widest text-gray-500">
                                            {shortGndAction.interactionHint}
                                        </span>
                                    </motion.button>
                                    <ScenarioEffect text={scenario.description} visible={active} color={scenario.color} />
                                </div>
                            );
                        }

                        return (
                            <div key={scenario.id} className="flex flex-col gap-1">
                                <motion.button
                                    onClick={() => toggleScenario(scenario.id)}
                                    className="relative flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                                    animate={{
                                        backgroundColor: active ? `${scenario.color}12` : (isDark ? '#0e0e14' : '#f8f9fa'),
                                        borderColor: active ? `${scenario.color}50` : (isDark ? '#1a1a22' : '#e5e7eb'),
                                        boxShadow: active ? `0 0 14px ${scenario.color}25` : 'none',
                                    }}
                                    style={{ border: '1px solid' }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.96 }}
                                    aria-pressed={active}
                                    aria-label={`${scenario.label}, click to toggle`}
                                >
                                    <AnimatePresence>
                                        {active && (
                                            <motion.div
                                                className="absolute inset-0 rounded-lg"
                                                style={{ backgroundColor: scenario.color }}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 0.06 }}
                                                exit={{ opacity: 0 }}
                                            />
                                        )}
                                    </AnimatePresence>
                                    <motion.div
                                        className="absolute left-0 right-0 top-0 h-[2px] rounded-t-lg"
                                        animate={{ backgroundColor: active ? scenario.color : 'transparent' }}
                                    />
                                    <span className="z-10 text-lg leading-none" aria-hidden="true">
                                        <scenario.icon size={20} />
                                    </span>
                                    <span
                                        className="z-10 text-[7px] font-mono font-black uppercase tracking-wider"
                                        style={{ color: active ? scenario.color : '#666' }}
                                    >
                                        {scenario.label}
                                    </span>
                                    <motion.div
                                        className="z-10 h-1.5 w-1.5 rounded-full"
                                        animate={{
                                            backgroundColor: active ? scenario.color : (isDark ? '#333' : '#cbd5e1'),
                                            boxShadow: active ? `0 0 4px ${scenario.color}` : 'none',
                                        }}
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
        <span className="text-light-500 dark:text-gray-500 transition-colors">{label}</span>
        <span className="font-bold transition-colors" style={{ color: ok ? '#22c55e' : '#ef4444' }}>{value}</span>
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
