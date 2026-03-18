
import { describe, it, expect } from 'vitest';
import { 
    generateSample, 
    createInitialWaveState, 
    WaveState, 
    BIT_TIME_SAMPLES 
} from '../src/services/can/waveform-generator';

describe('Waveform Generator', () => {
    it('should generate samples and advance state', () => {
        const state = createInitialWaveState();
        const initialIndex = state.globalSampleIndex;
        
        const sample = generateSample(null, state);
        
        expect(sample).toBeDefined();
        expect(state.globalSampleIndex).toBe(initialIndex + 1);
        expect(sample.t).toBe(initialIndex);
    });

    it('should maintain independent states for different instances', () => {
        const state1 = createInitialWaveState();
        const state2 = createInitialWaveState();
        
        generateSample(null, state1);
        generateSample(null, state1);
        
        expect(state1.globalSampleIndex).toBe(2);
        expect(state2.globalSampleIndex).toBe(0);
        
        generateSample(null, state2);
        expect(state2.globalSampleIndex).toBe(1);
    });

    it('should advance bit index after a full bit period', () => {
        const state = createInitialWaveState();
        // Force a known bit stream if we could, but here we just check transition
        const initialBitIndex = state.frameBitIndex;
        
        // Advance by BIT_TIME_SAMPLES
        for (let i = 0; i < BIT_TIME_SAMPLES; i++) {
            generateSample(null, state);
        }
        
        // After BIT_TIME_SAMPLES, frameBitIndex should have incremented once
        // (Actually it increments at bitPhase 0, which is every BIT_TIME_SAMPLES)
        expect(state.frameBitIndex).toBe(initialBitIndex + 1);
    });

    it('should wrap around and generate a new bit stream when frame ends', () => {
        const state = createInitialWaveState();
        const frameLength = state.frameBits.length;
        
        // Progress to the very end of the frame
        for (let i = 0; i < frameLength * BIT_TIME_SAMPLES; i++) {
            generateSample(null, state);
        }
        
        // It should have reset frameBitIndex to 0 (or transitioned to the next frame)
        // Since it resets when frameBitIndex >= frameBits.length
        expect(state.frameBitIndex).toBeLessThan(frameLength);
        expect(state.globalSampleIndex).toBe(frameLength * BIT_TIME_SAMPLES);
    });
});
