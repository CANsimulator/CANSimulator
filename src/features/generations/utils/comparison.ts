import { GENERATIONS, GENERATION_ORDER, PROFILE_HINTS } from '../data';
import type {
  BusLoadEstimate,
  GenerationId,
  GenerationSpec,
  RecommendationResult,
  UseCaseProfile,
} from '../types';

const OVERHEAD_BITS: Record<GenerationId, number> = {
  Classic: 110,
  FD: 140,
  XL: 220,
};

const STUFFING_MARGIN: Record<GenerationId, number> = {
  Classic: 1.18,
  FD: 1.12,
  XL: 1.08,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function estimateFrameCount(payloadBytes: number, generation: GenerationSpec): number {
  const safePayload = Math.max(1, Math.floor(payloadBytes));
  return Math.ceil(safePayload / generation.maxPayloadBytes);
}

export function estimateBusLoad(
  payloadBytes: number,
  updateHz: number,
  generation: GenerationSpec
): BusLoadEstimate {
  const safePayload = Math.max(1, Math.floor(payloadBytes));
  const safeRate = Math.max(1, Math.floor(updateHz));
  const frameCount = estimateFrameCount(safePayload, generation);
  const payloadBitsPerMessage = safePayload * 8;
  const bitsPerFrame = payloadBitsPerMessage / frameCount + OVERHEAD_BITS[generation.id];
  const bitsPerMessage = bitsPerFrame * frameCount * STUFFING_MARGIN[generation.id];
  const estimatedBitsPerSecond = bitsPerMessage * safeRate;
  const capacityBps = generation.maxDataRateMbps * 1_000_000;
  const loadPercent = (estimatedBitsPerSecond / capacityBps) * 100;

  return {
    generation: generation.id,
    frameCount,
    payloadBitsPerMessage,
    estimatedBitsPerSecond: Math.round(estimatedBitsPerSecond),
    loadPercent: Number(clamp(loadPercent, 0, 999).toFixed(2)),
    estimatedLatencyMs: Number((1000 / safeRate).toFixed(2)),
  };
}

function profileBonus(profile: UseCaseProfile, generationId: GenerationId): number {
  const table: Record<UseCaseProfile, Record<GenerationId, number>> = {
    Body: { Classic: 16, FD: 8, XL: -4 },
    Powertrain: { Classic: 8, FD: 14, XL: 6 },
    Diagnostics: { Classic: 4, FD: 16, XL: 10 },
    ADAS: { Classic: -8, FD: 10, XL: 18 },
    OTA: { Classic: -10, FD: 12, XL: 18 },
  };
  return table[profile][generationId];
}

function compatibilityBonus(generationId: GenerationId): number {
  if (generationId === 'Classic') return 8;
  if (generationId === 'FD') return 4;
  return 2;
}

export function getGenerationRecommendation(input: {
  payloadBytes: number;
  updateHz: number;
  profile: UseCaseProfile;
}): RecommendationResult {
  const scored = GENERATION_ORDER.map((id) => {
    const spec = GENERATIONS[id];
    const load = estimateBusLoad(input.payloadBytes, input.updateHz, spec);
    const frameCountPenalty = estimateFrameCount(input.payloadBytes, spec) > 10 ? -10 : 0;
    const highLoadPenalty = load.loadPercent > 85 ? -30 : load.loadPercent > 65 ? -14 : 0;
    const payloadPenalty = input.payloadBytes > spec.maxPayloadBytes ? -18 : 6;

    const score =
      100 +
      profileBonus(input.profile, id) +
      compatibilityBonus(id) +
      payloadPenalty +
      frameCountPenalty +
      highLoadPenalty;

    return { id, score, loadPercent: load.loadPercent };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1];
  const confidence = best.score - second.score >= 12 ? 'high' : 'medium';

  const reason =
    `${best.id} is the strongest fit for ${input.payloadBytes}B @ ${input.updateHz}Hz in ${input.profile}. ` +
    `${PROFILE_HINTS[input.profile]} Estimated load: ${best.loadPercent.toFixed(2)}%.`;

  return {
    recommended: best.id,
    confidence,
    reason,
    alternatives: scored.slice(1, 3).map((item) => ({
      id: item.id,
      reason: `Alternative with estimated load ${item.loadPercent.toFixed(2)}%.`,
    })),
  };
}

