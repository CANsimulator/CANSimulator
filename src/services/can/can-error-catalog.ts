/**
 * CAN Error Type Catalog & Demo Generator
 *
 * Pure data/logic module — no UI dependencies.
 * Provides structured definitions for each ISO 11898-1 error type
 * and generates sample CAN frames demonstrating each error.
 *
 * Reference: ISO 11898-1:2015, CSS Electronics CAN Bus Errors Tutorial
 */

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

/** Standard CAN frame field ranges for visualization */
export interface FrameField {
    name: string;
    startBit: number;
    endBit: number;        // inclusive
    color: string;         // hex color for visualization
    abbrev: string;        // short label
}

/** Result of generating an error demo */
export interface ErrorDemoResult {
    correctBits: number[];
    corruptedBits: number[];
    errorBitIndices: number[];      // which bit(s) are corrupted
    fields: FrameField[];
    errorType: CANErrorType;
    explanation: string;
    whatHappens: string;            // consequence for the bus
}

/** The 5 CAN error types per ISO 11898-1 */
export type CANErrorType = 'BIT' | 'STUFF' | 'FORM' | 'ACK' | 'CRC';

/** Educational metadata for each error type */
export interface ErrorTypeInfo {
    type: CANErrorType;
    title: string;
    subtitle: string;
    detectedBy: 'Transmitter' | 'Receiver';
    isoReference: string;
    description: string;
    mechanism: string;
    realWorldCause: string;
    colorHex: string;
}

// ----------------------------------------------------------------
// Error Type Educational Catalog
// ----------------------------------------------------------------

export const ERROR_TYPE_CATALOG: ErrorTypeInfo[] = [
    {
        type: 'BIT',
        title: 'Bit Error',
        subtitle: 'Bit Monitoring',
        detectedBy: 'Transmitter',
        isoReference: 'ISO 11898-1 §12.4',
        description:
            'A transmitting node continuously monitors the bus level. If the bit level read back differs from what was sent, a Bit Error is detected. Exceptions: no Bit Error during arbitration (ID field) or when sending a recessive ACK slot that gets overwritten by a dominant ACK.',
        mechanism:
            'TX sends recessive (1) → bus reads dominant (0), or TX sends dominant (0) → bus reads recessive (1).',
        realWorldCause:
            'Physical layer faults (broken termination, EMI/noise), transceiver damage, or ground offset between nodes.',
        colorHex: '#ef4444',
    },
    {
        type: 'STUFF',
        title: 'Bit Stuffing Error',
        subtitle: 'Stuff Rule Violation',
        detectedBy: 'Receiver',
        isoReference: 'ISO 11898-1 §10.5',
        description:
            'CAN requires a "stuff bit" (complement) after every 5 consecutive identical bits to maintain synchronization. If a receiver detects 6 or more consecutive bits of the same polarity within the stuffed region (SOF through CRC), it raises a Bit Stuffing Error.',
        mechanism:
            'Receiver sees 6 consecutive identical bits → violates the 5-bit stuffing rule.',
        realWorldCause:
            'Bit errors corrupting stuff bits, noise causing bit flips, or a transmitter stuck in a fault condition.',
        colorHex: '#eab308',
    },
    {
        type: 'FORM',
        title: 'Form Error',
        subtitle: 'Fixed-Field Violation',
        detectedBy: 'Receiver',
        isoReference: 'ISO 11898-1 §12.4',
        description:
            'Certain CAN frame fields must always have a fixed logical value: SOF must be dominant (0), CRC delimiter must be recessive (1), ACK delimiter must be recessive (1), and the entire 7-bit EOF must be recessive (1). If any of these contain an invalid value, a Form Error is raised.',
        mechanism:
            'A fixed-form field (SOF, CRC delim, ACK delim, or EOF) has the wrong bit polarity.',
        realWorldCause:
            'Message corruption, bus contention during the EOF field, or hardware faults in the transmitter\'s protocol engine.',
        colorHex: '#3b82f6',
    },
    {
        type: 'ACK',
        title: 'ACK Error',
        subtitle: 'Missing Acknowledgement',
        detectedBy: 'Transmitter',
        isoReference: 'ISO 11898-1 §12.4',
        description:
            'After transmitting a frame, the transmitter sends a recessive (1) bit in the ACK slot. All receivers that successfully received the frame override this with a dominant (0) bit. If the transmitter still reads recessive in the ACK slot, it means no node acknowledged the frame — an ACK Error.',
        mechanism:
            'TX sends recessive ACK slot → no receiver overrides with dominant → ACK slot stays recessive.',
        realWorldCause:
            'Node is alone on the bus, all other nodes are Bus-Off, CAN-H/CAN-L wiring issues, or all receivers detected errors and refused to ACK.',
        colorHex: '#06b6d4',
    },
    {
        type: 'CRC',
        title: 'CRC Error',
        subtitle: 'Checksum Mismatch',
        detectedBy: 'Receiver',
        isoReference: 'ISO 11898-1 §12.4',
        description:
            'Every CAN frame includes a 15-bit CRC (Cyclic Redundancy Check) computed by the transmitter over the SOF, arbitration, control, and data fields. Each receiver independently computes the same CRC. If the computed value doesn\'t match the transmitted CRC field, a CRC Error is raised.',
        mechanism:
            'Receiver computes CRC over received bits → result ≠ CRC field in the frame.',
        realWorldCause:
            'Bit corruption during transmission (EMI, poor wiring), intermittent contact issues, or a faulty transceiver altering bit values.',
        colorHex: '#a855f7',
    },
];

// ----------------------------------------------------------------
// Standard CAN Frame Template (simplified 44-bit representation)
// ----------------------------------------------------------------
// We use a simplified frame layout for educational visualization:
//   SOF(1) | ID(11) | RTR(1) | IDE(1) | R0(1) | DLC(4) | DATA(16) | CRC(15) | CRC_DEL(1) | ACK(1) | ACK_DEL(1) | EOF(7)
// Total = 60 bits (simplified, no bit stuffing applied yet)

const FRAME_FIELDS: FrameField[] = [
    { name: 'Start of Frame', abbrev: 'SOF', startBit: 0, endBit: 0, color: '#00f3ff' },
    { name: 'Identifier', abbrev: 'ID', startBit: 1, endBit: 11, color: '#ffffff' },
    { name: 'Remote TX Request', abbrev: 'RTR', startBit: 12, endBit: 12, color: '#94a3b8' },
    { name: 'ID Extension', abbrev: 'IDE', startBit: 13, endBit: 13, color: '#94a3b8' },
    { name: 'Reserved', abbrev: 'R0', startBit: 14, endBit: 14, color: '#64748b' },
    { name: 'Data Length Code', abbrev: 'DLC', startBit: 15, endBit: 18, color: '#00ff9f' },
    { name: 'Data Field', abbrev: 'DATA', startBit: 19, endBit: 34, color: '#f59e0b' },
    { name: 'CRC Sequence', abbrev: 'CRC', startBit: 35, endBit: 49, color: '#a855f7' },
    { name: 'CRC Delimiter', abbrev: 'CRC_D', startBit: 50, endBit: 50, color: '#a855f7' },
    { name: 'ACK Slot', abbrev: 'ACK', startBit: 51, endBit: 51, color: '#06b6d4' },
    { name: 'ACK Delimiter', abbrev: 'ACK_D', startBit: 52, endBit: 52, color: '#06b6d4' },
    { name: 'End of Frame', abbrev: 'EOF', startBit: 53, endBit: 59, color: '#3b82f6' },
];

/**
 * Generate a "correct" sample CAN frame as a bit array.
 * Uses a deterministic sample message: ID=0x123, DLC=2, Data=0xAB,0xCD
 */
function generateCorrectFrame(): number[] {
    const bits: number[] = new Array(60).fill(0);

    // SOF = dominant (0)
    bits[0] = 0;

    // ID = 0x123 = 0b00100100011 (11 bits, MSB first)
    const id = 0x123;
    for (let i = 0; i < 11; i++) {
        bits[1 + i] = (id >> (10 - i)) & 1;
    }

    // RTR = 0 (data frame)
    bits[12] = 0;

    // IDE = 0 (standard frame)
    bits[13] = 0;

    // R0 = 0 (reserved, dominant)
    bits[14] = 0;

    // DLC = 2 = 0b0010 (4 bits, MSB first)
    const dlc = 2;
    for (let i = 0; i < 4; i++) {
        bits[15 + i] = (dlc >> (3 - i)) & 1;
    }

    // Data = 0xAB, 0xCD = 16 bits
    const dataBytes = [0xAB, 0xCD];
    for (let byteIdx = 0; byteIdx < 2; byteIdx++) {
        for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
            bits[19 + byteIdx * 8 + bitIdx] = (dataBytes[byteIdx] >> (7 - bitIdx)) & 1;
        }
    }

    // CRC — compute a simple CRC-15 over bits 0..34
    const crcValue = computeSimpleCRC15(bits.slice(0, 35));
    for (let i = 0; i < 15; i++) {
        bits[35 + i] = (crcValue >> (14 - i)) & 1;
    }

    // CRC Delimiter = recessive (1)
    bits[50] = 1;

    // ACK Slot = dominant (0) — indicates successful ACK
    bits[51] = 0;

    // ACK Delimiter = recessive (1)
    bits[52] = 1;

    // EOF = 7 recessive bits
    for (let i = 53; i <= 59; i++) {
        bits[i] = 1;
    }

    return bits;
}

/**
 * Simple CRC-15 computation for demo purposes.
 * Uses the CAN CRC polynomial: x^15 + x^14 + x^10 + x^8 + x^7 + x^4 + x^3 + 1
 * Polynomial = 0x4599
 */
function computeSimpleCRC15(bits: number[]): number {
    let crc = 0;
    for (const bit of bits) {
        const crcNext = ((crc >> 14) ^ bit) & 1;
        crc = (crc << 1) & 0x7FFF;
        if (crcNext) {
            crc ^= 0x4599;
        }
    }
    return crc;
}

// ----------------------------------------------------------------
// Error Demo Generators
// ----------------------------------------------------------------

function generateBitErrorDemo(): ErrorDemoResult {
    const correct = generateCorrectFrame();
    const corrupted = [...correct];

    // Simulate: TX sends bit 22 as 1 (recessive), bus reads 0 (dominant)
    // Pick a bit in the Data field
    const errorIdx = 22;
    corrupted[errorIdx] = corrupted[errorIdx] === 1 ? 0 : 1;

    return {
        correctBits: correct,
        corruptedBits: corrupted,
        errorBitIndices: [errorIdx],
        fields: FRAME_FIELDS,
        errorType: 'BIT',
        explanation:
            `The transmitter sent ${correct[errorIdx] === 1 ? 'recessive (1)' : 'dominant (0)'} at bit ${errorIdx} (Data field), but the bus-level readback showed ${corrupted[errorIdx] === 1 ? 'recessive (1)' : 'dominant (0)'}. This mismatch triggers a Bit Error. The transmitter immediately raises an error flag.`,
        whatHappens:
            'The transmitter abandons the current frame, raises an Active Error Flag (6 dominant bits), and increments TEC by 8. All other nodes discard the frame.',
    };
}

function generateStuffErrorDemo(): ErrorDemoResult {
    const correct = generateCorrectFrame();
    const corrupted = [...correct];

    // Create a bit stuffing violation: force 6 consecutive 0s in the ID field
    // Normally after 5 identical bits, a stuff bit (complement) must appear
    const stuffStart = 1; // Start of ID field
    for (let i = 0; i < 6; i++) {
        corrupted[stuffStart + i] = 0; // Force 6 consecutive dominant bits
    }

    const errorIndices = [stuffStart + 5]; // The 6th bit is where the violation is detected

    return {
        correctBits: correct,
        corruptedBits: corrupted,
        errorBitIndices: errorIndices,
        fields: FRAME_FIELDS,
        errorType: 'STUFF',
        explanation:
            `After 5 consecutive dominant (0) bits starting at bit ${stuffStart}, the CAN standard requires a stuff bit of the opposite polarity (recessive = 1). Instead, a 6th dominant bit was detected at bit ${stuffStart + 5}. This violates the bit stuffing rule.`,
        whatHappens:
            'All receivers detect the stuffing violation and raise error flags. The frame is destroyed and the transmitter must retry. Receivers increment REC by 1.',
    };
}

function generateFormErrorDemo(): ErrorDemoResult {
    const correct = generateCorrectFrame();
    const corrupted = [...correct];

    // Corrupt the EOF field: make bit 55 dominant (0) instead of recessive (1)
    const errorIdx = 55;
    corrupted[errorIdx] = 0; // EOF must be recessive (1)

    return {
        correctBits: correct,
        corruptedBits: corrupted,
        errorBitIndices: [errorIdx],
        fields: FRAME_FIELDS,
        errorType: 'FORM',
        explanation:
            `The End of Frame (EOF) field requires all 7 bits to be recessive (1). At bit ${errorIdx}, a dominant (0) bit was detected instead. This constitutes a Form Error — a violation of the fixed-form field structure.`,
        whatHappens:
            'The receiver raises an error flag, the frame is discarded, and REC is incremented by 1. If the CRC delimiter or ACK delimiter are wrong, the same Form Error is detected.',
    };
}

function generateACKErrorDemo(): ErrorDemoResult {
    const correct = generateCorrectFrame();
    const corrupted = [...correct];

    // ACK slot stays recessive — no node acknowledged
    const errorIdx = 51;
    corrupted[errorIdx] = 1; // ACK slot remains recessive (no dominant override)

    return {
        correctBits: correct,
        corruptedBits: corrupted,
        errorBitIndices: [errorIdx],
        fields: FRAME_FIELDS,
        errorType: 'ACK',
        explanation:
            `The transmitter expects at least one receiver to override the ACK slot (bit ${errorIdx}) with a dominant (0) bit. The slot remained recessive (1), meaning no node on the bus acknowledged the frame. This is an ACK Error.`,
        whatHappens:
            'The transmitter raises an error flag and increments TEC by 8. Common cause: the node is alone on the bus, or all receivers are Bus-Off / detected their own errors.',
    };
}

function generateCRCErrorDemo(): ErrorDemoResult {
    const correct = generateCorrectFrame();
    const corrupted = [...correct];

    // Flip 2 bits in the CRC field to cause a mismatch
    const errorIndices = [38, 42];
    for (const idx of errorIndices) {
        corrupted[idx] = corrupted[idx] === 1 ? 0 : 1;
    }

    return {
        correctBits: correct,
        corruptedBits: corrupted,
        errorBitIndices: errorIndices,
        fields: FRAME_FIELDS,
        errorType: 'CRC',
        explanation:
            `The receiver independently computed the CRC-15 checksum over the received SOF, ID, control, and data fields. The result did not match the CRC field transmitted in bits 35–49. Specifically, bits ${errorIndices.join(' and ')} in the CRC sequence were incorrect.`,
        whatHappens:
            'The receiver raises an error flag after the ACK delimiter, the frame is discarded, and REC is incremented by 1. The transmitter will attempt to retransmit.',
    };
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/**
 * Generate a demo showing what a specific CAN error type looks like
 * at the bit level within a standard CAN frame.
 */
export function generateErrorDemo(errorType: CANErrorType): ErrorDemoResult {
    switch (errorType) {
        case 'BIT': return generateBitErrorDemo();
        case 'STUFF': return generateStuffErrorDemo();
        case 'FORM': return generateFormErrorDemo();
        case 'ACK': return generateACKErrorDemo();
        case 'CRC': return generateCRCErrorDemo();
        default: {
            const _exhaustive: never = errorType;
            throw new Error(`Unknown error type: ${_exhaustive}`);
        }
    }
}

/**
 * Get the educational info for a specific error type.
 */
export function getErrorTypeInfo(errorType: CANErrorType): ErrorTypeInfo {
    const info = ERROR_TYPE_CATALOG.find((e) => e.type === errorType);
    if (!info) throw new Error(`Unknown error type: ${errorType}`);
    return info;
}

/**
 * Get all frame field definitions.
 */
export function getFrameFields(): FrameField[] {
    return [...FRAME_FIELDS];
}
