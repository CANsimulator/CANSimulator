import { describe, it, expect } from 'vitest';
import { isSOFTransition, isErrorFrame, isIDMatch, Sample } from '../src/services/can/trigger-logic';

const createSample = (dominant: boolean, t: number): Sample => ({
    canh: dominant ? 3.5 : 2.5,
    canl: dominant ? 1.5 : 2.5,
    isDominant: dominant,
    bitIndex: 0,
    t
});

describe('Trigger Logic', () => {
    describe('isSOFTransition', () => {
        it('should detect recessive-to-dominant transition', () => {
            const s1 = createSample(false, 0); // Recessive
            const s2 = createSample(true, 1);  // Dominant
            expect(isSOFTransition(s1, s2)).toBe(true);
        });

        it('should NOT detect stable dominant', () => {
            const s1 = createSample(true, 0);
            const s2 = createSample(true, 1);
            expect(isSOFTransition(s1, s2)).toBe(false);
        });

        it('should NOT detect stable recessive', () => {
            const s1 = createSample(false, 0);
            const s2 = createSample(false, 1);
            expect(isSOFTransition(s1, s2)).toBe(false);
        });

        it('should NOT detect dominant-to-recessive transition', () => {
            const s1 = createSample(true, 0);
            const s2 = createSample(false, 1);
            expect(isSOFTransition(s1, s2)).toBe(false);
        });
    });

    describe('isErrorFrame', () => {
        it('should detect 6 consecutive dominant bits', () => {
            const samples: Sample[] = [
                createSample(true, 0),
                createSample(true, 1),
                createSample(true, 2),
                createSample(true, 3),
                createSample(true, 4),
                createSample(true, 5),
            ];
            expect(isErrorFrame(samples)).toBe(true);
        });

        it('should NOT detect 5 consecutive dominant bits', () => {
            const samples: Sample[] = [
                createSample(false, 0),
                createSample(true, 1),
                createSample(true, 2),
                createSample(true, 3),
                createSample(true, 4),
                createSample(true, 5),
            ];
            expect(isErrorFrame(samples)).toBe(false);
        });

        it('should detect 6 dominant bits in a longer stream', () => {
            const samples: Sample[] = [
                createSample(false, 0),
                createSample(true, 1),
                createSample(true, 2),
                createSample(true, 3),
                createSample(true, 4),
                createSample(true, 5),
                createSample(true, 6),
            ];
            expect(isErrorFrame(samples)).toBe(true);
        });

        it('should reset count on recessive bit', () => {
            const samples: Sample[] = [
                createSample(true, 0),
                createSample(true, 1),
                createSample(true, 2),
                createSample(false, 3), // Interrupt
                createSample(true, 4),
                createSample(true, 5),
                createSample(true, 6),
            ];
            expect(isErrorFrame(samples)).toBe(false);
        });
    });

    describe('isIDMatch', () => {
        it('should detect a matching ID exactly at the bit 11 -> 12 transition', () => {
            const samples: Sample[] = [];
            let t = 0;
            const addBits = (bitVals: number[], bitIndices: number[]) => {
                for (let i = 0; i < bitVals.length; i++) {
                    const isDominant = bitVals[i] === 0;
                    samples.push({ canh: isDominant ? 3.5 : 2.5, canl: isDominant ? 1.5 : 2.5, isDominant, bitIndex: bitIndices[i], t: t++ });
                    samples.push({ canh: isDominant ? 3.5 : 2.5, canl: isDominant ? 1.5 : 2.5, isDominant, bitIndex: bitIndices[i], t: t++ });
                }
            };
            
            // target ID 0x7E0 (111 1110 0000)
            const idBits = [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
            const idIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
            
            addBits([0], [0]); // SOF
            addBits(idBits, idIndices);
            
            expect(isIDMatch(samples, 0x7E0)).toBe(false);
            
            // Add exactly one sample for the transition to bit 12
            const isDominant = false;
            samples.push({ canh: 2.5, canl: 2.5, isDominant, bitIndex: 12, t: t++ });
            
            expect(isIDMatch(samples, 0x7E0)).toBe(true);
            expect(isIDMatch(samples, 0x7E1)).toBe(false);
        });
    });
});
