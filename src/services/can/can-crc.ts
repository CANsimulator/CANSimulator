/**
 * CAN Protocol CRC Calculations (ISO 11898-1:2015)
 */

/**
 * Standard CAN CRC-15
 * Generator: 0x4599
 */
export function calculateCRC15(bits: number[]): number {
    let crc = 0;
    for (const bit of bits) {
        const msb = (crc >> 14) & 1;
        crc = (crc << 1) & 0x7FFF;
        if (msb !== bit) crc ^= 0x4599;
    }
    return crc;
}

/**
 * CAN FD CRC-17 (payload ≤ 16 bytes)
 * Generator: 0x1685B
 */
export function calculateCRC17(bits: number[]): number {
    let crc = 1 << 16;
    for (const bit of bits) {
        const msb = (crc >> 16) & 1;
        crc = (crc << 1) & 0x1FFFF;
        if (msb !== bit) crc ^= 0x1685B;
    }
    return crc;
}

/**
 * CAN FD CRC-21 (payload > 16 bytes)
 * Generator: 0x102899
 */
export function calculateCRC21(bits: number[]): number {
    let crc = 1 << 20;
    for (const bit of bits) {
        const msb = (crc >> 20) & 1;
        crc = (crc << 1) & 0x1FFFFF;
        if (msb !== bit) crc ^= 0x102899;
    }
    return crc;
}

/**
 * Bit Stuffing (ISO 11898-1 §10.5)
 * Inserts a complement bit after 5 consecutive identical bits.
 */
export function applyBitStuffing(bits: number[]): number[] {
    const stuffed: number[] = [];
    let count = 0;
    let lastBit = -1;

    for (const bit of bits) {
        if (bit === lastBit) {
            count++;
        } else {
            count = 1;
            lastBit = bit;
        }
        stuffed.push(bit);
        if (count === 5) {
            const stuffBit = bit === 0 ? 1 : 0;
            stuffed.push(stuffBit);
            count = 1;
            lastBit = stuffBit;
        }
    }
    return stuffed;
}
