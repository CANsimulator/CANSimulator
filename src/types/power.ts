/**
 * Power System Type Definitions
 * Adapted from UDS-SIMULATION for CAN-Simulator
 */

export type PowerState = 'OFF' | 'ACC' | 'ON' | 'CRANKING';
export type FaultState = 'NONE' | 'SHORT_GND' | 'OPEN_CIRCUIT';
export type SystemVoltage = 12 | 24;

export interface PowerContextType {
    voltage: number;
    current: number;
    ecuPower: boolean;
    systemVoltage: SystemVoltage;
    targetVoltage: number;
    currentLimit: number;
    powerState: PowerState;
    faultState: FaultState;
    rpsEnabled: boolean;
    rpsPowerDownTime: number;
    rpsCountdown: number | null;

    toggleEcuPower: () => void;
    setPowerState: (state: PowerState) => void;
    setSystemVoltage: (volts: SystemVoltage) => void;
    setTargetVoltage: (volts: number) => void;
    setCurrentLimit: (amps: number) => void;
    setFaultState: (fault: FaultState) => void;
    simulateCranking: () => void;
    setVoltage: (volts: number) => void;
    setCurrent: (amps: number) => void;
    triggerRpsPowerDown: () => void;
    setRpsPowerDownTime: (time: number) => void;
    simulateResetVoltageProfile: (type: 'hard' | 'keyOffOn') => void;
}
