// ============================================================
// CAN Protocol Core — Unit Tests (Vitest)
// Covers: DLC codec, CRC algorithms, bit stuffing
// Reference: ISO 11898-1:2015
// ============================================================

import { describe, it, expect } from 'vitest';
import { dlcToLength, lengthToDlc, DLC_MAP } from '../src/types/can';
import { calculateCRC15, calculateCRC17, calculateCRC21, applyBitStuffing } from '../src/services/can/can-crc';

// ----------------------------------------------------------------
// DLC Codec (ISO 11898-1:2015 Table 1)
// ----------------------------------------------------------------
describe('DLC Codec — dlcToLength', () => {
    it('should map DLC 0 through 8 directly to byte count (classic CAN identity range)', () => {
        for (let dlc = 0; dlc <= 8; dlc++) {
            expect(dlcToLength(dlc)).toBe(dlc);
        }
    });

    it('should map DLC 9 to 12 bytes per CAN FD table', () => {
        expect(dlcToLength(9)).toBe(12);
    });

    it('should map DLC 10 to 16 bytes per CAN FD table', () => {
        expect(dlcToLength(10)).toBe(16);
    });

    it('should map DLC 11 to 20 bytes per CAN FD table', () => {
        expect(dlcToLength(11)).toBe(20);
    });

    it('should map DLC 12 to 24 bytes per CAN FD table', () => {
        expect(dlcToLength(12)).toBe(24);
    });

    it('should map DLC 13 to 32 bytes per CAN FD table', () => {
        expect(dlcToLength(13)).toBe(32);
    });

    it('should map DLC 14 to 48 bytes per CAN FD table', () => {
        expect(dlcToLength(14)).toBe(48);
    });

    it('should map DLC 15 to 64 bytes (max CAN FD payload)', () => {
        expect(dlcToLength(15)).toBe(64);
    });

    it('should fall back to 64 bytes for out-of-range DLC values', () => {
        expect(dlcToLength(16)).toBe(64);
        expect(dlcToLength(255)).toBe(64);
    });
});

describe('DLC Codec — lengthToDlc', () => {
    it('should map byte counts 0-8 directly to matching DLC', () => {
        for (let len = 0; len <= 8; len++) {
            expect(lengthToDlc(len)).toBe(len);
        }
    });

    it('should round up to next valid FD DLC for intermediate byte counts', () => {
        expect(lengthToDlc(9)).toBe(9);   // 9 bytes -> DLC 9 (12 byte slot)
        expect(lengthToDlc(10)).toBe(9);  // 10 bytes -> DLC 9 (12 byte slot)
        expect(lengthToDlc(12)).toBe(9);  // 12 bytes -> DLC 9 (exact fit)
        expect(lengthToDlc(13)).toBe(10); // 13 bytes -> DLC 10 (16 byte slot)
        expect(lengthToDlc(17)).toBe(11); // 17 bytes -> DLC 11 (20 byte slot)
        expect(lengthToDlc(25)).toBe(13); // 25 bytes -> DLC 13 (32 byte slot)
        expect(lengthToDlc(33)).toBe(14); // 33 bytes -> DLC 14 (48 byte slot)
    });

    it('should return DLC 15 for any payload exceeding 48 bytes', () => {
        expect(lengthToDlc(49)).toBe(15);
        expect(lengthToDlc(64)).toBe(15);
        expect(lengthToDlc(1000)).toBe(15);
    });
});

describe('DLC Codec — round-trip integrity', () => {
    it('should survive a full round-trip for every valid FD payload size in DLC_MAP', () => {
        for (const expectedLength of DLC_MAP) {
            const dlc = lengthToDlc(expectedLength);
            const recoveredLength = dlcToLength(dlc);
            expect(recoveredLength).toBe(expectedLength);
        }
    });
});

// ----------------------------------------------------------------
// Bit Stuffing (ISO 11898-1 section 10.5)
// After 5 consecutive bits of the same polarity, a complement
// bit is inserted to maintain clock synchronization.
// ----------------------------------------------------------------
describe('Bit Stuffing — applyBitStuffing', () => {
    it('should return an empty array for empty input', () => {
        expect(applyBitStuffing([])).toEqual([]);
    });

    it('should not modify a stream shorter than 5 bits', () => {
        expect(applyBitStuffing([0, 0, 0, 0])).toEqual([0, 0, 0, 0]);
        expect(applyBitStuffing([1, 1, 1])).toEqual([1, 1, 1]);
    });

    it('should not insert stuff bits for alternating 0/1 pattern', () => {
        const input = [0, 1, 0, 1, 0, 1, 0, 1];
        expect(applyBitStuffing(input)).toEqual(input);
    });

    it('should insert a complement 1 after five consecutive 0s', () => {
        const input = [0, 0, 0, 0, 0, 1];
        const result = applyBitStuffing(input);
        // After five 0s, a stuff bit (1) is inserted, then the original 1 follows
        expect(result).toEqual([0, 0, 0, 0, 0, 1, 1]);
        expect(result[5]).toBe(1); // stuff bit
    });

    it('should insert a complement 0 after five consecutive 1s', () => {
        const input = [1, 1, 1, 1, 1, 0];
        const result = applyBitStuffing(input);
        expect(result).toEqual([1, 1, 1, 1, 1, 0, 0]);
        expect(result[5]).toBe(0); // stuff bit
    });

    it('should handle exactly 5 identical bits at the end of the stream', () => {
        const input = [0, 0, 0, 0, 0];
        const result = applyBitStuffing(input);
        // Stuff bit appended even at the end
        expect(result).toEqual([0, 0, 0, 0, 0, 1]);
    });

    it('should insert multiple stuff bits for long runs of identical bits', () => {
        // 10 zeros: [00000] stuff 1 [00000] stuff 1
        const input = Array(10).fill(0);
        const result = applyBitStuffing(input);
        expect(result.length).toBe(12); // 10 data + 2 stuff bits
        expect(result[5]).toBe(1);  // first stuff bit after 5 zeros
    });

    it('should always produce output longer than input when stuffing occurs', () => {
        const input = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]; // 10 ones
        const result = applyBitStuffing(input);
        expect(result.length).toBeGreaterThan(input.length);
    });

    it('should handle a realistic CAN SOF + arbitration field pattern', () => {
        // SOF (0) + ID 0x000 (eleven 0s) = twelve consecutive 0s
        const input = Array(12).fill(0);
        const result = applyBitStuffing(input);
        // At least 2 stuff bits expected (after bit 5 and later)
        expect(result.length).toBeGreaterThanOrEqual(14);
    });
});

// ----------------------------------------------------------------
// CRC-15 (Standard CAN)
// Generator polynomial: 0x4599
// ----------------------------------------------------------------
describe('CRC-15 — Standard CAN', () => {
    it('should return 0 for an empty bit stream', () => {
        expect(calculateCRC15([])).toBe(0);
    });

    it('should return a value within the valid 15-bit range [0, 0x7FFF]', () => {
        const crc = calculateCRC15([1, 0, 1, 0, 1, 0, 1, 0]);
        expect(crc).toBeGreaterThanOrEqual(0);
        expect(crc).toBeLessThanOrEqual(0x7FFF);
    });

    it('should be deterministic — same input always yields same CRC', () => {
        const bits = [1, 1, 0, 0, 1, 0, 1, 1, 0, 0];
        expect(calculateCRC15(bits)).toBe(calculateCRC15(bits));
    });

    it('should produce different CRCs for different inputs', () => {
        const crc1 = calculateCRC15([0, 0, 0, 0, 0, 0, 0, 0]);
        const crc2 = calculateCRC15([1, 1, 1, 1, 1, 1, 1, 1]);
        expect(crc1).not.toBe(crc2);
    });

    it('should detect a single-bit flip (Hamming distance property)', () => {
        const original = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
        const flipped = [...original];
        flipped[5] = flipped[5] === 0 ? 1 : 0;

        expect(calculateCRC15(original)).not.toBe(calculateCRC15(flipped));
    });

    it('should return 0 for a single zero bit', () => {
        expect(calculateCRC15([0])).toBe(0);
    });
});

// ----------------------------------------------------------------
// CRC-17 (CAN FD, payload <= 16 bytes)
// Generator polynomial: 0x1685B
// ----------------------------------------------------------------
describe('CRC-17 — CAN FD (small payload)', () => {
    it('should return a value within the valid 17-bit range [0, 0x1FFFF]', () => {
        const crc = calculateCRC17([1, 0, 1, 0, 1, 0, 1, 0]);
        expect(crc).toBeGreaterThanOrEqual(0);
        expect(crc).toBeLessThanOrEqual(0x1FFFF);
    });

    it('should be deterministic — same input always yields same CRC', () => {
        const bits = [0, 1, 0, 0, 1, 0, 1, 1];
        expect(calculateCRC17(bits)).toBe(calculateCRC17(bits));
    });

    it('should produce different CRCs for different inputs', () => {
        const crc1 = calculateCRC17([0, 0, 0, 0]);
        const crc2 = calculateCRC17([1, 1, 1, 1]);
        expect(crc1).not.toBe(crc2);
    });

    it('should detect a single-bit error', () => {
        const original = [1, 1, 0, 0, 1, 0, 1, 0, 0, 1];
        const corrupted = [...original];
        corrupted[3] = corrupted[3] === 0 ? 1 : 0;

        expect(calculateCRC17(original)).not.toBe(calculateCRC17(corrupted));
    });
});

// ----------------------------------------------------------------
// CRC-21 (CAN FD, payload > 16 bytes)
// Generator polynomial: 0x102899
// ----------------------------------------------------------------
describe('CRC-21 — CAN FD (large payload)', () => {
    it('should return a value within the valid 21-bit range [0, 0x1FFFFF]', () => {
        const crc = calculateCRC21([1, 0, 1, 0, 1, 0, 1, 0]);
        expect(crc).toBeGreaterThanOrEqual(0);
        expect(crc).toBeLessThanOrEqual(0x1FFFFF);
    });

    it('should be deterministic — same input always yields same CRC', () => {
        const bits = [1, 1, 1, 0, 0, 0, 1, 0];
        expect(calculateCRC21(bits)).toBe(calculateCRC21(bits));
    });

    it('should produce different CRCs for different inputs', () => {
        const crc1 = calculateCRC21([0, 0, 0, 0, 0, 0, 0, 0]);
        const crc2 = calculateCRC21([0, 0, 0, 0, 0, 0, 0, 1]);
        expect(crc1).not.toBe(crc2);
    });

    it('should detect a single-bit error in a long bitstream', () => {
        const original = Array(128).fill(0).map((_, i) => i % 3 === 0 ? 1 : 0);
        const corrupted = [...original];
        corrupted[64] = corrupted[64] === 0 ? 1 : 0;

        expect(calculateCRC21(original)).not.toBe(calculateCRC21(corrupted));
    });
});

// ----------------------------------------------------------------
// Cross-CRC comparison
// ----------------------------------------------------------------
describe('CRC algorithms — cross-variant independence', () => {
    it('should produce different CRC values from CRC-15, CRC-17, CRC-21 for the same input', () => {
        const bits = [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1];
        const crc15 = calculateCRC15(bits);
        const crc17 = calculateCRC17(bits);
        const crc21 = calculateCRC21(bits);

        // All three use different polynomials and widths so results must differ
        const values = new Set([crc15, crc17, crc21]);
        expect(values.size).toBe(3);
    });
});
