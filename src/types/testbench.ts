/**
 * Test Bench shared types
 * Bridges Power Supply, Bus Topology, Bit Timing, and Oscilloscope
 */

import type { PowerState, FaultState } from './power';

// Re-exported from BitTimingConfig so all components share one definition
export interface BitTiming {
    sync: number;
    prop: number;
    phase1: number;
    phase2: number;
    sjw: number;
    brp: number;
    oscillator: number; // Hz, e.g., 16000000
}

export interface BitTimingPreset {
    id: '125k' | '250k' | '500k' | '1m';
    name: string;
    clock: string;
    baudRate: number;
    timing: BitTiming;
}

export const BIT_TIMING_PRESETS: readonly BitTimingPreset[] = [
    {
        id: '125k',
        name: '125 kbit/s',
        clock: '16 MHz',
        baudRate: 125_000,
        timing: { sync: 1, prop: 7, phase1: 4, phase2: 4, sjw: 1, brp: 4, oscillator: 16_000_000 },
    },
    {
        id: '250k',
        name: '250 kbit/s',
        clock: '16 MHz',
        baudRate: 250_000,
        timing: { sync: 1, prop: 7, phase1: 4, phase2: 4, sjw: 1, brp: 2, oscillator: 16_000_000 },
    },
    {
        id: '500k',
        name: '500 kbit/s',
        clock: '16 MHz',
        baudRate: 500_000,
        timing: { sync: 1, prop: 7, phase1: 4, phase2: 4, sjw: 1, brp: 1, oscillator: 16_000_000 },
    },
    {
        id: '1m',
        name: '1 Mbit/s',
        clock: '16 MHz',
        baudRate: 1_000_000,
        timing: { sync: 1, prop: 3, phase1: 2, phase2: 2, sjw: 1, brp: 1, oscillator: 16_000_000 },
    },
] as const;

export const DEFAULT_BIT_TIMING_PRESET = BIT_TIMING_PRESETS[2];

export function computeBaudRate(timing: BitTiming): number {
    const totalTq = timing.sync + timing.prop + timing.phase1 + timing.phase2;
    return Math.round(timing.oscillator / (2 * timing.brp * totalTq));
}

export function computeSamplePointPct(timing: BitTiming): number {
    const totalTq = timing.sync + timing.prop + timing.phase1 + timing.phase2;
    return ((timing.sync + timing.prop + timing.phase1) / totalTq) * 100;
}

export function isSameBitTiming(left: BitTiming, right: BitTiming): boolean {
    return left.sync === right.sync
        && left.prop === right.prop
        && left.phase1 === right.phase1
        && left.phase2 === right.phase2
        && left.sjw === right.sjw
        && left.brp === right.brp
        && left.oscillator === right.oscillator;
}

export function findBitTimingPresetById(id: BitTimingPreset['id']): BitTimingPreset | undefined {
    return BIT_TIMING_PRESETS.find((preset) => preset.id === id);
}

export function findBitTimingPresetByBaudRate(baudRate: number): BitTimingPreset | undefined {
    return BIT_TIMING_PRESETS.find((preset) => preset.baudRate === baudRate);
}

export function findBitTimingPresetForTiming(timing: BitTiming): BitTimingPreset | undefined {
    return BIT_TIMING_PRESETS.find((preset) => isSameBitTiming(preset.timing, timing));
}

export interface CANLevels {
    canhDominant: number;
    canlDominant: number;
    recessive: number;
}

export interface TestBenchState {
    // ── From Power Supply (derived from PowerContext) ──
    supplyVoltage: number;
    powerState: PowerState;
    faultState: FaultState;
    transceiverActive: boolean;

    // ── From Bit Timing (written by BitTimingConfig) ──
    baudRate: number;
    samplePointPct: number;
    bitTiming: BitTiming;

    // ── From Bus Topology (written by BusTopology) ──
    terminationLeft: boolean;
    terminationRight: boolean;
    terminationOk: boolean;
    busLoad: number;
    onlineNodeCount: number;
    maxStubLength: number;

    // ── Derived physical effects ──
    canLevels: CANLevels;
    signalDegradation: number;   // 0 (perfect) to 1 (unusable)
    ringingAmplitude: number;
    noiseAmplitude: number;

    // ── Setters (each component calls the ones it owns) ──
    setBitTiming: (t: BitTiming) => void;
    applyBitTimingPreset: (presetId: BitTimingPreset['id']) => void;
    setTerminationLeft: (on: boolean) => void;
    setTerminationRight: (on: boolean) => void;
    setBusLoad: (load: number) => void;
    setOnlineNodeCount: (count: number) => void;
    setMaxStubLength: (m: number) => void;
    /** VoltageScope calls this once on mount to register its eye-buffer reset fn */
    registerResetEyeBuffer: (fn: () => void) => void;
    /** FaultScenarioPanel calls this to clear stale eye-diagram on fault changes */
    resetEyeBuffer: () => void;
}
