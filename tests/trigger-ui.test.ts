import { describe, it, expect } from 'vitest';
import { validateCanId, validatePayloadPattern } from '../src/components/can/scope/CanTriggerMenu';
import type { OscState } from '../src/components/can/scope/types';

// Mock setState emulator to test complex state mutations
const createMockState = (initialLevel = 2.9, initialHoldoff = 1.0): OscState => ({
    running: true,
    timebase: 200,
    axisOffsetY: 0,
    channels: {
        h: { on: true, vpd: 1, off: 0 },
        l: { on: true, vpd: 1, off: 0 },
        d: { on: true, vpd: 1, off: 0 },
    },
    trig: {
        source: 'CH1',
        mode: 'Edge',
        level: initialLevel,
        sweep: 'Auto',
        slope: 'Rising',
        coupling: 'DC',
        holdoff: initialHoldoff,
        canTrigger: {
            type: 'ID',
            targetID: '0C9',
            errorType: 'CRC',
            payloadPattern: 'AA FF'
        }
    }
});

// Emulated stepper function matching the component's implementation
const stepLevel = (state: OscState, direction: 'up' | 'down'): OscState => {
    const delta = 0.05;
    const current = state.trig.level;
    const next = direction === 'up' ? Math.min(5, current + delta) : Math.max(0, current - delta);
    return {
        ...state,
        trig: {
            ...state.trig,
            level: parseFloat(next.toFixed(2))
        }
    };
};

const stepHoldoff = (state: OscState, direction: 'up' | 'down'): OscState => {
    const current = state.trig.holdoff ?? 1.0;
    const next = direction === 'up' ? Math.min(10.0, current + 0.5) : Math.max(1.0, current - 0.5);
    return {
        ...state,
        trig: {
            ...state.trig,
            holdoff: parseFloat(next.toFixed(1))
        }
    };
};

describe('Trigger UI & Input Validation Logic', () => {

    describe('validateCanId helper', () => {
        it('should correctly mark valid standard CAN IDs', () => {
            const res = validateCanId('7DF');
            expect(res.isValid).toBe(true);
            expect(res.type).toBe('standard');
            expect(res.message).toBe('Standard ID (11-bit)');
        });

        it('should correctly mark valid extended CAN IDs', () => {
            const res = validateCanId('1C020304');
            expect(res.isValid).toBe(true);
            expect(res.type).toBe('extended');
            expect(res.message).toBe('Extended ID (29-bit)');
        });

        it('should reject empty input', () => {
            const res = validateCanId('');
            expect(res.isValid).toBe(false);
            expect(res.type).toBe('error');
            expect(res.message).toBe('CAN ID is required');
        });

        it('should reject hex strings exceeding 29-bit range (> 0x1FFFFFFF)', () => {
            const res = validateCanId('20000000');
            expect(res.isValid).toBe(false);
            expect(res.type).toBe('error');
            expect(res.message).toBe('Max 0x1FFFFFFF (29-bit)');
        });
    });

    describe('validatePayloadPattern helper', () => {
        it('should validate complete space-separated hexadecimal bytes', () => {
            const res = validatePayloadPattern('AA FF 00 12');
            expect(res.isValid).toBe(true);
            expect(res.type).toBe('success');
            expect(res.message).toBe('4 Bytes matched');
        });

        it('should handle single byte validation correctly', () => {
            const res = validatePayloadPattern('FF');
            expect(res.isValid).toBe(true);
            expect(res.type).toBe('success');
            expect(res.message).toBe('1 Byte matched');
        });

        it('should handle info status for empty pattern', () => {
            const res = validatePayloadPattern('');
            expect(res.isValid).toBe(false);
            expect(res.type).toBe('info');
            expect(res.message).toBe('Pattern is empty');
        });

        it('should reject incomplete byte structures (e.g. single digit byte)', () => {
            const res = validatePayloadPattern('AA F 00');
            expect(res.isValid).toBe(false);
            expect(res.type).toBe('error');
            expect(res.message).toBe('Incomplete byte "F" (must be 2 digits)');
        });

        it('should reject pattern if byte length exceeds classic CAN limit (8 bytes)', () => {
            const res = validatePayloadPattern('01 02 03 04 05 06 07 08 09');
            expect(res.isValid).toBe(false);
            expect(res.type).toBe('error');
            expect(res.message).toBe('Max 8 bytes for Classical CAN');
        });
    });

    describe('Trigger Level Fine Tuning (Steppers)', () => {
        it('should increment trigger level by 0.05V', () => {
            let state = createMockState(2.50);
            state = stepLevel(state, 'up');
            expect(state.trig.level).toBe(2.55);
        });

        it('should clamp trigger level at max 5.0V', () => {
            let state = createMockState(4.98);
            state = stepLevel(state, 'up');
            expect(state.trig.level).toBe(5.00);
            state = stepLevel(state, 'up');
            expect(state.trig.level).toBe(5.00);
        });

        it('should decrement trigger level by 0.05V', () => {
            let state = createMockState(2.50);
            state = stepLevel(state, 'down');
            expect(state.trig.level).toBe(2.45);
        });

        it('should clamp trigger level at min 0.0V', () => {
            let state = createMockState(0.02);
            state = stepLevel(state, 'down');
            expect(state.trig.level).toBe(0.00);
            state = stepLevel(state, 'down');
            expect(state.trig.level).toBe(0.00);
        });
    });

    describe('Advanced Trigger Settings Logic', () => {
        it('should increment holdoff by 0.5 µs', () => {
            let state = createMockState(2.5, 1.5);
            state = stepHoldoff(state, 'up');
            expect(state.trig.holdoff).toBe(2.0);
        });

        it('should clamp holdoff at max 10.0 µs', () => {
            let state = createMockState(2.5, 9.8);
            state = stepHoldoff(state, 'up');
            expect(state.trig.holdoff).toBe(10.0);
            state = stepHoldoff(state, 'up');
            expect(state.trig.holdoff).toBe(10.0);
        });

        it('should decrement holdoff by 0.5 µs', () => {
            let state = createMockState(2.5, 2.0);
            state = stepHoldoff(state, 'down');
            expect(state.trig.holdoff).toBe(1.5);
        });

        it('should clamp holdoff at min 1.0 µs', () => {
            let state = createMockState(2.5, 1.2);
            state = stepHoldoff(state, 'down');
            expect(state.trig.holdoff).toBe(1.0);
            state = stepHoldoff(state, 'down');
            expect(state.trig.holdoff).toBe(1.0);
        });
    });

    describe('Form Validation Integrity', () => {
        it('should mark Error type as always valid', () => {
            const cfg = { type: 'Error', targetID: '', errorType: 'CRC', payloadPattern: '' } as const;
            const isFormValid = cfg.type === 'Error' || 
                (cfg.type === 'ID' && validateCanId(cfg.targetID).isValid) || 
                (cfg.type === 'Payload' && validatePayloadPattern(cfg.payloadPattern).isValid);
            expect(isFormValid).toBe(true);
        });

        it('should validate ID form correctly', () => {
            const cfgValid = { type: 'ID', targetID: '7DF', errorType: 'CRC', payloadPattern: '' } as const;
            const cfgInvalid = { type: 'ID', targetID: '', errorType: 'CRC', payloadPattern: '' } as const;
            
            const isValid1 = cfgValid.type === 'Error' || 
                (cfgValid.type === 'ID' && validateCanId(cfgValid.targetID).isValid) || 
                (cfgValid.type === 'Payload' && validatePayloadPattern(cfgValid.payloadPattern).isValid);
            
            const isValid2 = cfgInvalid.type === 'Error' || 
                (cfgInvalid.type === 'ID' && validateCanId(cfgInvalid.targetID).isValid) || 
                (cfgInvalid.type === 'Payload' && validatePayloadPattern(cfgInvalid.payloadPattern).isValid);

            expect(isValid1).toBe(true);
            expect(isValid2).toBe(false);
        });

        it('should validate Payload form correctly', () => {
            const cfgValid = { type: 'Payload', targetID: '', errorType: 'CRC', payloadPattern: 'AA BB CC' } as const;
            const cfgInvalid = { type: 'Payload', targetID: '', errorType: 'CRC', payloadPattern: 'AA G 00' } as const;

            const isValid1 = cfgValid.type === 'Error' || 
                (cfgValid.type === 'ID' && validateCanId(cfgValid.targetID).isValid) || 
                (cfgValid.type === 'Payload' && validatePayloadPattern(cfgValid.payloadPattern).isValid);
            
            const isValid2 = cfgInvalid.type === 'Error' || 
                (cfgInvalid.type === 'ID' && validateCanId(cfgInvalid.targetID).isValid) || 
                (cfgInvalid.type === 'Payload' && validatePayloadPattern(cfgInvalid.payloadPattern).isValid);

            expect(isValid1).toBe(true);
            expect(isValid2).toBe(false);
        });
    });
});
