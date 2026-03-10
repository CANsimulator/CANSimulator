export type GenerationId = 'Classic' | 'FD' | 'XL';

export type CompatibilityBadge =
  | 'Legacy-friendly'
  | 'Mixed-network caution'
  | 'Future-ready';

export type UseCaseProfile =
  | 'Body'
  | 'Powertrain'
  | 'Diagnostics'
  | 'ADAS'
  | 'OTA';

export interface GenerationSpec {
  id: GenerationId;
  title: string;
  yearLabel: string;
  introducedYear: number;
  maxPayloadBytes: number;
  maxDataRateMbps: number;
  arbitrationRateMbps: number;
  crcScheme: string;
  identifierSupport: string;
  compatibility: CompatibilityBadge;
  summary: string;
  changesFromPrevious: string[];
  keyCapabilities: string[];
  typicalUseCases: string[];
  constraints: string[];
  accentTextClass: string;
  accentBorderClass: string;
  accentSurfaceClass: string;
  accentSoftClass: string;
}

export interface CompareScenario {
  id: 'body-control' | 'powertrain' | 'diagnostics' | 'sensor-heavy';
  label: string;
  shortLabel: string;
  description: string;
  payloadBytes: number;
  updateHz: number;
}

export interface BusLoadEstimate {
  generation: GenerationId;
  frameCount: number;
  payloadBitsPerMessage: number;
  estimatedBitsPerSecond: number;
  loadPercent: number;
  estimatedLatencyMs: number;
}

export interface RecommendationResult {
  recommended: GenerationId;
  confidence: 'high' | 'medium';
  reason: string;
  alternatives: Array<{ id: GenerationId; reason: string }>;
}

export interface GenerationQueryState {
  primary: GenerationId;
  compare: GenerationId;
  scenario: CompareScenario['id'];
  sideBySide: boolean;
}
