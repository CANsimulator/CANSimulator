'use client'

import { useState, useCallback } from 'react'

type SegmentId = 'sync' | 'tseg1' | 'tseg2' | 'sample' | 'sjw' | null

interface SegInfo {
  label: string
  description: string
  detail: string
}

const INFO: Record<Exclude<SegmentId, null>, SegInfo> = {
  sync: {
    label: 'Sync Seg (1 Tq)',
    description:
      'The synchronization segment is always exactly 1 time quantum long. The bus edge (transition from recessive to dominant, or vice versa) is expected to occur during this segment. When it does, no clock correction is needed.',
    detail:
      'Hard synchronization on SOF resets the bit counter here. During the rest of the frame, resynchronization adjusts TSEG1/TSEG2 instead.',
  },
  tseg1: {
    label: 'TSEG1 (Prop Seg + Phase Seg 1)',
    description:
      'Time Segment 1 compensates for propagation delay across the bus and provides a phase-error buffer before the sample point. Most CAN controllers combine the ISO-defined "Propagation Segment" and "Phase Segment 1" into a single TSEG1 register.',
    detail:
      'Range: 1–256 Tq (controller-dependent). Longer buses need more Tq in TSEG1 to cover round-trip propagation delay + transceiver loop delay.',
  },
  tseg2: {
    label: 'TSEG2 (Phase Seg 2)',
    description:
      'Time Segment 2 provides a phase-error buffer after the sample point. It determines how much time remains in the bit after the bus level has been sampled. Must be at least as large as the Information Processing Time (IPT).',
    detail:
      'Range: 1–128 Tq. IPT is typically 1–2 Tq. If TSEG2 is too short, the controller cannot process the sampled bit before the next one starts.',
  },
  sample: {
    label: 'Sample Point',
    description:
      'The exact instant when the CAN controller reads the bus level and decides whether the current bit is dominant (0) or recessive (1). It falls at the boundary between TSEG1 and TSEG2.',
    detail:
      'Sample Point (%) = (1 + TSEG1) / (1 + TSEG1 + TSEG2) × 100. Recommended range: 75%–87.5%. CiA recommends 87.5%, J1939 uses 80%.',
  },
  sjw: {
    label: 'SJW (Synchronization Jump Width)',
    description:
      'The maximum number of time quanta by which the controller may shorten or lengthen a bit to re-synchronize with the bus. If an edge arrives early (in TSEG1), the bit is shortened. If late (in TSEG2), the bit is lengthened.',
    detail:
      'Range: 1–min(4, TSEG2). Larger SJW tolerates more clock drift but introduces more jitter at the sample point. SJW = 1 is typical.',
  },
}

// Layout
const W = 700
const H = 160
const BAR_Y = 40
const BAR_H = 48
const SYNC_TQ = 1
const TSEG1_TQ = 13
const TSEG2_TQ = 2
const TOTAL_TQ = SYNC_TQ + TSEG1_TQ + TSEG2_TQ

const SYNC_COLOR = '#78909c'
const TSEG1_COLOR = '#00b8d4'
const TSEG2_COLOR = '#7c4dff'
const SAMPLE_COLOR = '#ffab00'
const SJW_COLOR = '#ff3d00'

function tqToX(tq: number): number {
  const padL = 40
  const padR = 40
  const usable = W - padL - padR
  return padL + (tq / TOTAL_TQ) * usable
}

function tqToW(tq: number): number {
  const padL = 40
  const padR = 40
  const usable = W - padL - padR
  return (tq / TOTAL_TQ) * usable
}

export function BitAnatomy() {
  const [active, setActive] = useState<SegmentId>(null)

  const enter = useCallback((id: SegmentId) => setActive(id), [])
  const leave = useCallback(() => setActive(null), [])

  function op(id: SegmentId) {
    if (active === null) return 1
    return active === id ? 1 : 0.3
  }

  const syncX = tqToX(0)
  const syncW = tqToW(SYNC_TQ)
  const tseg1X = tqToX(SYNC_TQ)
  const tseg1W = tqToW(TSEG1_TQ)
  const tseg2X = tqToX(SYNC_TQ + TSEG1_TQ)
  const tseg2W = tqToW(TSEG2_TQ)
  const sampleX = tseg2X

  // SJW range: ±1 Tq around sample point
  const sjwW = tqToW(1)

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: CAN bit anatomy — hover on any segment
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="CAN bit time segment diagram"
      >
        {/* Sync Seg */}
        <g
          onMouseEnter={() => enter('sync')}
          onMouseLeave={leave}
          className="cursor-pointer"
          style={{ opacity: op('sync') }}
        >
          <rect
            x={syncX}
            y={BAR_Y}
            width={syncW}
            height={BAR_H}
            rx={4}
            fill={active === 'sync' ? SYNC_COLOR : `${SYNC_COLOR}cc`}
            stroke={active === 'sync' ? '#fff' : 'none'}
            strokeWidth={1.5}
          />
          <text
            x={syncX + syncW / 2}
            y={BAR_Y + BAR_H / 2 - 4}
            textAnchor="middle"
            fill="#fff"
            fontSize={10}
            fontWeight="bold"
            fontFamily="var(--font-mono), monospace"
          >
            Sync
          </text>
          <text
            x={syncX + syncW / 2}
            y={BAR_Y + BAR_H / 2 + 10}
            textAnchor="middle"
            fill="#ffffffaa"
            fontSize={8}
            fontFamily="var(--font-mono), monospace"
          >
            1 Tq
          </text>
        </g>

        {/* TSEG1 */}
        <g
          onMouseEnter={() => enter('tseg1')}
          onMouseLeave={leave}
          className="cursor-pointer"
          style={{ opacity: op('tseg1') }}
        >
          <rect
            x={tseg1X}
            y={BAR_Y}
            width={tseg1W}
            height={BAR_H}
            fill={active === 'tseg1' ? TSEG1_COLOR : `${TSEG1_COLOR}cc`}
            stroke={active === 'tseg1' ? '#fff' : 'none'}
            strokeWidth={1.5}
          />
          {/* Sub-segments indication */}
          <line
            x1={tseg1X + tseg1W * 0.45}
            y1={BAR_Y}
            x2={tseg1X + tseg1W * 0.45}
            y2={BAR_Y + BAR_H}
            stroke="#ffffff20"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={tseg1X + tseg1W * 0.22}
            y={BAR_Y + 14}
            textAnchor="middle"
            fill="#ffffffaa"
            fontSize={8}
            fontFamily="var(--font-mono), monospace"
          >
            Prop Seg
          </text>
          <text
            x={tseg1X + tseg1W * 0.72}
            y={BAR_Y + 14}
            textAnchor="middle"
            fill="#ffffffaa"
            fontSize={8}
            fontFamily="var(--font-mono), monospace"
          >
            Phase Seg 1
          </text>
          <text
            x={tseg1X + tseg1W / 2}
            y={BAR_Y + BAR_H / 2 + 4}
            textAnchor="middle"
            fill="#fff"
            fontSize={12}
            fontWeight="bold"
            fontFamily="var(--font-mono), monospace"
          >
            TSEG1
          </text>
          <text
            x={tseg1X + tseg1W / 2}
            y={BAR_Y + BAR_H / 2 + 17}
            textAnchor="middle"
            fill="#ffffffaa"
            fontSize={9}
            fontFamily="var(--font-mono), monospace"
          >
            {TSEG1_TQ} Tq
          </text>
        </g>

        {/* TSEG2 */}
        <g
          onMouseEnter={() => enter('tseg2')}
          onMouseLeave={leave}
          className="cursor-pointer"
          style={{ opacity: op('tseg2') }}
        >
          <rect
            x={tseg2X}
            y={BAR_Y}
            width={tseg2W}
            height={BAR_H}
            rx={0}
            fill={active === 'tseg2' ? TSEG2_COLOR : `${TSEG2_COLOR}cc`}
            stroke={active === 'tseg2' ? '#fff' : 'none'}
            strokeWidth={1.5}
          />
          <text
            x={tseg2X + tseg2W / 2}
            y={BAR_Y + BAR_H / 2 - 2}
            textAnchor="middle"
            fill="#fff"
            fontSize={11}
            fontWeight="bold"
            fontFamily="var(--font-mono), monospace"
          >
            TSEG2
          </text>
          <text
            x={tseg2X + tseg2W / 2}
            y={BAR_Y + BAR_H / 2 + 12}
            textAnchor="middle"
            fill="#ffffffaa"
            fontSize={9}
            fontFamily="var(--font-mono), monospace"
          >
            {TSEG2_TQ} Tq
          </text>
        </g>

        {/* Sample point marker */}
        <g
          onMouseEnter={() => enter('sample')}
          onMouseLeave={leave}
          className="cursor-pointer"
          style={{ opacity: op('sample') }}
        >
          {/* Clickable hit area */}
          <rect
            x={sampleX - 8}
            y={BAR_Y - 20}
            width={16}
            height={BAR_H + 45}
            fill="transparent"
          />
          {/* Marker line */}
          <line
            x1={sampleX}
            y1={BAR_Y - 12}
            x2={sampleX}
            y2={BAR_Y + BAR_H + 6}
            stroke={SAMPLE_COLOR}
            strokeWidth={active === 'sample' ? 3 : 2}
          />
          {/* Diamond marker */}
          <polygon
            points={`${sampleX},${BAR_Y - 16} ${sampleX + 5},${BAR_Y - 11} ${sampleX},${BAR_Y - 6} ${sampleX - 5},${BAR_Y - 11}`}
            fill={SAMPLE_COLOR}
          />
          {/* Label */}
          <text
            x={sampleX}
            y={BAR_Y + BAR_H + 20}
            textAnchor="middle"
            fill={active === 'sample' ? SAMPLE_COLOR : '#a0aec0'}
            fontSize={10}
            fontWeight="bold"
            fontFamily="var(--font-mono), monospace"
          >
            Sample Point
          </text>
          {/* Percentage */}
          <text
            x={sampleX}
            y={BAR_Y + BAR_H + 32}
            textAnchor="middle"
            fill={active === 'sample' ? SAMPLE_COLOR : '#718096'}
            fontSize={9}
            fontFamily="var(--font-mono), monospace"
          >
            {((1 + TSEG1_TQ) / TOTAL_TQ * 100).toFixed(1)}%
          </text>
        </g>

        {/* Bit start arrow */}
        <g style={{ opacity: active === null || active === 'sync' ? 1 : 0.3 }}>
          <line
            x1={syncX}
            y1={BAR_Y + BAR_H + 6}
            x2={syncX}
            y2={BAR_Y + BAR_H + 18}
            stroke="#718096"
            strokeWidth={1}
          />
          <text
            x={syncX}
            y={BAR_Y + BAR_H + 28}
            textAnchor="middle"
            fill="#718096"
            fontSize={9}
            fontFamily="var(--font-mono), monospace"
          >
            bit start
          </text>
        </g>

        {/* SJW range brackets */}
        <g
          onMouseEnter={() => enter('sjw')}
          onMouseLeave={leave}
          className="cursor-pointer"
          style={{ opacity: op('sjw') }}
        >
          {/* Clickable hit area */}
          <rect
            x={sampleX - sjwW - 4}
            y={BAR_Y - 24}
            width={sjwW * 2 + 8}
            height={12}
            fill="transparent"
          />
          {/* Left bracket */}
          <line
            x1={sampleX - sjwW}
            y1={BAR_Y - 22}
            x2={sampleX - sjwW}
            y2={BAR_Y - 14}
            stroke={SJW_COLOR}
            strokeWidth={1.5}
          />
          {/* Horizontal line */}
          <line
            x1={sampleX - sjwW}
            y1={BAR_Y - 18}
            x2={sampleX + sjwW}
            y2={BAR_Y - 18}
            stroke={SJW_COLOR}
            strokeWidth={1.5}
          />
          {/* Right bracket */}
          <line
            x1={sampleX + sjwW}
            y1={BAR_Y - 22}
            x2={sampleX + sjwW}
            y2={BAR_Y - 14}
            stroke={SJW_COLOR}
            strokeWidth={1.5}
          />
          {/* Label */}
          <text
            x={sampleX}
            y={BAR_Y - 26}
            textAnchor="middle"
            fill={active === 'sjw' ? SJW_COLOR : '#4a5568'}
            fontSize={8}
            fontWeight="bold"
            fontFamily="var(--font-mono), monospace"
          >
            ±SJW
          </text>
        </g>

        {/* Total bit time label */}
        <g style={{ opacity: active === null ? 0.6 : 0.25 }}>
          <line
            x1={syncX}
            y1={BAR_Y - 4}
            x2={tseg2X + tseg2W}
            y2={BAR_Y - 4}
            stroke="#4a5568"
            strokeWidth={0.5}
          />
          <text
            x={(syncX + tseg2X + tseg2W) / 2}
            y={BAR_Y - 8}
            textAnchor="middle"
            fill="#4a5568"
            fontSize={8}
            fontFamily="var(--font-mono), monospace"
          >
            1 bit = {TOTAL_TQ} Tq
          </text>
        </g>
      </svg>

      {/* Info panel */}
      <div
        className="mt-2 rounded-md border border-neutral-700 bg-neutral-950 p-4 min-h-[72px] transition-opacity duration-150"
        style={{ opacity: active ? 1 : 0.5 }}
        aria-live="polite"
      >
        {active ? (
          <>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{
                  backgroundColor:
                    active === 'sync' ? SYNC_COLOR
                    : active === 'tseg1' ? TSEG1_COLOR
                    : active === 'tseg2' ? TSEG2_COLOR
                    : active === 'sample' ? SAMPLE_COLOR
                    : SJW_COLOR,
                }}
              />
              <span className="font-semibold text-sm text-white">
                {INFO[active].label}
              </span>
            </div>
            <p className="text-sm text-neutral-300 mb-1">
              {INFO[active].description}
            </p>
            <p className="text-xs text-neutral-500 font-mono">
              {INFO[active].detail}
            </p>
          </>
        ) : (
          <p className="text-sm text-neutral-500 italic">
            Hover or tap a segment above to learn about Sync Seg, TSEG1, TSEG2, the sample point, or SJW.
          </p>
        )}
      </div>
    </div>
  )
}
