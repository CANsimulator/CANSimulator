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
    const [powerState, setPowerState] = useState<PowerState>('ON');
    const [faultState, setFaultState] = useState<FaultState>('NONE');

    // Simulated physics state
    const [voltage, setVoltage] = useState(12.4);
    const [current, setCurrent] = useState(0.5);
    const [ecuPower, setEcuPower] = useState(true);

    // Rapid Power Shutdown (RPS) State
    const [rpsEnabled] = useState(false);
    const [rpsPowerDownTime, setRpsPowerDownTime] = useState(0); // in 10ms units
    const [rpsCountdown, setRpsCountdown] = useState<number | null>(null);
    const rpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const crankTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Global timers cleanup
    useEffect(() => {
        return () => {
            if (rpsTimerRef.current) clearInterval(rpsTimerRef.current);
            if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
            if (crankTimerRef.current) clearInterval(crankTimerRef.current);
        };
    }, []);

    // Sync legacy ecuPower with powerState
    useEffect(() => {
        setEcuPower(powerState !== 'OFF');
    }, [powerState]);

    // physics simulation loop
    useEffect(() => {
        if (!isSimulatorRoute) return;

        const interval = setInterval(() => {
            // 1. Handle Faults
            if (faultState === 'SHORT_GND') {
                setVoltage(prev => prev * 0.7);
                setCurrent(Math.random() * 5 + 15); // Spike
                return;
            }
            if (faultState === 'OPEN_CIRCUIT') {
                setVoltage(prev => prev + (targetVoltage - prev) * 0.3);
                setCurrent(0);
                return;
            }

            // 2. Handle Power States
            if (powerState === 'OFF') {
                setVoltage(prev => Math.max(0, prev * 0.7));
                setCurrent(prev => Math.max(0, prev * 0.7));
                return;
            }

            let baseVoltage = targetVoltage;
            let baseCurrent = 0;

            if (powerState === 'ACC') {
                baseCurrent = 0.2;
            } else if (powerState === 'ON') {
                baseCurrent = 0.5;
            } else if (powerState === 'CRANKING') {
                baseCurrent = 8.0;
            }

            // Apply fluctuations
            const vRipple = powerState === 'ON' ? (Math.random() - 0.5) * 0.2 : 0.05;
            let newVoltage = baseVoltage + vRipple;
            const iRipple = (Math.random() - 0.5) * 0.05;
            let newCurrent = baseCurrent + iRipple;

            // Apply Limits
            newVoltage = Math.max(0, Math.min(36, newVoltage));
            if (newCurrent > currentLimit) {
                newCurrent = currentLimit;
                newVoltage = newVoltage * (currentLimit / (baseCurrent + 0.001));
            }

            setVoltage(prev => prev + (newVoltage - prev) * 0.3);
            setCurrent(prev => prev + (newCurrent - prev) * 0.3);
        }, 100); // 100ms update for smoother responsiveness

        return () => clearInterval(interval);
    }, [isSimulatorRoute, powerState, faultState, targetVoltage, currentLimit]);

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
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                if (crankTimerRef.current) clearInterval(crankTimerRef.current);
                crankTimerRef.current = null;
                setPowerState(originalState);
                return;
            }

            let crankVolts = 12.0;
            if (elapsed < 300) {
                crankVolts = 12.0 - (elapsed / 300) * 6.0;
            } else if (elapsed < 1000) {
                crankVolts = 6.0 + (Math.random() * 1.0);
            } else {
                const progress = (elapsed - 1000) / 500;
                crankVolts = 7.0 + progress * (targetVoltage - 7.0);
            }

            setVoltage(crankVolts);
            setCurrent(8.0 + (Math.random() * 2.0));
        }, 50);
    }, [powerState, targetVoltage]);

    const simulateResetVoltageProfile = useCallback((type: 'hard' | 'keyOffOn') => {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

        if (type === 'hard') {
            setVoltage(8.0);
            setCurrent(3.0);
            resetTimerRef.current = setTimeout(() => {
                setVoltage(targetVoltage);
                setCurrent(0.5);
                resetTimerRef.current = null;
            }, 200);
        } else if (type === 'keyOffOn') {
            const previousState = powerState === 'OFF' ? 'ON' : powerState;
            setPowerState('OFF');
            setVoltage(0);
            setCurrent(0);
            resetTimerRef.current = setTimeout(() => {
                setPowerState(previousState);
                setVoltage(targetVoltage);
                setCurrent(0.5);
                resetTimerRef.current = null;
            }, 5000);
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

    const value = useMemo(() => ({
        voltage,
        current,
        ecuPower,
        systemVoltage,
        targetVoltage,
        currentLimit,
        powerState,
        faultState,
        rpsEnabled,
        rpsPowerDownTime,
        rpsCountdown,
        toggleEcuPower,
        setPowerState,
        setSystemVoltage,
        setTargetVoltage,
        setCurrentLimit,
        setFaultState,
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
        powerState,
        faultState,
        rpsEnabled,
        rpsPowerDownTime,
        rpsCountdown,
        toggleEcuPower,
        simulateCranking,
        triggerRpsPowerDown,
        simulateResetVoltageProfile,
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
