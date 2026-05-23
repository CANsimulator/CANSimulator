/**
 * CAN Bus simulation types and utility functions.
 * Centralized for consistency across the simulator.
 */

export type CANFrameType = 'STANDARD' | 'EXTENDED' | 'FD';
export type CANErrorCode = 'STUFF' | 'FORM' | 'ACK' | 'BIT1' | 'BIT0' | 'CRC' | 'OTHER';
export type CANControllerState = 'ERROR_ACTIVE' | 'ERROR_PASSIVE' | 'BUS_OFF';
export type ISOStatus = 'PASS' | 'FAIL' | 'WARN';

export interface CANFrame {
    id: number;
    dlc: number;
    data: Uint8Array;
    type: 'STANDARD' | 'EXTENDED';
    timestamp: number;
}

export interface CANFDFrame {
    id: number;
    dlc: number;
    data: Uint8Array;
    type: 'FD';
    brs: boolean;
    esi: boolean;
    timestamp: number;
}

/**
 * Oscilloscope simulation types
 */
export interface Sample {
    canh: number; 
    canl: number; 
    isDominant: boolean; 
    bitIndex: number; 
    t: number;
}

export interface WaveState {
    frameBits: boolean[];
    frameBitIndex: number;
    globalSampleIndex: number;
}

export interface ChannelCfg { 
    enabled: boolean; 
    vdiv: number; 
    offset: number; 
    coupling: 'AC' | 'DC';
    bwLimit: boolean;
    color: string;
}

export const DLC_MAP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 32, 48, 64];

/**
 * CAN FD DLC to Data Length conversion table
 */
export function dlcToLength(dlc: number): number {
    if (dlc < 0 || dlc > 15) return 64;
    return DLC_MAP[dlc] ?? 64;
}

/**
 * Data Length to CAN FD DLC conversion
 */
export function lengthToDlc(len: number): number {
    if (len <= 8) return len;
    if (len <= 12) return 9;
    if (len <= 16) return 10;
    if (len <= 20) return 11;
    if (len <= 24) return 12;
    if (len <= 32) return 13;
    if (len <= 48) return 14;
    return 15;
}

