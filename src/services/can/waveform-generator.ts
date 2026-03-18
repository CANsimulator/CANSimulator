
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

export interface Sample {
    canh: number; 
    canl: number;
    isDominant: boolean;
    bitIndex: number; // which bit in the frame
    t: number;
}

export interface WaveState {
    frameBits: boolean[];
    frameBitIndex: number;
    globalSampleIndex: number;
}

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

/**
 * Generates a single sample point based on the provided wave state.
 * Mutates the state object (intended for use with React refs).
 */
export function generateSample(prev: Sample | null, state: WaveState): Sample {
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
    const n = () => (Math.random() - 0.5) * 0.06;
    
    // Physical layer effects (ringing and overshoot)
    const ringing = wasTransition && edgePhase < 0.4
        ? Math.sin(edgePhase * Math.PI * 6) * 0.15 * (1 - edgePhase * 2.5)
        : 0;
    const overshoot = wasTransition && edgePhase < 0.15 ? 0.12 : 0;

    const canh = isDominant ? ISO.CANH_DOM_TYP + n() + ringing + overshoot : ISO.V_REC + n() * 0.5 + ringing * 0.3;
    const canl = isDominant ? ISO.CANL_DOM_TYP + n() - ringing - overshoot : ISO.V_REC + n() * 0.5 - ringing * 0.3;

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
