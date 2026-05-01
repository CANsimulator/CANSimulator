import { describe, it, expect } from 'vitest';
import {
    CAN_FULL_PATTERN,
    CAN_LOGICAL_BITS,
    CAN_BIT_FIELD_MAP,
    CAN_BIT_STUFF_MARKERS,
    CAN_SEGMENT_BOUNDARIES,
    CAN_STD_SEGMENTS,
    buildBitFieldMap,
    detectBitStuffing,
    getSegmentBoundaries,
} from '../src/components/can/scope/protocolUtils';

describe('protocolUtils', () => {
    describe('CAN_FULL_PATTERN', () => {
        it('should have the correct number of bits (sum of all segments)', () => {
            const totalBits = CAN_STD_SEGMENTS.reduce((sum, seg) => sum + seg.bits, 0);
            expect(CAN_FULL_PATTERN.length).toBe(totalBits);
        });

        it('should contain only 0 and 1 values', () => {
            for (const bit of CAN_FULL_PATTERN) {
                expect(bit === 0 || bit === 1).toBe(true);
            }
        });

        // SOF is dominant (0 logical → 1 in waveform pattern)
        it('first bit (SOF) should be 1 (dominant → high Vdiff)', () => {
            expect(CAN_FULL_PATTERN[0]).toBe(1);
        });
    });

    describe('CAN_LOGICAL_BITS', () => {
        it('should have same length as CAN_FULL_PATTERN', () => {
            expect(CAN_LOGICAL_BITS.length).toBe(CAN_FULL_PATTERN.length);
        });

        it('first bit (SOF) should be 0 (dominant)', () => {
            expect(CAN_LOGICAL_BITS[0]).toBe(0);
        });

        // EOF is 7 recessive bits → all 1s
        it('EOF bits should all be recessive (1)', () => {
            const eofStart = CAN_STD_SEGMENTS
                .slice(0, CAN_STD_SEGMENTS.findIndex(s => s.cls === 'eof'))
                .reduce((sum, seg) => sum + seg.bits, 0);
            for (let i = 0; i < 7; i++) {
                expect(CAN_LOGICAL_BITS[eofStart + i]).toBe(1);
            }
        });
    });

    describe('CAN_BIT_FIELD_MAP', () => {
        it('should have one entry per bit', () => {
            expect(CAN_BIT_FIELD_MAP.length).toBe(CAN_FULL_PATTERN.length);
        });

        it('first bit maps to SOF', () => {
            expect(CAN_BIT_FIELD_MAP[0].fieldCls).toBe('sof');
            expect(CAN_BIT_FIELD_MAP[0].positionInField).toBe(0);
            expect(CAN_BIT_FIELD_MAP[0].fieldTotalBits).toBe(1);
        });

        it('bits 1-11 map to ID field', () => {
            for (let i = 1; i <= 11; i++) {
                expect(CAN_BIT_FIELD_MAP[i].fieldCls).toBe('id');
                expect(CAN_BIT_FIELD_MAP[i].positionInField).toBe(i - 1);
            }
        });

        it('all entries have valid logicalBit values', () => {
            for (const entry of CAN_BIT_FIELD_MAP) {
                expect(entry.logicalBit === 0 || entry.logicalBit === 1).toBe(true);
            }
        });
    });

    describe('detectBitStuffing', () => {
        it('should return an array of BitStuffMarker', () => {
            const markers = detectBitStuffing();
            expect(Array.isArray(markers)).toBe(true);
        });

        it('each marker should have afterBitIndex within the stuffing region', () => {
            const stuffRegionEnd = 98; // SOF thru CRC
            for (const marker of CAN_BIT_STUFF_MARKERS) {
                expect(marker.afterBitIndex).toBeGreaterThanOrEqual(0);
                expect(marker.afterBitIndex).toBeLessThan(stuffRegionEnd);
            }
        });

        it('stuff bit value should be opposite of the 5 consecutive bits', () => {
            for (const marker of CAN_BIT_STUFF_MARKERS) {
                const lastBitValue = CAN_LOGICAL_BITS[marker.afterBitIndex];
                expect(marker.stuffBitValue).toBe(lastBitValue === 0 ? 1 : 0);
            }
        });
    });

    describe('CAN_SEGMENT_BOUNDARIES', () => {
        it('should cover all bits contiguously', () => {
            const boundaries = getSegmentBoundaries();
            let expectedStart = 0;
            for (const seg of boundaries) {
                expect(seg.startBit).toBe(expectedStart);
                expect(seg.endBit).toBe(expectedStart + seg.bits - 1);
                expectedStart += seg.bits;
            }
            expect(expectedStart).toBe(CAN_FULL_PATTERN.length);
        });

        it('should have labels for all segments', () => {
            for (const seg of CAN_SEGMENT_BOUNDARIES) {
                expect(seg.label.length).toBeGreaterThan(0);
                expect(seg.shortLabel.length).toBeGreaterThan(0);
            }
        });
    });
});
