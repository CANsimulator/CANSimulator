import { describe, it, expect } from 'vitest';
import { 
    encodeRegisters, 
    decodeRegisters, 
    findOptimalTiming 
} from '../src/services/can/bit-timing';
import { type BitTiming } from '../src/types/testbench';

describe('CAN Bit Timing Service', () => {

    describe('Register Encoding/Decoding', () => {
        it('should round-trip standard 500k timing', () => {
            const original: BitTiming = {
                sync: 1,
                prop: 2,
                phase1: 5,
                phase2: 2,
                sjw: 1,
                brp: 1,
                oscillator: 16_000_000,
                sam: 0
            };

            const { btr0, btr1 } = encodeRegisters(original);
            const decoded = decodeRegisters(btr0, btr1, original.oscillator);

            // Note: prop and phase1 are combined into TSEG1 and then split back.
            // (prop + phase1) = (2 + 5) = 7.
            // Split back logic: prop = floor(7/2) = 3, phase1 = 7 - 3 = 4.
            // This is semantically equivalent for the CAN controller.
            expect(decoded.prop + decoded.phase1).toBe(original.prop + original.phase1);
            expect(decoded.phase2).toBe(original.phase2);
            expect(decoded.sjw).toBe(original.sjw);
            expect(decoded.brp).toBe(original.brp);
            expect(decoded.sam).toBe(original.sam);
        });

        it('should handle SAM=1 (Triple Sampling)', () => {
            const timing: BitTiming = {
                sync: 1, prop: 2, phase1: 2, phase2: 3, sjw: 1, brp: 4, oscillator: 16_000_000, sam: 1
            };
            const { btr1 } = encodeRegisters(timing);
            expect(btr1 & 0x80).toBe(0x80); // Highest bit of BTR1 is SAM
            
            const decoded = decodeRegisters(0x00, btr1, 16_000_000);
            expect(decoded.sam).toBe(1);
        });
    });

    describe('findOptimalTiming (Auto-Code)', () => {
        it('should find valid timing for 500k @ 16MHz', () => {
            const result = findOptimalTiming(500_000, 16_000_000);
            expect(result).not.toBeNull();
            if (result) {
                const totalTq = result.sync + result.prop + result.phase1 + result.phase2;
                const fosc = 16_000_000 / 2;
                const actualBaud = (fosc / result.brp) / totalTq;
                expect(actualBaud).toBe(500_000);
                
                const samplePoint = (result.sync + result.prop + result.phase1) / totalTq;
                expect(samplePoint).toBeGreaterThanOrEqual(0.70);
                expect(samplePoint).toBeLessThanOrEqual(0.90);
            }
        });

        it('should find valid timing for 125k @ 8MHz', () => {
            const result = findOptimalTiming(125_000, 8_000_000);
            expect(result).not.toBeNull();
            if (result) {
                const totalTq = result.sync + result.prop + result.phase1 + result.phase2;
                const fosc = 8_000_000 / 2;
                const actualBaud = (fosc / result.brp) / totalTq;
                expect(actualBaud).toBe(125_000);
            }
        });

        it('should return null for impossible target baud rates', () => {
            // 10MHz oscillator cannot do 2MBps standard CAN (limit is usually 1M)
            // And 10MHz/2 = 5MHz / 2M = 2.5 TQ. Too low.
            const result = findOptimalTiming(2_000_000, 10_000_000);
            expect(result).toBeNull();
        });
    });
});
