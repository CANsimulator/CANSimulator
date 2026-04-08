import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type FaultState = 'NONE' | 'H-L-SHORT' | 'H-GND-SHORT' | 'L-GND-SHORT' | 'TERMINATION-MISSING' | 'REFLECTIONS' | 'SHORT_GND' | 'OPEN_CIRCUIT';

interface TestBenchProps {
    // State
    onlineNodeCount: number;
    totalNodeCount: number;
    terminationLeft: boolean;
    terminationRight: boolean;
    isArmed: boolean;
    faultState: FaultState;
    transceiverActive: boolean;
    busLoad: number;
    supplyVoltage: number;
    baudRate: number;
    signalDegradation: number;
    maxStubLength: number;
    powerState: 'OFF' | 'ON' | 'CRANKING';

    // Setters / Actions
    setOnlineNodeCount: (n: number) => void;
    setTerminationLeft: (ok: boolean) => void;
    setTerminationRight: (ok: boolean) => void;
    setArmed: (armed: boolean) => void;
    setFault: (f: FaultState) => void;
    setTransceiver: (active: boolean) => void;
    setSupplyVoltage: (v: number) => void;
    setBaudRate: (b: number) => void;
    setSignalDegradation: (d: number) => void;
    setBusLoad: (load: number) => void;
    setMaxStubLength: (len: number) => void;
    setPowerState: (state: 'OFF' | 'ON' | 'CRANKING') => void;
    
    // Complex Actions
    applyBitTimingPreset: (baud: string) => void;
    resetEyeBuffer: () => void;
}

const TestBenchContext = createContext<TestBenchProps | undefined>(undefined);

export const TestBenchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [onlineNodeCount, setOnlineNodeCount] = useState(6);
    const [totalNodeCount] = useState(12);
    const [terminationLeft, setTerminationLeft] = useState(true);
    const [terminationRight, setTerminationRight] = useState(true);
    const [isArmed, setArmed] = useState(false);
    const [faultState, setFault] = useState<FaultState>('NONE');
    const [transceiverActive, setTransceiver] = useState(true);
    const [busLoad, setBusLoad] = useState(38);
    const [supplyVoltage, setSupplyVoltage] = useState(12.4);
    const [baudRate, setBaudRate] = useState(500000);
    const [signalDegradation, setSignalDegradation] = useState(0.02);
    const [maxStubLength, setMaxStubLength] = useState(0.3);
    const [powerState, setPowerState] = useState<'OFF' | 'ON' | 'CRANKING'>('ON');

    const applyBitTimingPreset = useCallback((baud: string) => {
        const numericBaud = parseInt(baud.replace('k', '000').replace('M', '000000'));
        setBaudRate(numericBaud);
    }, []);

    const resetEyeBuffer = useCallback(() => {
        // Implementation for cleaning scope artifacts
        console.log("Scope Buffer Reset initiated.");
    }, []);

    // Simulated real-time dynamics
    useEffect(() => {
        if (powerState === 'OFF') {
            setTransceiver(false);
            setSupplyVoltage(0);
            return;
        }
        
        setTransceiver(true);
        
        const interval = setInterval(() => {
            // Supply drift
            setSupplyVoltage(prev => {
                const base = powerState === 'CRANKING' ? 6.2 : 12.4;
                const drift = (Math.random() - 0.5) * 0.1;
                return prev + (base - prev) * 0.2 + drift;
            });

            // Signal degradation based on termination
            if (!terminationLeft || !terminationRight) {
                setSignalDegradation(prev => Math.min(0.8, prev + 0.05));
            } else {
                setSignalDegradation(prev => Math.max(0.02, prev - 0.05));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [powerState, terminationLeft, terminationRight]);

    return (
        <TestBenchContext.Provider value={{
            onlineNodeCount,
            totalNodeCount,
            terminationLeft,
            terminationRight,
            isArmed,
            faultState,
            transceiverActive,
            busLoad,
            supplyVoltage,
            baudRate,
            signalDegradation,
            maxStubLength,
            powerState,
            setOnlineNodeCount,
            setTerminationLeft,
            setTerminationRight,
            setArmed,
            setFault,
            setTransceiver,
            setSupplyVoltage,
            setBaudRate,
            setSignalDegradation,
            setBusLoad,
            setMaxStubLength,
            setPowerState,
            applyBitTimingPreset,
            resetEyeBuffer
        }}>
            {children}
        </TestBenchContext.Provider>
    );
};

export const useTestBench = () => {
    const context = useContext(TestBenchContext);
    if (!context) throw new Error('useTestBench must be used within TestBenchProvider');
    return context;
};
