
/**
 * Waveform Generator Service
 * Pure logic for simulating CAN bus bit streams and sample generation.
 */

// ─── ISO 11898 Thresholds ───────────────────────────────────
export const ISO = {
    CANH_DOM_MIN: 2.75,  CANH_DOM_TYP: 3.5,   CANH_DOM_MAX: 4.5,
    CANL_DOM_MIN: 0.5,   CANL_DOM_TYP: 1.5,   CANL_DOM_MAX: 2.25,
    VDIFF_DOM_MIN: 1.5,  VDIFF_DOM_TYP: 2.0,
    VDIFF_REC_MAX: 0.5,
    V_REC: 2.5,          // Recessive level for both lines
    V_MIN: 0,   V_MAX: 5,
    DIFF_MIN: -1, DIFF_MAX: 3.5,
};

export const BIT_TIME_SAMPLES = 8; // samples per bit period

import type { Sample, WaveState } from '../../types/can';

/**
 * Generates a standard CAN 2.0B frame bit stream (simplified)
 */
export function generateBitStream(): boolean[] {
    // SOF(1) + ID(11) + RTR(1) + IDE(1) + r0(1) + DLC(4) + Data(64) + CRC(15) + delim(1) + ACK(2) + EOF(7) + IFS(3)
    const bits: boolean[] = [];
    bits.push(true); // SOF dominant
    for (let i = 0; i < 11; i++) bits.push(Math.random() > 0.5); // ID
    bits.push(false); // RTR
    bits.push(false); bits.push(false); // IDE + r0
    bits.push(true); bits.push(false); bits.push(false); bits.push(false); // DLC=8
    for (let i = 0; i < 64; i++) bits.push(Math.random() > 0.5); // Data
    for (let i = 0; i < 15; i++) bits.push(Math.random() > 0.5); // CRC
    bits.push(false); // CRC delim
    bits.push(true);  // ACK
    bits.push(false); // ACK delim
    for (let i = 0; i < 7; i++) bits.push(false); // EOF
    for (let i = 0; i < 3; i++) bits.push(false); // IFS
    return bits;
}

export interface ChannelOptions {
    bwLimit?: boolean;
    coupling?: 'AC' | 'DC';
}

/**
 * Generates a single sample point based on the provided wave state.
 * Mutates the state object (intended for use with React refs).
 */
export function generateSample(
    prev: Sample | null, 
    state: WaveState, 
    ch1?: ChannelOptions, 
    ch2?: ChannelOptions
): Sample {
    const bitPhase = state.globalSampleIndex % BIT_TIME_SAMPLES;
    
    if (bitPhase === 0) {
        state.frameBitIndex++;
        if (state.frameBitIndex >= state.frameBits.length) {
            state.frameBits = generateBitStream();
            state.frameBitIndex = 0;
        }
    }
    
    const isDominant = state.frameBits[state.frameBitIndex];

    const wasTransition = prev ? prev.isDominant !== isDominant : false;
    const edgePhase = bitPhase / BIT_TIME_SAMPLES;
    
    // Configurable noise and physical layer realism
    const noise = () => (Math.random() - 0.5) * 0.12; // Increased noise floor slightly for realism
    
    // Physical layer effects (ringing, overshoot, and reflections)
    const ringing = wasTransition && edgePhase < 0.35
        ? Math.sin(edgePhase * Math.PI * 6) * 0.18 * (1 - edgePhase * 2.8)
        : 0;
    
    // Reflection simulation: a small, delayed echo of the transition
    const reflection = wasTransition && edgePhase > 0.15 && edgePhase < 0.45
        ? (isDominant ? -0.08 : 0.08) * Math.cos((edgePhase - 0.2) * Math.PI * 4) * (0.5 - edgePhase)
        : 0;

    const overshoot = wasTransition && edgePhase < 0.15 ? 0.14 : 0;

    // ISO 11898 Standard Levels:
    // Recessive: CAN-H = 2.5V, CAN-L = 2.5V (Vdiff = 0V)
    // Dominant: CAN-H = 3.5V, CAN-L = 1.5V (Vdiff = 2.0V)
    let canh = isDominant 
        ? ISO.CANH_DOM_TYP + noise() + ringing + overshoot + reflection
        : ISO.V_REC + noise() * 0.6 + ringing * 0.4 + reflection * 0.5;
    
    let canl = isDominant 
        ? ISO.CANL_DOM_TYP + noise() - ringing - overshoot - reflection
        : ISO.V_REC + noise() * 0.6 - ringing * 0.4 - reflection * 0.5;

    // Apply BW Limit (Cheap Low Pass Filter)
    if (prev) {
        if (ch1?.bwLimit) canh = prev.canh * 0.7 + canh * 0.3;
        if (ch2?.bwLimit) canl = prev.canl * 0.7 + canl * 0.3;
    }

    // Apply AC Coupling (Remove 2.5V Common Mode DC offset)
    if (ch1?.coupling === 'AC') canh -= 2.5;
    if (ch2?.coupling === 'AC') canl -= 2.5;

    const sample: Sample = { 
        canh, 
        canl, 
        isDominant, 
        bitIndex: state.frameBitIndex, 
        t: state.globalSampleIndex 
    };
    
    state.globalSampleIndex++;
    return sample;
}

export function createInitialWaveState(): WaveState {
    return {
        frameBits: generateBitStream(),
        frameBitIndex: 0,
        globalSampleIndex: 0,
    };
}
