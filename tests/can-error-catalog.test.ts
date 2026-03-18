// ============================================================
// CAN Error Catalog — Unit Tests (Vitest)
// Covers: error demo generation, error catalog integrity,
//         bit-level correctness for all 5 ISO 11898-1 error types
// ============================================================

import { describe, it, expect } from 'vitest';
import {
    generateErrorDemo,
    getErrorTypeInfo,
    getFrameFields,
    ERROR_TYPE_CATALOG,
    type CANErrorType,
} from '../src/services/can/can-error-catalog';

const ALL_ERROR_TYPES: CANErrorType[] = ['BIT', 'STUFF', 'FORM', 'ACK', 'CRC'];

// ----------------------------------------------------------------
// Error Catalog Integrity
// ----------------------------------------------------------------
describe('CAN Error Catalog — catalog integrity', () => {
    it('should define exactly 5 error types', () => {
        expect(ERROR_TYPE_CATALOG).toHaveLength(5);
    });

    it('should cover all 5 ISO 11898-1 error types', () => {
        const types = ERROR_TYPE_CATALOG.map((e) => e.type);
        for (const t of ALL_ERROR_TYPES) {
            expect(types).toContain(t);
        }
    });

    it('should have non-empty fields for every entry', () => {
        for (const entry of ERROR_TYPE_CATALOG) {
            expect(entry.title.length).toBeGreaterThan(0);
            expect(entry.description.length).toBeGreaterThan(0);
            expect(entry.mechanism.length).toBeGreaterThan(0);
            expect(entry.realWorldCause.length).toBeGreaterThan(0);
            expect(entry.colorHex).toMatch(/^#[0-9a-f]{6}$/i);
            expect(['Transmitter', 'Receiver']).toContain(entry.detectedBy);
        }
    });

    it('should correctly assign detectedBy roles per ISO 11898-1', () => {
        expect(getErrorTypeInfo('BIT').detectedBy).toBe('Transmitter');
        expect(getErrorTypeInfo('STUFF').detectedBy).toBe('Receiver');
        expect(getErrorTypeInfo('FORM').detectedBy).toBe('Receiver');
        expect(getErrorTypeInfo('ACK').detectedBy).toBe('Transmitter');
        expect(getErrorTypeInfo('CRC').detectedBy).toBe('Receiver');
    });
});

// ----------------------------------------------------------------
// Frame Fields
// ----------------------------------------------------------------
describe('CAN Error Catalog — frame fields', () => {
    it('should return non-empty frame field definitions', () => {
        const fields = getFrameFields();
        expect(fields.length).toBeGreaterThan(0);
    });

    it('should have contiguous, non-overlapping fields covering bits 0-59', () => {
        const fields = getFrameFields();
        const sorted = [...fields].sort((a, b) => a.startBit - b.startBit);

        // First field starts at 0
        expect(sorted[0].startBit).toBe(0);

        // Last field ends at 59
        expect(sorted[sorted.length - 1].endBit).toBe(59);

        // No gaps or overlaps
        for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].startBit).toBe(sorted[i - 1].endBit + 1);
        }
    });
});

// ----------------------------------------------------------------
// Error Demo Generation — Common Properties
// ----------------------------------------------------------------
describe('CAN Error Catalog — generateErrorDemo (common)', () => {
    for (const type of ALL_ERROR_TYPES) {
        describe(`Error type: ${type}`, () => {
            it('should return correctBits of length 60', () => {
                const result = generateErrorDemo(type);
                expect(result.correctBits).toHaveLength(60);
            });

            it('should return corruptedBits of length 60', () => {
                const result = generateErrorDemo(type);
                expect(result.corruptedBits).toHaveLength(60);
            });

            it('should have at least one error bit index', () => {
                const result = generateErrorDemo(type);
                expect(result.errorBitIndices.length).toBeGreaterThan(0);
            });

            it('should have error bit indices within frame bounds', () => {
                const result = generateErrorDemo(type);
                for (const idx of result.errorBitIndices) {
                    expect(idx).toBeGreaterThanOrEqual(0);
                    expect(idx).toBeLessThan(60);
                }
            });

            it('should have corruptedBits differ from correctBits at error indices', () => {
                const result = generateErrorDemo(type);
                for (const idx of result.errorBitIndices) {
                    expect(result.corruptedBits[idx]).not.toBe(result.correctBits[idx]);
                }
            });

            it('should return non-empty explanation and whatHappens', () => {
                const result = generateErrorDemo(type);
                expect(result.explanation.length).toBeGreaterThan(0);
                expect(result.whatHappens.length).toBeGreaterThan(0);
            });

            it('should return the correct errorType', () => {
                const result = generateErrorDemo(type);
                expect(result.errorType).toBe(type);
            });

            it('should return non-empty fields array', () => {
                const result = generateErrorDemo(type);
                expect(result.fields.length).toBeGreaterThan(0);
            });

            it('should have all bits as 0 or 1', () => {
                const result = generateErrorDemo(type);
                for (const bit of result.correctBits) {
                    expect([0, 1]).toContain(bit);
                }
                for (const bit of result.corruptedBits) {
                    expect([0, 1]).toContain(bit);
                }
            });
        });
    }
});

// ----------------------------------------------------------------
// Error-Specific Validation
// ----------------------------------------------------------------
describe('CAN Error Catalog — BIT error specifics', () => {
    it('should flip exactly one bit in the data region', () => {
        const result = generateErrorDemo('BIT');
        expect(result.errorBitIndices).toHaveLength(1);
        const idx = result.errorBitIndices[0];
        // Data field is bits 19-34
        expect(idx).toBeGreaterThanOrEqual(19);
        expect(idx).toBeLessThanOrEqual(34);
    });
});

describe('CAN Error Catalog — STUFF error specifics', () => {
    it('should create 6+ consecutive identical bits in the corrupted stream', () => {
        const result = generateErrorDemo('STUFF');
        const corrupted = result.corruptedBits;

        // Check for a run of 6+ identical bits somewhere in the stuffed region
        let maxRun = 1;
        let currentRun = 1;
        for (let i = 1; i < 50; i++) { // SOF through CRC
            if (corrupted[i] === corrupted[i - 1]) {
                currentRun++;
                maxRun = Math.max(maxRun, currentRun);
            } else {
                currentRun = 1;
            }
        }
        expect(maxRun).toBeGreaterThanOrEqual(6);
    });
});

describe('CAN Error Catalog — FORM error specifics', () => {
    it('should corrupt a bit in the EOF field', () => {
        const result = generateErrorDemo('FORM');
        const idx = result.errorBitIndices[0];
        // EOF field is bits 53-59
        expect(idx).toBeGreaterThanOrEqual(53);
        expect(idx).toBeLessThanOrEqual(59);
    });

    it('should set the corrupted EOF bit to dominant (0)', () => {
        const result = generateErrorDemo('FORM');
        const idx = result.errorBitIndices[0];
        expect(result.corruptedBits[idx]).toBe(0);
        expect(result.correctBits[idx]).toBe(1); // EOF should be recessive
    });
});

describe('CAN Error Catalog — ACK error specifics', () => {
    it('should corrupt the ACK slot (bit 51)', () => {
        const result = generateErrorDemo('ACK');
        expect(result.errorBitIndices).toContain(51);
    });

    it('should show ACK slot as recessive (1) in corrupted frame', () => {
        const result = generateErrorDemo('ACK');
        expect(result.corruptedBits[51]).toBe(1); // No ACK → stays recessive
        expect(result.correctBits[51]).toBe(0);   // Normal → dominant (ACKed)
    });
});

describe('CAN Error Catalog — CRC error specifics', () => {
    it('should corrupt bits within the CRC field (bits 35-49)', () => {
        const result = generateErrorDemo('CRC');
        for (const idx of result.errorBitIndices) {
            expect(idx).toBeGreaterThanOrEqual(35);
            expect(idx).toBeLessThanOrEqual(49);
        }
    });

    it('should have at least 2 corrupted CRC bits', () => {
        const result = generateErrorDemo('CRC');
        expect(result.errorBitIndices.length).toBeGreaterThanOrEqual(2);
    });
});

// ----------------------------------------------------------------
// getErrorTypeInfo
// ----------------------------------------------------------------
describe('CAN Error Catalog — getErrorTypeInfo', () => {
    it('should return correct info for each type', () => {
        for (const type of ALL_ERROR_TYPES) {
            const info = getErrorTypeInfo(type);
            expect(info.type).toBe(type);
            expect(info.title.length).toBeGreaterThan(0);
        }
    });

    it('should throw for an unknown error type', () => {
        expect(() => getErrorTypeInfo('UNKNOWN' as CANErrorType)).toThrow();
    });
});
