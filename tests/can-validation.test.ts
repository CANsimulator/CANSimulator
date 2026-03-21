import { describe, it, expect } from 'vitest';
import { CANValidation } from '../src/services/can/validation';

describe('CANValidation Service', () => {

    describe('validateMsgId', () => {
        it('should accept valid standard IDs', () => {
            expect(CANValidation.validateMsgId('7DF', false).isValid).toBe(true);
            expect(CANValidation.validateMsgId('000', false).isValid).toBe(true);
            expect(CANValidation.validateMsgId('7FF', false).isValid).toBe(true);
        });

        it('should accept valid extended IDs', () => {
            expect(CANValidation.validateMsgId('1FFFFFFF', true).isValid).toBe(true);
            expect(CANValidation.validateMsgId('000', true).isValid).toBe(true);
            expect(CANValidation.validateMsgId('12345678', true).isValid).toBe(true);
        });

        it('should reject non-hex characters', () => {
             const result = CANValidation.validateMsgId('GHI', false);
             expect(result.isValid).toBe(false);
             expect(result.error).toContain('Only hex characters');
        });

        it('should reject IDs that are too long (standard)', () => {
            const result = CANValidation.validateMsgId('1234', false);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Max 3');
        });

        it('should reject IDs that are too long (extended)', () => {
            const result = CANValidation.validateMsgId('123456789', true);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Max 8');
        });

        it('should reject IDs out of range', () => {
            const result = CANValidation.validateMsgId('FFF', false); // 0xFFF > 0x7FF
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('out of range');
        });
    });

    describe('validatePayload', () => {
        it('should accept valid classic hex hex payloads (with or without spaces)', () => {
            expect(CANValidation.validatePayload('01 02 03 04 05 06 07 08', false).isValid).toBe(true);
            expect(CANValidation.validatePayload('0102030405060708', false).isValid).toBe(true);
            expect(CANValidation.validatePayload('FF', false).isValid).toBe(true);
        });

        it('should accept valid CAN FD hex payloads', () => {
            const longPayload = '00 '.repeat(64).trim();
            expect(CANValidation.validatePayload(longPayload, true).isValid).toBe(true);
        });

        it('should reject non-hex characters', () => {
             const result = CANValidation.validatePayload('XYZ', false);
             expect(result.isValid).toBe(false);
             expect(result.error).toContain('Only hex characters');
        });

        it('should reject odd-length byte sequences', () => {
            const result = CANValidation.validatePayload('012', false);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('even number of hex chars');
        });

        it('should reject payloads exceeding length (classic)', () => {
            const result = CANValidation.validatePayload('01 02 03 04 05 06 07 08 09', false);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('maximum of 8 bytes');
        });

        it('should reject payloads exceeding length (FD)', () => {
            const extraLongPayload = '00 '.repeat(65).trim();
            const result = CANValidation.validatePayload(extraLongPayload, true);
            expect(result.isValid).toBe(false);
            expect(result.error).toContain('maximum of 64 bytes');
        });
    });
});
