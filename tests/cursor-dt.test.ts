import { describe, it, expect } from 'vitest';

/**
 * reproduced cursor dt logic from src/components/can/VoltageScope.tsx
 */
function calculateDt(idxA: number, idxB: number, tdiv: number, samplesPerDiv: number): number {
    return Math.abs(idxB - idxA) * (tdiv / samplesPerDiv);
}

describe('VoltageScope Cursor ΔT Calculation', () => {
    const tdiv = 50; // µs/division
    const totalSamples = 200;
    const totalDivisions = 10;
    const samplesPerDiv = totalSamples / totalDivisions; // 20

    it('should correctly calculate dt with current (buggy) divisor 10', () => {
        // Cursors are 20 samples apart (exactly 1 division)
        const idxA = 0;
        const idxB = 20;
        const buggySamplesPerDiv = 10;
        
        const dt = calculateDt(idxA, idxB, tdiv, buggySamplesPerDiv);
        
        // 20 * (50 / 10) = 100µs (WRONG, 1 division should be 50µs)
        expect(dt).toBe(100);
    });

    it('should correctly calculate dt with fixed divisor 20', () => {
        // Cursors are 20 samples apart (exactly 1 division)
        const idxA = 0;
        const idxB = 20;
        const fixedSamplesPerDiv = 20;
        
        const dt = calculateDt(idxA, idxB, tdiv, fixedSamplesPerDiv);
        
        // 20 * (50 / 20) = 50µs (CORRECT, 1 division = tdiv)
        expect(dt).toBe(50);
    });

    it('should correctly calculate dt for 10 samples at 100µs/div', () => {
        const tdiv = 100;
        const idxA = 0;
        const idxB = 10;
        const fixedSamplesPerDiv = 20;
        
        const dt = calculateDt(idxA, idxB, tdiv, fixedSamplesPerDiv);
        
        // 10 samples = 0.5 divisions. tdiv = 100. Correct dt = 50µs.
        // 10 * (100 / 20) = 10 * 5 = 50µs
        expect(dt).toBe(50);
    });
});
