import type { DemoFrame } from './types';

export interface ProtocolSegment {
    label: string;
    bits: number;
    color: string;
    cls: string;
}

export const CAN_STD_SEGMENTS: ProtocolSegment[] = [
    { label: 'SOF',  bits: 1,  color: 'var(--ch1)', cls: 'sof' },
    { label: 'ID 0x0C9', bits: 11, color: 'var(--ch2)', cls: 'id' },
    { label: 'RTR',  bits: 1,  color: '#a855f7',    cls: 'rtr' },
    { label: 'IDE',  bits: 1,  color: '#ec4899',    cls: 'ide' },
    { label: 'r0',   bits: 1,  color: 'rgba(255,255,255,0.2)', cls: 'r0' },
    { label: 'DLC 8', bits: 4,  color: 'var(--warn)', cls: 'dlc' },
    { label: 'DATA 1A 6B 00 00 20 4F FF 1C', bits: 64, color: 'var(--ok)', cls: 'data' },
    { label: 'CRC 0x3A28', bits: 15, color: '#8b5cf6', cls: 'crc' },
    { label: 'DEL',  bits: 1,  color: 'rgba(255,255,255,0.1)', cls: 'del' },
    { label: 'ACK',  bits: 1,  color: 'var(--ok)',   cls: 'ack' },
    { label: 'DEL',  bits: 1,  color: 'rgba(255,255,255,0.1)', cls: 'del' },
    { label: 'EOF',  bits: 7,  color: 'rgba(255,255,255,0.2)', cls: 'eof' },
    { label: 'IFS',  bits: 3,  color: 'rgba(255,255,255,0.1)', cls: 'ifs' },
];

// ── Per-bit field mapping ─────────────────────────────────────────────────────

/** Associates every raw (pre-stuff) bit index with its protocol field */
export interface BitFieldMapping {
    /** Index within the raw bit array */
    bitIndex: number;
    /** The field this bit belongs to */
    fieldLabel: string;
    /** Short field key */
    fieldCls: string;
    /** CSS color for this field */
    fieldColor: string;
    /** Position of this bit within its field (0-based) */
    positionInField: number;
    /** Total bits in this field */
    fieldTotalBits: number;
    /** The raw logical bit value (0 or 1, pre-inversion) */
    logicalBit: number;
}

/**
 * Generates a full bit pattern for a CAN frame based on segments.
 */
export function getCanBitPattern(): number[] {
    const pattern: number[] = [];
    
    // SOF is dominant (0)
    pattern.push(0); 

    // ID (0x0C9 -> 000 1100 1001) - 11 bits
    const id = [0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1];
    pattern.push(...id);

    // Control (RTR=0, IDE=0, r0=0)
    pattern.push(0, 0, 0);

    // DLC (8 -> 1000)
    pattern.push(1, 0, 0, 0);

    // DATA (First two bytes: 1A 6B -> 0001 1010, 0110 1011)
    // For the sake of the pattern, we'll just fill some bits
    const data = [
        0, 0, 0, 1, 1, 0, 1, 0, // 0x1A
        0, 1, 1, 0, 1, 0, 1, 1, // 0x6B
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 0, 0, 0, 0, 0, // 0x20
        0, 1, 0, 0, 1, 1, 1, 1, // 0x4F
        1, 1, 1, 1, 1, 1, 1, 1, // 0xFF
        0, 0, 0, 1, 1, 1, 0, 0, // 0x1C
    ];
    pattern.push(...data);

    // CRC (Simplified CRC-15)
    const crc = [1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0];
    pattern.push(...crc);

    // CRC Delimiter (Recessive 1)
    pattern.push(1);

    // ACK Slot (Dominant 0)
    pattern.push(0);

    // ACK Delimiter (Recessive 1)
    pattern.push(1);

    // EOF (7 bits recessive)
    for (let i = 0; i < 7; i++) pattern.push(1);

    // IFS (3 bits recessive)
    for (let i = 0; i < 3; i++) pattern.push(1);

    // Note: CAN is active-low (0 is dominant, 1 is recessive)
    // But for the sake of the wave generator, we return 1 for dominant and 0 for recessive 
    // to match the previous implementation's 'b' logic where b=1 meant high voltage diff.
    // Wait, in CAN, dominant (0) means H=3.5, L=1.5 (Vdiff=2), recessive (1) means H=2.5, L=2.5 (Vdiff=0).
    // So 0 (dominant) should return 1 (for Vdiff calculation), and 1 (recessive) should return 0.
    
    return pattern.map(b => b === 0 ? 1 : 0);
}

export const CAN_FULL_PATTERN = getCanBitPattern();

// ── Logical bit array (pre-inversion, true CAN logical values) ────────────────

/** Returns the raw logical CAN bits (0=dominant, 1=recessive) without the waveform inversion */
function getLogicalBits(): number[] {
    const bits: number[] = [];
    bits.push(0);                                             // SOF
    bits.push(0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1);           // ID
    bits.push(0, 0, 0);                                       // RTR, IDE, r0
    bits.push(1, 0, 0, 0);                                    // DLC
    bits.push(
        0, 0, 0, 1, 1, 0, 1, 0,   // 0x1A
        0, 1, 1, 0, 1, 0, 1, 1,   // 0x6B
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 0, 0, 0, 0, 0,   // 0x20
        0, 1, 0, 0, 1, 1, 1, 1,   // 0x4F
        1, 1, 1, 1, 1, 1, 1, 1,   // 0xFF
        0, 0, 0, 1, 1, 1, 0, 0,   // 0x1C
    );
    bits.push(1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0); // CRC
    bits.push(1);                                              // CRC DEL
    bits.push(0);                                              // ACK
    bits.push(1);                                              // ACK DEL
    for (let i = 0; i < 7; i++) bits.push(1);                 // EOF
    for (let i = 0; i < 3; i++) bits.push(1);                 // IFS
    return bits;
}

export const CAN_LOGICAL_BITS = getLogicalBits();

// ── Per-bit field mapping ─────────────────────────────────────────────────────

export function buildBitFieldMap(): BitFieldMapping[] {
    const map: BitFieldMapping[] = [];
    let bitIdx = 0;
    for (const seg of CAN_STD_SEGMENTS) {
        for (let p = 0; p < seg.bits; p++) {
            map.push({
                bitIndex: bitIdx,
                fieldLabel: seg.label,
                fieldCls: seg.cls,
                fieldColor: seg.color,
                positionInField: p,
                fieldTotalBits: seg.bits,
                logicalBit: CAN_LOGICAL_BITS[bitIdx] ?? 0,
            });
            bitIdx++;
        }
    }
    return map;
}

export const CAN_BIT_FIELD_MAP = buildBitFieldMap();

// ── Bit-stuffing detection ────────────────────────────────────────────────────

/** Marker for a bit-stuff event */
export interface BitStuffMarker {
    /** Position in the raw bit stream where the stuff bit would be inserted */
    afterBitIndex: number;
    /** The value of the stuff bit (opposite of the 5 consecutive same bits) */
    stuffBitValue: number;
}

/**
 * Detects positions where CAN bit-stuffing would occur.
 * In CAN, after 5 consecutive bits of the same polarity, a stuff bit of
 * opposite polarity is inserted. Bit stuffing applies to SOF through CRC
 * (not to CRC delimiter, ACK, EOF, IFS).
 */
export function detectBitStuffing(): BitStuffMarker[] {
    // Stuffing region: SOF (1) + ID (11) + RTR (1) + IDE (1) + r0 (1) + DLC (4) + DATA (64) + CRC (15) = 98 bits
    const stuffRegionEnd = 1 + 11 + 1 + 1 + 1 + 4 + 64 + 15; // 98
    const markers: BitStuffMarker[] = [];
    
    let consecutiveCount = 1;
    
    for (let i = 1; i < stuffRegionEnd && i < CAN_LOGICAL_BITS.length; i++) {
        if (CAN_LOGICAL_BITS[i] === CAN_LOGICAL_BITS[i - 1]) {
            consecutiveCount++;
        } else {
            consecutiveCount = 1;
        }
        
        if (consecutiveCount >= 5) {
            // After 5 consecutive same-value bits, a stuff bit is inserted
            const stuffValue = CAN_LOGICAL_BITS[i] === 0 ? 1 : 0;
            markers.push({
                afterBitIndex: i,
                stuffBitValue: stuffValue,
            });
            // The stuff bit resets the consecutive counter
            consecutiveCount = 1;
        }
    }
    
    return markers;
}

export const CAN_BIT_STUFF_MARKERS = detectBitStuffing();

// ── Segment boundary info for rendering ───────────────────────────────────────

export interface SegmentBoundary {
    startBit: number;
    endBit: number;
    label: string;
    shortLabel: string;
    cls: string;
    color: string;
    bits: number;
}

export function getSegmentBoundaries(): SegmentBoundary[] {
    const boundaries: SegmentBoundary[] = [];
    let bitIdx = 0;
    for (const seg of CAN_STD_SEGMENTS) {
        // Create short labels for narrow segments
        let shortLabel = seg.label;
        if (seg.label.startsWith('ID ')) shortLabel = 'ID';
        else if (seg.label.startsWith('DLC ')) shortLabel = 'DLC';
        else if (seg.label.startsWith('DATA ')) shortLabel = 'DATA';
        else if (seg.label.startsWith('CRC ')) shortLabel = 'CRC';
        
        boundaries.push({
            startBit: bitIdx,
            endBit: bitIdx + seg.bits - 1,
            label: seg.label,
            shortLabel,
            cls: seg.cls,
            color: seg.color,
            bits: seg.bits,
        });
        bitIdx += seg.bits;
    }
    return boundaries;
}

export const CAN_SEGMENT_BOUNDARIES = getSegmentBoundaries();

/** Cycle duration in microseconds for the full CAN pattern (111 bits @ 500kbps) */
export const CAN_CYCLE_US = 222;

export const DEMO_FRAMES: DemoFrame[] = [
    { id: '0x0C9', fmt: 'STD', dlc: 8, data: [0x1A, 0x6B, 0x00, 0x00, 0x20, 0x4F, 0xFF, 0x1C], ts: 120,  status: 'ok',   name: 'Engine RPM' },
    { id: '0x244', fmt: 'STD', dlc: 4, data: [0x80, 0x00, 0x12, 0x5E],                         ts: 1180, status: 'ok',   name: 'Steering Angle' },
    { id: '0x1A4', fmt: 'STD', dlc: 8, data: [0x00, 0x00, 0x03, 0xE8, 0x00, 0x00, 0x03, 0xE8], ts: 2340, status: 'ok',   name: 'Wheel Speed FL/FR' },
    { id: '0x620', fmt: 'EXT', dlc: 8, data: [0x55, 0x02, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00], ts: 3510, status: 'warn', name: 'Diagnostic UDS' },
    { id: '0x0C9', fmt: 'STD', dlc: 8, data: [0x1B, 0x0C, 0x00, 0x00, 0x20, 0x4F, 0xFF, 0x1C], ts: 4780, status: 'ok',   name: 'Engine RPM' },
    { id: '0x3D4', fmt: 'STD', dlc: 6, data: [0x01, 0x00, 0x7F, 0xFE, 0x00, 0x02],             ts: 5920, status: 'ok',   name: 'Body CAN Status' },
    { id: '0x7E0', fmt: 'EXT', dlc: 8, data: [0x03, 0x22, 0xF1, 0x90, 0x00, 0x00, 0x00, 0x00], ts: 7100, status: 'ok',   name: 'ECU Query' },
    { id: '0x0C9', fmt: 'STD', dlc: 8, data: [0x1C, 0x42, 0x00, 0x00, 0x20, 0x4F, 0xFF, 0x1C], ts: 8260, status: 'err',  name: 'Engine RPM' },
    { id: '0x244', fmt: 'STD', dlc: 4, data: [0x80, 0x00, 0x11, 0x9A],                         ts: 9420, status: 'ok',   name: 'Steering Angle' },
];
