/**
 * Test Bench Context
 * Bridges Power Supply, Bus Topology, Bit Timing, and Oscilloscope
 * with realistic CAN transceiver physics.
 */

import React, { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePower } from './PowerContext';
import {
    DEFAULT_BIT_TIMING_PRESET,
    computeBaudRate,
    computeSamplePointPct,
    findBitTimingPresetById,
    type BitTiming,
    type CANLevels,
    type TestBenchState,
} from '../types/testbench';

const TestBenchContext = createContext<TestBenchState | undefined>(undefined);

function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
}

export const TestBenchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const power = usePower();

    // Controller timing is the authoritative source for baud/sample point.
    const [bitTiming, setBitTiming] = useState<BitTiming>(DEFAULT_BIT_TIMING_PRESET.timing);

    // Bus topology state is owned here so multiple racks can read/write it.
    const [terminationLeft, setTerminationLeft] = useState(true);
    const [terminationRight, setTerminationRight] = useState(true);
    const [busLoad, setBusLoad] = useState(0);
    const [onlineNodeCount, setOnlineNodeCount] = useState(8);
    const [maxStubLength, setMaxStubLength] = useState(0.3);

    const resetEyeBufferRef = useRef<(() => void) | null>(null);
    const registerResetEyeBuffer = (fn: () => void) => {
        resetEyeBufferRef.current = fn;
    };
    const resetEyeBuffer = () => {
        resetEyeBufferRef.current?.();
    };

    const baudRate = useMemo(() => computeBaudRate(bitTiming), [bitTiming]);
    const samplePointPct = useMemo(() => computeSamplePointPct(bitTiming), [bitTiming]);

    const applyBitTimingPreset = (presetId: '125k' | '250k' | '500k' | '1m') => {
        const preset = findBitTimingPresetById(presetId);
        if (!preset) return;
        setBitTiming(preset.timing);
    };

    const derived = useMemo(() => {
        const voltage = power.voltage;
        const terminationOk = terminationLeft && terminationRight;
        const transceiverActive = voltage >= 7.0 && power.powerState !== 'OFF';
        const voltageSag = clamp(12 - voltage, 0, 6);

        const canLevels: CANLevels = transceiverActive
            ? {
                canhDominant: clamp(3.5 - voltageSag * 0.12, 2.75, 3.6),
                canlDominant: clamp(1.5 + voltageSag * 0.08, 1.2, 2.25),
                recessive: clamp(2.5 - voltageSag * 0.02, 2.2, 2.6),
            }
            : { canhDominant: 2.5, canlDominant: 2.5, recessive: 2.5 };

        let degradation = 0;
        if (!terminationOk) degradation += 0.3;
        if (maxStubLength > 0.3 && baudRate >= 500_000) degradation += 0.15;
        if (voltage < 9 && transceiverActive) degradation += (9 - voltage) * 0.15;
        if (power.faultState === 'SHORT_GND') degradation = 0.9;
        if (!transceiverActive) degradation = 1.0;
        degradation = clamp(degradation, 0, 1);

        let ringing = 0;
        if (!terminationOk) ringing += 0.25;
        ringing += maxStubLength * (baudRate / 500_000) * 0.1;
        ringing = clamp(ringing, 0, 0.6);

        let noise = 0.06;
        if (power.faultState === 'SHORT_GND') noise = 0.4;
        if (voltage < 9 && transceiverActive) noise += 0.1;
        noise = clamp(noise, 0, 0.5);

        return {
            transceiverActive,
            terminationOk,
            canLevels,
            signalDegradation: degradation,
            ringingAmplitude: ringing,
            noiseAmplitude: noise,
        };
    }, [
        baudRate,
        maxStubLength,
        power.faultState,
        power.powerState,
        power.voltage,
        terminationLeft,
        terminationRight,
    ]);

    const value = useMemo<TestBenchState>(() => ({
        supplyVoltage: power.voltage,
        powerState: power.powerState,
        faultState: power.faultState,

        baudRate,
        samplePointPct,
        bitTiming,

        terminationLeft,
        terminationRight,
        terminationOk: derived.terminationOk,
        busLoad,
        onlineNodeCount,
        maxStubLength,

        transceiverActive: derived.transceiverActive,
        canLevels: derived.canLevels,
        signalDegradation: derived.signalDegradation,
        ringingAmplitude: derived.ringingAmplitude,
        noiseAmplitude: derived.noiseAmplitude,

        setBitTiming,
        applyBitTimingPreset,
        setTerminationLeft,
        setTerminationRight,
        setBusLoad,
        setOnlineNodeCount,
        setMaxStubLength,
        registerResetEyeBuffer,
        resetEyeBuffer,
    }), [
        baudRate,
        bitTiming,
        busLoad,
        derived,
        maxStubLength,
        onlineNodeCount,
        power.faultState,
        power.powerState,
        power.voltage,
        samplePointPct,
        terminationLeft,
        terminationRight,
    ]);

    return <TestBenchContext.Provider value={value}>{children}</TestBenchContext.Provider>;
};

export function useTestBench(): TestBenchState {
    const context = useContext(TestBenchContext);
    if (!context) {
        throw new Error('useTestBench must be used within a TestBenchProvider');
    }
    return context;
}
