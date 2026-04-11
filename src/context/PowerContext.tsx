/**
 * Power System Context
 * Manages ECU voltage, current, and power states
 * Ported and adapted for CAN-Simulator
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { PowerContextType, PowerState, FaultState, SystemVoltage } from '../types/power';

export const PowerContext = createContext<PowerContextType | undefined>(undefined);

export const PowerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { pathname } = useLocation();
    const isSimulatorRoute = ['/simulator', '/inspector', '/physical', '/arbitration', '/errors', '/signals'].includes(pathname);

    // Advanced Power State
    const [systemVoltage, setSystemVoltage] = useState<SystemVoltage>(12);
    const [targetVoltage, setTargetVoltage] = useState(12.0);
    const [currentLimit, setCurrentLimit] = useState(5.0);
    const [currentLoad, setCurrentLoad] = useState(0.5);
    const [powerState, setPowerState] = useState<PowerState>('ON');
    const [faultState, setFaultState] = useState<FaultState>('NONE');

    // Simulated physics state
    const [voltage, setVoltage] = useState(12.4);
    const [current, setCurrent] = useState(0.5);
    const [ecuPower, setEcuPower] = useState(true);

    // Rapid Power Shutdown (RPS) State
    const [rpsEnabled, setRpsEnabled] = useState(false);
    const [rpsPowerDownTime, setRpsPowerDownTime] = useState(0); // in 10ms units
    const [rpsCountdown, setRpsCountdown] = useState<number | null>(null);
    const rpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const activeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const crankTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Global timers cleanup
    useEffect(() => {
        const currentTimers = activeTimers.current;
        return () => {
            if (rpsTimerRef.current) clearInterval(rpsTimerRef.current);
            if (crankTimerRef.current) clearInterval(crankTimerRef.current);
            currentTimers.forEach(clearTimeout);
            activeTimers.current = [];
        };
    }, []);

    // Sync legacy ecuPower with powerState
    useEffect(() => {
        setEcuPower(powerState !== 'OFF');
    }, [powerState]);

    // Keep simulation parameters in a ref to avoid interval thrashing while scrolling
    const simParamsRef = useRef({ targetVoltage, currentLimit, currentLoad, powerState, faultState });
    useEffect(() => {
        simParamsRef.current = { targetVoltage, currentLimit, currentLoad, powerState, faultState };
    }, [targetVoltage, currentLimit, currentLoad, powerState, faultState]);

    // physics simulation loop
    useEffect(() => {
        if (!isSimulatorRoute) return;

        const interval = setInterval(() => {
            const { targetVoltage: tV, currentLimit: cL, currentLoad: cLoad, powerState: pS, faultState: fS } = simParamsRef.current;

            // 1. Handle Faults
            if (fS === 'SHORT_GND') {
                setVoltage(prev => prev * 0.6); // Rapid drop
                const spike = Math.random() * 5 + 15;
                // PSU enters CC mode at currentLimit
                setCurrent(prev => prev + (Math.min(spike, cL) - prev) * 0.5);
                return;
            }
            if (fS === 'OPEN_CIRCUIT') {
                setVoltage(prev => prev + (tV - prev) * 0.3);
                setCurrent(prev => prev * 0.4); // Rapid drop to near-zero
                return;
            }

            // 2. Handle Power States
            if (pS === 'OFF') {
                setVoltage(prev => Math.max(0, prev * 0.7));
                setCurrent(prev => Math.max(0, prev * 0.7));
                return;
            }

            let baseVoltage = tV;
            let baseCurrent = cLoad; // Use user-controlled simulated load

            if (pS === 'ACC') {
                baseCurrent = Math.min(cLoad, 0.2);
            } else if (pS === 'ON') {
                // Keep cLoad
            } else if (pS === 'CRANKING') {
                baseCurrent = 8.0 + cLoad;
            }

            // Apply fluctuations
            const vRipple = pS === 'ON' ? (Math.random() - 0.5) * 0.2 : 0.05;
            let newVoltage = baseVoltage + vRipple;
            const iRipple = (Math.random() - 0.5) * 0.05;
            let newCurrent = baseCurrent + iRipple;

            // Apply Limits (Constant Current / OCP Mode)
            newVoltage = Math.max(0, Math.min(36, newVoltage));
            if (newCurrent > cL) {
                newCurrent = cL;
                // V drop to maintain current limit: V_out = V_set * (I_limit / I_load)
                newVoltage = newVoltage * (cL / (baseCurrent + 0.001));
            }

            setVoltage(prev => prev + (newVoltage - prev) * 0.3);
            setCurrent(prev => prev + (newCurrent - prev) * 0.3);
        }, 100); // 100ms update for smoother responsiveness

        return () => clearInterval(interval);
    }, [isSimulatorRoute]);

    const toggleEcuPower = useCallback(() => {
        setPowerState(prev => prev === 'OFF' ? 'ON' : 'OFF');
    }, []);

    const simulateCranking = useCallback(async () => {
        if (powerState === 'OFF') return;

        const originalState = powerState;
        setPowerState('CRANKING');

        const startTime = Date.now();
        const duration = 1500;

        if (crankTimerRef.current) clearInterval(crankTimerRef.current);
        crankTimerRef.current = setInterval(() => {
            const { targetVoltage: tV, currentLimit: cL } = simParamsRef.current;
            const elapsed = Date.now() - startTime;
            
            if (elapsed >= duration) {
                if (crankTimerRef.current) {
                    clearInterval(crankTimerRef.current);
                    crankTimerRef.current = null;
                }
                setPowerState(prev => prev === 'CRANKING' ? originalState : prev);
                return;
            }

            let crankVolts = 12.0;
            if (elapsed < 300) {
                crankVolts = 12.0 - (elapsed / 300) * 6.0;
            } else if (elapsed < 1000) {
                crankVolts = 6.0 + (Math.random() * 1.0);
            } else {
                const progress = (elapsed - 1000) / 500;
                crankVolts = 7.0 + progress * (tV - 7.0);
            }

            const rawCurrent = 8.0 + (Math.random() * 2.0);
            setVoltage(crankVolts);
            setCurrent(Math.min(rawCurrent, cL));
        }, 50);
    }, [powerState, targetVoltage]);

    const simulateResetVoltageProfile = useCallback((type: 'hard' | 'keyOffOn') => {
        activeTimers.current.forEach(clearTimeout);
        activeTimers.current = [];

        if (type === 'hard') {
            setVoltage(8.0);
            setCurrent(3.0);
            const timer = setTimeout(() => {
                setVoltage(targetVoltage);
                setCurrent(0.5);
            }, 200);
            activeTimers.current.push(timer);
        } else if (type === 'keyOffOn') {
            const previousState = powerState === 'OFF' ? 'ON' : powerState;
            setPowerState('OFF');
            setVoltage(0);
            setCurrent(0);
            const timer = setTimeout(() => {
                setPowerState(previousState);
                setVoltage(targetVoltage);
                setCurrent(0.5);
            }, 5000);
            activeTimers.current.push(timer);
        }
    }, [targetVoltage, powerState]);

    const triggerRpsPowerDown = useCallback(() => {
        const totalMs = rpsPowerDownTime * 10;
        if (totalMs === 0) {
            setRpsCountdown(null);
            return;
        }
        setRpsCountdown(totalMs);

        if (rpsTimerRef.current) clearInterval(rpsTimerRef.current);

        const startTime = Date.now();
        rpsTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, totalMs - elapsed);

            if (remaining <= 0) {
                if (rpsTimerRef.current) clearInterval(rpsTimerRef.current);
                rpsTimerRef.current = null;
                setRpsCountdown(null);
            } else {
                setRpsCountdown(remaining);
            }
        }, 50);
    }, [rpsPowerDownTime]);

    const resetToDefaults = useCallback(() => {
        setTargetVoltage(12.0);
        setCurrentLimit(5.0);
        setCurrentLoad(0.5);
        setSystemVoltage(12);
        setPowerState('ON');
        setFaultState('NONE');
        setRpsEnabled(false);
        setRpsCountdown(null);
        if (crankTimerRef.current) clearInterval(crankTimerRef.current);
        if (rpsTimerRef.current) clearInterval(rpsTimerRef.current);
        activeTimers.current.forEach(clearTimeout);
    }, []);

    const value = useMemo(() => ({
        voltage,
        current,
        ecuPower,
        systemVoltage,
        targetVoltage,
        currentLimit,
        currentLoad,
        powerState,
        faultState,
        rpsEnabled,
        rpsPowerDownTime,
        rpsCountdown,
        toggleEcuPower,
        setPowerState,
        setRpsEnabled,
        setSystemVoltage,
        setTargetVoltage,
        setCurrentLimit,
        setCurrentLoad,
        setFaultState,
        resetToDefaults,
        simulateCranking,
        setVoltage,
        setCurrent,
        triggerRpsPowerDown,
        setRpsPowerDownTime,
        simulateResetVoltageProfile,
    }), [
        voltage,
        current,
        ecuPower,
        systemVoltage,
        targetVoltage,
        currentLimit,
        currentLoad,
        powerState,
        faultState,
        rpsEnabled,
        rpsPowerDownTime,
        rpsCountdown,
        toggleEcuPower,
        resetToDefaults,
        simulateCranking,
        triggerRpsPowerDown,
        simulateResetVoltageProfile,
        setRpsEnabled,
    ]);

    return <PowerContext.Provider value={value}>{children}</PowerContext.Provider>;
};

export const usePower = () => {
    const context = useContext(PowerContext);
    if (context === undefined) {
        throw new Error('usePower must be used within a PowerProvider');
    }
    return context;
};
