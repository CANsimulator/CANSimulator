// ============================================================
// Generation Comparison & Query State — Unit Tests (Vitest)
// Covers: frame estimation, bus load, recommendations,
//         URL query parsing, building, and patching
// ============================================================

import { describe, it, expect } from 'vitest';
import { GENERATIONS, GENERATION_ORDER, SCENARIOS } from '../src/features/generations/data';
import {
  estimateBusLoad,
  estimateFrameCount,
  getGenerationRecommendation,
} from '../src/features/generations/utils/comparison';
import {
  applyGenerationQueryPatch,
  buildGenerationQuery,
  parseGenerationQuery,
} from '../src/features/generations/utils/queryState';
import type { GenerationId, UseCaseProfile } from '../src/features/generations/types';

// ----------------------------------------------------------------
// estimateFrameCount
// ----------------------------------------------------------------
describe('estimateFrameCount — single vs multi-frame payloads', () => {
  it('should return 1 frame when payload fits within Classic CAN 8-byte limit', () => {
    expect(estimateFrameCount(1, GENERATIONS.Classic)).toBe(1);
    expect(estimateFrameCount(8, GENERATIONS.Classic)).toBe(1);
  });

  it('should return 1 frame when payload fits within CAN FD 64-byte limit', () => {
    expect(estimateFrameCount(64, GENERATIONS.FD)).toBe(1);
  });

  it('should return 1 frame when payload fits within CAN XL 2048-byte limit', () => {
    expect(estimateFrameCount(2048, GENERATIONS.XL)).toBe(1);
  });

  it('should require multiple frames when payload exceeds Classic CAN limit', () => {
    expect(estimateFrameCount(24, GENERATIONS.Classic)).toBe(3);  // 24 / 8 = 3
    expect(estimateFrameCount(9, GENERATIONS.Classic)).toBe(2);   // ceil(9/8) = 2
  });

  it('should require multiple frames when payload exceeds CAN FD limit', () => {
    expect(estimateFrameCount(65, GENERATIONS.FD)).toBe(2);   // ceil(65/64) = 2
    expect(estimateFrameCount(128, GENERATIONS.FD)).toBe(2);  // ceil(128/64) = 2
    expect(estimateFrameCount(129, GENERATIONS.FD)).toBe(3);  // ceil(129/64) = 3
  });

  it('should clamp payload to at least 1 byte (avoids division by zero)', () => {
    expect(estimateFrameCount(0, GENERATIONS.Classic)).toBe(1);
  });

  it('should truncate fractional payload bytes', () => {
    // 8.9 truncated to 8, fits in one Classic frame
    expect(estimateFrameCount(8.9, GENERATIONS.Classic)).toBe(1);
  });

  it('should always produce fewer frames for higher-capacity generations', () => {
    const payload = 512;
    const classicFrames = estimateFrameCount(payload, GENERATIONS.Classic);
    const fdFrames = estimateFrameCount(payload, GENERATIONS.FD);
    const xlFrames = estimateFrameCount(payload, GENERATIONS.XL);
    expect(classicFrames).toBeGreaterThan(fdFrames);
    expect(fdFrames).toBeGreaterThan(xlFrames);
  });
});

// ----------------------------------------------------------------
// estimateBusLoad
// ----------------------------------------------------------------
describe('estimateBusLoad — bus utilisation estimates', () => {
  it('should return a positive load percent for any valid input', () => {
    const result = estimateBusLoad(8, 10, GENERATIONS.Classic);
    expect(result.loadPercent).toBeGreaterThan(0);
  });

  it('should include all required fields in the result', () => {
    const result = estimateBusLoad(8, 10, GENERATIONS.Classic);
    expect(result).toHaveProperty('generation', 'Classic');
    expect(result).toHaveProperty('frameCount');
    expect(result).toHaveProperty('payloadBitsPerMessage');
    expect(result).toHaveProperty('estimatedBitsPerSecond');
    expect(result).toHaveProperty('loadPercent');
    expect(result).toHaveProperty('estimatedLatencyMs');
  });

  it('should show Classic CAN has higher bus load than FD for the same 56-byte payload', () => {
    const classic = estimateBusLoad(56, 30, GENERATIONS.Classic);
    const fd = estimateBusLoad(56, 30, GENERATIONS.FD);
    expect(classic.loadPercent).toBeGreaterThan(fd.loadPercent);
  });

  it('should show FD has higher bus load than XL for a large payload', () => {
    const fd = estimateBusLoad(512, 40, GENERATIONS.FD);
    const xl = estimateBusLoad(512, 40, GENERATIONS.XL);
    expect(fd.loadPercent).toBeGreaterThan(xl.loadPercent);
  });

  it('should require more Classic frames than FD for a 56-byte transfer', () => {
    const classic = estimateBusLoad(56, 30, GENERATIONS.Classic);
    const fd = estimateBusLoad(56, 30, GENERATIONS.FD);
    expect(classic.frameCount).toBeGreaterThan(fd.frameCount);
  });

  it('should increase load proportionally with update rate', () => {
    const slow = estimateBusLoad(8, 10, GENERATIONS.Classic);
    const fast = estimateBusLoad(8, 100, GENERATIONS.Classic);
    expect(fast.loadPercent).toBeGreaterThan(slow.loadPercent);
  });

  it('should increase load with larger payload size', () => {
    const small = estimateBusLoad(4, 50, GENERATIONS.FD);
    const large = estimateBusLoad(64, 50, GENERATIONS.FD);
    expect(large.estimatedBitsPerSecond).toBeGreaterThan(small.estimatedBitsPerSecond);
  });

  it('should clamp load percent to at most 999', () => {
    // Extremely high rate to force overflow
    const result = estimateBusLoad(2048, 999999, GENERATIONS.Classic);
    expect(result.loadPercent).toBeLessThanOrEqual(999);
  });

  it('should compute latency as 1000 / updateHz', () => {
    const result = estimateBusLoad(8, 50, GENERATIONS.Classic);
    expect(result.estimatedLatencyMs).toBe(20);
  });

  it('should set payloadBitsPerMessage to payload * 8', () => {
    const result = estimateBusLoad(16, 10, GENERATIONS.FD);
    expect(result.payloadBitsPerMessage).toBe(16 * 8);
  });
});

// ----------------------------------------------------------------
// getGenerationRecommendation
// ----------------------------------------------------------------
describe('getGenerationRecommendation — profile-aware scoring', () => {
  it('should recommend Classic for small Body-control payloads', () => {
    const result = getGenerationRecommendation({
      payloadBytes: 6,
      updateHz: 20,
      profile: 'Body',
    });
    expect(result.recommended).toBe('Classic');
  });

  it('should recommend XL for heavy ADAS workloads', () => {
    const result = getGenerationRecommendation({
      payloadBytes: 512,
      updateHz: 40,
      profile: 'ADAS',
    });
    expect(result.recommended).toBe('XL');
  });

  it('should recommend XL for large OTA transfers', () => {
    const result = getGenerationRecommendation({
      payloadBytes: 1024,
      updateHz: 10,
      profile: 'OTA',
    });
    expect(result.recommended).toBe('XL');
  });

  it('should always return exactly 2 alternatives', () => {
    const result = getGenerationRecommendation({
      payloadBytes: 24,
      updateHz: 50,
      profile: 'Powertrain',
    });
    expect(result.alternatives).toHaveLength(2);
  });

  it('should return confidence of either "high" or "medium"', () => {
    const result = getGenerationRecommendation({
      payloadBytes: 56,
      updateHz: 30,
      profile: 'Diagnostics',
    });
    expect(['high', 'medium']).toContain(result.confidence);
  });

  it('should include a non-empty reason string', () => {
    const result = getGenerationRecommendation({
      payloadBytes: 8,
      updateHz: 10,
      profile: 'Body',
    });
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it('should mention estimated load in the reason', () => {
    const result = getGenerationRecommendation({
      payloadBytes: 8,
      updateHz: 10,
      profile: 'Body',
    });
    expect(result.reason).toContain('Estimated load:');
  });

  it('should never recommend a generation that also appears in alternatives', () => {
    const profiles: UseCaseProfile[] = ['Body', 'Powertrain', 'Diagnostics', 'ADAS', 'OTA'];
    for (const profile of profiles) {
      const result = getGenerationRecommendation({
        payloadBytes: 64,
        updateHz: 50,
        profile,
      });
      const altIds = result.alternatives.map(a => a.id);
      expect(altIds).not.toContain(result.recommended);
    }
  });

  it('should cover all three generations across recommended + alternatives', () => {
    const result = getGenerationRecommendation({
      payloadBytes: 24,
      updateHz: 50,
      profile: 'Powertrain',
    });
    const allIds = [result.recommended, ...result.alternatives.map(a => a.id)];
    expect(new Set(allIds).size).toBe(3);
  });
});

// ----------------------------------------------------------------
// parseGenerationQuery — URL → state
// ----------------------------------------------------------------
describe('parseGenerationQuery — URL search params to state', () => {
  it('should return defaults for an empty query string', () => {
    const state = parseGenerationQuery(new URLSearchParams(''));
    expect(state.primary).toBe('Classic');
    expect(state.compare).toBe('FD');
    expect(state.scenario).toBe('diagnostics');
    expect(state.sideBySide).toBe(false);
  });

  it('should parse all valid parameters', () => {
    const state = parseGenerationQuery(
      new URLSearchParams('primary=XL&compare=Classic&scenario=powertrain&view=side')
    );
    expect(state.primary).toBe('XL');
    expect(state.compare).toBe('Classic');
    expect(state.scenario).toBe('powertrain');
    expect(state.sideBySide).toBe(true);
  });

  it('should be case-insensitive for generation IDs', () => {
    const state = parseGenerationQuery(new URLSearchParams('primary=classic&compare=fd'));
    expect(state.primary).toBe('Classic');
    expect(state.compare).toBe('FD');
  });

  it('should force compare to differ from primary when both are the same', () => {
    const state = parseGenerationQuery(new URLSearchParams('primary=FD&compare=FD'));
    expect(state.primary).toBe('FD');
    expect(state.compare).not.toBe('FD');
  });

  it('should fall back to default when generation ID is invalid', () => {
    const state = parseGenerationQuery(new URLSearchParams('primary=INVALID'));
    expect(state.primary).toBe('Classic');
  });

  it('should fall back to default scenario when scenario ID is invalid', () => {
    const state = parseGenerationQuery(new URLSearchParams('scenario=nonexistent'));
    expect(state.scenario).toBe('diagnostics');
  });

  it('should treat view=side as sideBySide true, anything else as false', () => {
    expect(parseGenerationQuery(new URLSearchParams('view=side')).sideBySide).toBe(true);
    expect(parseGenerationQuery(new URLSearchParams('view=SIDE')).sideBySide).toBe(true);
    expect(parseGenerationQuery(new URLSearchParams('view=grid')).sideBySide).toBe(false);
    expect(parseGenerationQuery(new URLSearchParams('')).sideBySide).toBe(false);
  });
});

// ----------------------------------------------------------------
// buildGenerationQuery — state → URL
// ----------------------------------------------------------------
describe('buildGenerationQuery — state to URL search params', () => {
  it('should produce params with primary, compare, and scenario', () => {
    const params = buildGenerationQuery({
      primary: 'Classic',
      compare: 'FD',
      scenario: 'diagnostics',
      sideBySide: false,
    });
    expect(params.get('primary')).toBe('Classic');
    expect(params.get('compare')).toBe('FD');
    expect(params.get('scenario')).toBe('diagnostics');
  });

  it('should include view=side only when sideBySide is true', () => {
    const withSide = buildGenerationQuery({
      primary: 'Classic', compare: 'FD', scenario: 'diagnostics', sideBySide: true,
    });
    const withoutSide = buildGenerationQuery({
      primary: 'Classic', compare: 'FD', scenario: 'diagnostics', sideBySide: false,
    });
    expect(withSide.get('view')).toBe('side');
    expect(withoutSide.get('view')).toBeNull();
  });

  it('should force compare to differ from primary in the output', () => {
    const params = buildGenerationQuery({
      primary: 'XL',
      compare: 'XL',
      scenario: 'diagnostics',
      sideBySide: false,
    });
    expect(params.get('compare')).not.toBe('XL');
  });
});

// ----------------------------------------------------------------
// applyGenerationQueryPatch — partial state merge
// ----------------------------------------------------------------
describe('applyGenerationQueryPatch — merging partial updates', () => {
  const baseState = {
    primary: 'Classic' as GenerationId,
    compare: 'FD' as GenerationId,
    scenario: 'diagnostics' as const,
    sideBySide: false,
  };

  it('should preserve unpatched fields', () => {
    const result = applyGenerationQueryPatch(baseState, { sideBySide: true });
    expect(result.primary).toBe('Classic');
    expect(result.compare).toBe('FD');
    expect(result.scenario).toBe('diagnostics');
    expect(result.sideBySide).toBe(true);
  });

  it('should apply a new primary generation', () => {
    const result = applyGenerationQueryPatch(baseState, { primary: 'XL' });
    expect(result.primary).toBe('XL');
  });

  it('should force compare to differ from primary after patching', () => {
    const result = applyGenerationQueryPatch(baseState, {
      primary: 'FD',
      compare: 'FD',
    });
    expect(result.primary).toBe('FD');
    expect(result.compare).not.toBe('FD');
  });

  it('should apply scenario patch', () => {
    const result = applyGenerationQueryPatch(baseState, { scenario: 'sensor-heavy' });
    expect(result.scenario).toBe('sensor-heavy');
  });

  it('should handle an empty patch (no-op)', () => {
    const result = applyGenerationQueryPatch(baseState, {});
    expect(result).toEqual(baseState);
  });

  it('should handle patching all fields at once', () => {
    const result = applyGenerationQueryPatch(baseState, {
      primary: 'XL',
      compare: 'Classic',
      scenario: 'body-control',
      sideBySide: true,
    });
    expect(result.primary).toBe('XL');
    expect(result.compare).toBe('Classic');
    expect(result.scenario).toBe('body-control');
    expect(result.sideBySide).toBe(true);
  });
});

// ----------------------------------------------------------------
// Round-trip: parse → build → parse
// ----------------------------------------------------------------
describe('Query state round-trip — parse → build → parse', () => {
  it('should survive a round-trip for each predefined scenario', () => {
    for (const scenario of SCENARIOS) {
      const original = parseGenerationQuery(
        new URLSearchParams(`primary=FD&compare=Classic&scenario=${scenario.id}&view=side`)
      );
      const params = buildGenerationQuery(original);
      const recovered = parseGenerationQuery(params);

      expect(recovered.primary).toBe(original.primary);
      expect(recovered.compare).toBe(original.compare);
      expect(recovered.scenario).toBe(original.scenario);
      expect(recovered.sideBySide).toBe(original.sideBySide);
    }
  });
});
