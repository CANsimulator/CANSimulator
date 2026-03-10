/**
 * CAN Protocol Types (ISO 11898-1)
 * Standard, Extended, and FD Frame structures
 *
 * Note: Using const objects instead of enums to satisfy
 * `erasableSyntaxOnly` in tsconfig.app.json.
 */

// ----------------------------------------------------------------
// Frame type discriminants
// ----------------------------------------------------------------
export const CANFrameType = {
    STANDARD: 'STANDARD',
    EXTENDED: 'EXTENDED',
    FD: 'FD',
    ERROR: 'ERROR',
    REMOTE: 'REMOTE',
} as const;
export type CANFrameType = typeof CANFrameType[keyof typeof CANFrameType];

// ----------------------------------------------------------------
// CAN Frames
// ----------------------------------------------------------------
export interface CANBaseFrame {
    id: number;       // 11-bit (Standard) or 29-bit (Extended)
    dlc: number;       // 0-15 (FD DLC maps to 0-64 bytes)
    data: Uint8Array;
    timestamp: number;
    isExtended?: boolean;      // IDE bit
    isRTR?: boolean;      // Remote Transmission Request
}

export interface CANFrame extends CANBaseFrame {
    type: 'STANDARD' | 'EXTENDED';
}

export interface CANFDFrame extends CANBaseFrame {
    type: 'FD';
    brs: boolean;   // Bit Rate Switch
    esi: boolean;   // Error State Indicator
}

export interface CANErrorFrame {
    type: 'ERROR';
    errorCode: CANErrorCode;
    timestamp: number;
}

// ----------------------------------------------------------------
// Error codes
// ----------------------------------------------------------------
export const CANErrorCode = {
    STUFF: 'STUFF',
    FORM: 'FORM',
    ACK: 'ACK',
    BIT1: 'BIT1',
    BIT0: 'BIT0',
    CRC: 'CRC',
} as const;
export type CANErrorCode = typeof CANErrorCode[keyof typeof CANErrorCode];

// ----------------------------------------------------------------
// DLC → Data Length mapping (ISO 11898-1:2015 Table 1)
// ----------------------------------------------------------------
export const DLC_MAP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 32, 48, 64] as const;

export function dlcToLength(dlc: number): number {
    if (dlc <= 8) return dlc;
    return DLC_MAP[dlc] ?? 64;
}

export function lengthToDlc(length: number): number {
    if (length <= 8) return length;
    if (length <= 12) return 9;
    if (length <= 16) return 10;
    if (length <= 20) return 11;
    if (length <= 24) return 12;
    if (length <= 32) return 13;
    if (length <= 48) return 14;
    return 15;
}

// ----------------------------------------------------------------
// Controller state
// ----------------------------------------------------------------
export const CANControllerState = {
    ERROR_ACTIVE: 'ERROR_ACTIVE',
    ERROR_PASSIVE: 'ERROR_PASSIVE',
    BUS_OFF: 'BUS_OFF',
} as const;
export type CANControllerState = typeof CANControllerState[keyof typeof CANControllerState];

// ----------------------------------------------------------------
// Node config
// ----------------------------------------------------------------
export interface CANNodeConfig {
    id: string;
    name: string;
    bitrate: number;
    fdEnabled: boolean;
    dataBitrate?: number;
}
