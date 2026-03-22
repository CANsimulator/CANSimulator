import type { CompareScenario, GenerationId, GenerationSpec, UseCaseProfile } from './types';

export const GENERATIONS: Record<GenerationId, GenerationSpec> = {
  Classic: {
    id: 'Classic',
    title: 'Classical CAN',
    yearLabel: '1986',
    introducedYear: 1986,
    maxPayloadBytes: 8,
    maxDataRateMbps: 1,
    arbitrationRateMbps: 1,
    crcScheme: 'CRC-15',
    identifierSupport: '11-bit and 29-bit',
    compatibility: 'Legacy-friendly',
    summary:
      'Robust deterministic baseline for control traffic with low payload requirements.',
    changesFromPrevious: [
      'Baseline generation: introduced multi-master arbitration with dominant/recessive bus logic.',
      'Set strict 8-byte payload model focused on reliability and deterministic control traffic.',
    ],
    keyCapabilities: [
      'Non-destructive arbitration',
      'Strong fault confinement',
      'Mature ECU and toolchain support',
      'Simple deployment and diagnostics',
    ],
    typicalUseCases: [
      'Body electronics',
      'Powertrain controls',
      'Chassis communication',
      'Low-bandwidth diagnostics',
    ],
    constraints: [
      '8-byte payload limit',
      'Higher overhead for large transfers',
      'Limited throughput for sensor-heavy systems',
    ],
    accentTextClass: 'text-cyan-600 dark:text-cyan-300',
    accentBorderClass: 'border-cyan-500/30 dark:border-cyan-400/40',
    accentSurfaceClass: 'bg-cyan-500/5 dark:bg-cyan-400/10',
    accentSoftClass: 'bg-cyan-500/10 dark:bg-cyan-500/15',
  },
  FD: {
    id: 'FD',
    title: 'CAN FD',
    yearLabel: '2012',
    introducedYear: 2012,
    maxPayloadBytes: 64,
    maxDataRateMbps: 8,
    arbitrationRateMbps: 1,
    crcScheme: 'CRC-17 / CRC-21',
    identifierSupport: '11-bit and 29-bit',
    compatibility: 'Mixed-network caution',
    summary:
      'Flexible data-rate generation balancing legacy topology compatibility and major payload gains.',
    changesFromPrevious: [
      'Expanded payload from 8 bytes to 64 bytes for lower application-layer fragmentation.',
      'Added Bit Rate Switch (BRS) to keep arbitration stable while accelerating data phase.',
      'Improved error-detection strength through CRC-17 and CRC-21.',
    ],
    keyCapabilities: [
      '64-byte data payload',
      'Flexible data-rate phase',
      'Higher effective throughput with existing CAN workflows',
      'Improved protocol efficiency for diagnostics and updates',
    ],
    typicalUseCases: [
      'Diagnostics burst traffic',
      'Firmware update pipelines',
      'Gateway communication',
      'Moderate sensor fusion feeds',
    ],
    constraints: [
      'Mixed Classic/FD networks require compatibility planning',
      'Transceiver quality and timing tuning become more critical at high data rates',
      'Legacy tooling may need upgrades',
    ],
    accentTextClass: 'text-violet-600 dark:text-violet-300',
    accentBorderClass: 'border-violet-500/30 dark:border-violet-400/40',
    accentSurfaceClass: 'bg-violet-500/5 dark:bg-violet-400/10',
    accentSoftClass: 'bg-violet-500/10 dark:bg-violet-500/15',
  },
  XL: {
    id: 'XL',
    title: 'CAN XL',
    yearLabel: '2024',
    introducedYear: 2024,
    maxPayloadBytes: 2048,
    maxDataRateMbps: 20,
    arbitrationRateMbps: 1,
    crcScheme: 'Enhanced multi-stage CRC',
    identifierSupport: 'Acceptance Field + VCID',
    compatibility: 'Future-ready',
    summary:
      'High-capacity CAN generation intended for software-defined architectures and heavy payload movement.',
    changesFromPrevious: [
      'Raised payload ceiling to 2048 bytes to reduce transport-layer overhead dramatically.',
      'Introduced Virtual CAN Network ID (VCID) and richer acceptance-field model.',
      'Designed for high-throughput domains bridging CAN ecosystems and Ethernet-centric stacks.',
    ],
    keyCapabilities: [
      'Up to 2048-byte payload',
      '20 Mbit/s physical-layer targets',
      'Virtual network segmentation capabilities',
      'Large-payload friendliness for modern zonal platforms',
    ],
    typicalUseCases: [
      'High-bandwidth diagnostics and telemetry',
      'Central compute domain traffic',
      'ADAS/SDV data movement',
      'Large payload tunneling scenarios',
    ],
    constraints: [
      'Ecosystem maturity still evolving compared with Classic CAN',
      'Rollout requires hardware, tooling, and validation refresh',
      'Migration planning is mandatory for mixed fleets',
    ],
    accentTextClass: 'text-emerald-600 dark:text-emerald-300',
    accentBorderClass: 'border-emerald-500/30 dark:border-emerald-400/40',
    accentSurfaceClass: 'bg-emerald-500/5 dark:bg-emerald-400/10',
    accentSoftClass: 'bg-emerald-500/10 dark:bg-emerald-500/15',
  },
};

export const GENERATION_ORDER: GenerationId[] = ['Classic', 'FD', 'XL'];

export const SCENARIOS: CompareScenario[] = [
  {
    id: 'body-control',
    label: 'Body control low payload',
    shortLabel: 'Body control',
    description: 'Frequent short control messages for actuators, lights, and comfort features.',
    payloadBytes: 6,
    updateHz: 20,
  },
  {
    id: 'powertrain',
    label: 'Powertrain medium payload',
    shortLabel: 'Powertrain',
    description: 'Moderate payloads with strict timing around engine and drivetrain coordination.',
    payloadBytes: 24,
    updateHz: 50,
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics burst',
    shortLabel: 'Diagnostics',
    description: 'Bursty service traffic with longer payloads during maintenance and flashing.',
    payloadBytes: 56,
    updateHz: 30,
  },
  {
    id: 'sensor-heavy',
    label: 'Sensor-heavy high payload',
    shortLabel: 'Sensor-heavy',
    description: 'Large and frequent data movement for sensor-rich and compute-heavy domains.',
    payloadBytes: 512,
    updateHz: 40,
  },
];

export const PROFILE_HINTS: Record<UseCaseProfile, string> = {
  Body: 'Control-oriented systems prioritize deterministic timing and broad compatibility.',
  Powertrain:
    'Powertrain domains need deterministic timing with enough payload room for richer data maps.',
  Diagnostics:
    'Diagnostics and update workflows benefit from lower fragmentation and better throughput.',
  ADAS: 'ADAS and high-volume telemetry pipelines need scalable payload and throughput headroom.',
  OTA: 'OTA and large data transfer scenarios favor larger frames and future-ready network segmentation.',
};

export const COMPATIBILITY_DESCRIPTIONS = {
  'Legacy-friendly': 'Best fit for mature fleets and broad existing ECU compatibility.',
  'Mixed-network caution': 'Strong upgrade path, but mixed Classic/FD deployments require planning.',
  'Future-ready': 'Designed for next-gen architectures with higher deployment complexity.',
} as const;

