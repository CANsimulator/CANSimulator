'use client'

import { useState, useCallback } from 'react'

type StateId = 'error-active' | 'error-passive' | 'bus-off' | 'transition-ap' | 'transition-pb' | 'recovery' | null

interface StateInfo {
  label: string
  description: string
  detail: string
}

const INFO: Record<Exclude<StateId, null>, StateInfo> = {
  'error-active': {
    label: 'Error-Active (Normal)',
    description:
      'The default operating state. TEC ≤ 127 and REC ≤ 127. The node participates fully in bus communication and sends active error flags (6 dominant bits) when it detects an error.',
    detail: 'Successful TX: TEC−1. Successful RX: REC−1. TX error: TEC+8. RX error: REC+1.',
  },
  'error-passive': {
    label: 'Error-Passive',
    description:
      'TEC > 127 or REC > 127. The node sends passive error flags (6 recessive bits) that do not disturb other traffic. It must also wait an additional 8-bit "suspend transmission" period before transmitting again.',
    detail: 'The node is slowed down, giving healthy nodes priority on the bus.',
  },
  'bus-off': {
    label: 'Bus-Off',
    description:
      'TEC exceeds 255. The node disconnects from the bus entirely — it cannot transmit, receive, or send error flags. Recovery requires detecting 128 occurrences of 11 consecutive recessive bits.',
    detail: 'Most implementations also require a software trigger or power cycle to re-enable.',
  },
  'transition-ap': {
    label: 'Active → Passive Transition',
    description:
      'When TEC exceeds 127 or REC exceeds 127, the node transitions from Error-Active to Error-Passive. It continues communicating but with reduced aggressiveness.',
    detail: 'The asymmetric +8/+1 weighting means a faulty transmitter reaches this state in ~16 errors.',
  },
  'transition-pb': {
    label: 'Passive → Bus-Off Transition',
    description:
      'When TEC exceeds 255 (transmit errors only), the node transitions from Error-Passive to Bus-Off and disconnects. REC alone cannot cause Bus-Off.',
    detail: 'From Error-Passive (TEC=128), only ~16 more TX errors to reach Bus-Off.',
  },
  recovery: {
    label: 'Bus-Off Recovery',
    description:
      'After detecting 128 occurrences of 11 consecutive recessive bits (1,408 recessive bits total), TEC and REC reset to 0 and the node returns to Error-Active.',
    detail: '128 × 11 = 1,408 bits. At 500 kbit/s, this takes ~2.8 ms minimum if the bus is idle.',
  },
}

const W = 680
const H = 180
const BOX_W = 130
const BOX_H = 56
const BOX_Y = 50
const BOX_RX = 6

const STATES = [
  { id: 'error-active' as const, x: 60, color: '#00e676', label: 'Error-\nActive', sub: 'TEC≤127  REC≤127' },
  { id: 'error-passive' as const, x: 275, color: '#ffab00', label: 'Error-\nPassive', sub: 'TEC>127 or REC>127' },
  { id: 'bus-off' as const, x: 490, color: '#ff3d00', label: 'Bus-Off', sub: 'TEC>255' },
]

export function FaultStateMachine() {
  const [active, setActive] = useState<StateId>(null)

  const enter = useCallback((id: StateId) => setActive(id), [])
  const leave = useCallback(() => setActive(null), [])

  function op(id: StateId) {
    if (active === null) return 1
    return active === id ? 1 : 0.3
  }

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: CAN fault confinement state machine — hover on any state or transition
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Fault confinement state machine">
        {/* Forward arrows: Active → Passive → Bus-Off */}
        <g
          onMouseEnter={() => enter('transition-ap')}
          onMouseLeave={leave}
          className="cursor-pointer"
          style={{ opacity: op('transition-ap') }}
        >
          <line
            x1={STATES[0].x + BOX_W}
            y1={BOX_Y + BOX_H / 2 - 6}
            x2={STATES[1].x}
            y2={BOX_Y + BOX_H / 2 - 6}
            stroke={active === 'transition-ap' ? '#fff' : '#4a5568'}
            strokeWidth={active === 'transition-ap' ? 2 : 1.5}
            markerEnd="url(#arrowhead)"
          />
          <text
            x={(STATES[0].x + BOX_W + STATES[1].x) / 2}
            y={BOX_Y + BOX_H / 2 - 16}
            textAnchor="middle"
            fill={active === 'transition-ap' ? '#fff' : '#4a5568'}
            fontSize={8}
            fontFamily="var(--font-mono), monospace"
          >
            TEC&gt;127 or REC&gt;127
          </text>
        </g>

        <g
          onMouseEnter={() => enter('transition-pb')}
          onMouseLeave={leave}
          className="cursor-pointer"
          style={{ opacity: op('transition-pb') }}
        >
          <line
            x1={STATES[1].x + BOX_W}
            y1={BOX_Y + BOX_H / 2 - 6}
            x2={STATES[2].x}
            y2={BOX_Y + BOX_H / 2 - 6}
            stroke={active === 'transition-pb' ? '#fff' : '#4a5568'}
            strokeWidth={active === 'transition-pb' ? 2 : 1.5}
            markerEnd="url(#arrowhead)"
          />
          <text
            x={(STATES[1].x + BOX_W + STATES[2].x) / 2}
            y={BOX_Y + BOX_H / 2 - 16}
            textAnchor="middle"
            fill={active === 'transition-pb' ? '#fff' : '#4a5568'}
            fontSize={8}
            fontFamily="var(--font-mono), monospace"
          >
            TEC&gt;255
          </text>
        </g>

        {/* Reverse arrow: Passive → Active */}
        <g
          onMouseEnter={() => enter('transition-ap')}
          onMouseLeave={leave}
          className="cursor-pointer"
          style={{ opacity: op('transition-ap') }}
        >
          <line
            x1={STATES[1].x}
            y1={BOX_Y + BOX_H / 2 + 6}
            x2={STATES[0].x + BOX_W}
            y2={BOX_Y + BOX_H / 2 + 6}
            stroke={active === 'transition-ap' ? '#fff' : '#4a5568'}
            strokeWidth={active === 'transition-ap' ? 2 : 1.5}
            markerEnd="url(#arrowhead)"
          />
          <text
            x={(STATES[0].x + BOX_W + STATES[1].x) / 2}
            y={BOX_Y + BOX_H / 2 + 18}
            textAnchor="middle"
            fill={active === 'transition-ap' ? '#fff' : '#4a5568'}
            fontSize={8}
            fontFamily="var(--font-mono), monospace"
          >
            TEC≤127 and REC≤127
          </text>
        </g>

        {/* Recovery: Bus-Off → Error-Active (curved bottom path) */}
        <g
          onMouseEnter={() => enter('recovery')}
          onMouseLeave={leave}
          className="cursor-pointer"
          style={{ opacity: op('recovery') }}
        >
          <path
            d={`M ${STATES[2].x + BOX_W / 2} ${BOX_Y + BOX_H}
                L ${STATES[2].x + BOX_W / 2} ${BOX_Y + BOX_H + 36}
                L ${STATES[0].x + BOX_W / 2} ${BOX_Y + BOX_H + 36}
                L ${STATES[0].x + BOX_W / 2} ${BOX_Y + BOX_H}`}
            fill="none"
            stroke={active === 'recovery' ? '#00e676' : '#4a5568'}
            strokeWidth={active === 'recovery' ? 2 : 1.5}
            markerEnd="url(#arrowhead-green)"
          />
          <text
            x={(STATES[0].x + BOX_W / 2 + STATES[2].x + BOX_W / 2) / 2}
            y={BOX_Y + BOX_H + 48}
            textAnchor="middle"
            fill={active === 'recovery' ? '#00e676' : '#4a5568'}
            fontSize={9}
            fontWeight="bold"
            fontFamily="var(--font-mono), monospace"
          >
            128 × 11 recessive bits
          </text>
        </g>

        {/* State boxes */}
        {STATES.map((s) => (
          <g
            key={s.id}
            onMouseEnter={() => enter(s.id)}
            onMouseLeave={leave}
            className="cursor-pointer"
            style={{ opacity: op(s.id) }}
          >
            <rect
              x={s.x}
              y={BOX_Y}
              width={BOX_W}
              height={BOX_H}
              rx={BOX_RX}
              fill={active === s.id ? `${s.color}25` : '#111823'}
              stroke={active === s.id ? s.color : '#2d3748'}
              strokeWidth={active === s.id ? 2.5 : 1.5}
            />
            <text
              x={s.x + BOX_W / 2}
              y={BOX_Y + 22}
              textAnchor="middle"
              fill={active === s.id ? '#fff' : '#cbd5e0'}
              fontSize={13}
              fontWeight="bold"
              fontFamily="var(--font-body), system-ui, sans-serif"
            >
              {s.label.includes('\n')
                ? s.label.split('\n').map((line, i) => (
                    <tspan key={i} x={s.x + BOX_W / 2} dy={i === 0 ? 0 : 14}>
                      {line}
                    </tspan>
                  ))
                : s.label}
            </text>
            <text
              x={s.x + BOX_W / 2}
              y={BOX_Y + BOX_H - 8}
              textAnchor="middle"
              fill={active === s.id ? s.color : '#4a5568'}
              fontSize={8}
              fontFamily="var(--font-mono), monospace"
            >
              {s.sub}
            </text>
          </g>
        ))}

        {/* Arrow marker defs */}
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill="#4a5568" />
          </marker>
          <marker id="arrowhead-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill="#00e676" />
          </marker>
        </defs>
      </svg>

      {/* Info panel */}
      <div
        className="mt-2 rounded-md border border-neutral-700 bg-neutral-950 p-4 min-h-[72px] transition-opacity duration-150"
        style={{ opacity: active ? 1 : 0.5 }}
        aria-live="polite"
      >
        {active ? (
          <>
            <span className="font-semibold text-sm text-white block mb-1">
              {INFO[active].label}
            </span>
            <p className="text-sm text-neutral-300 mb-1">{INFO[active].description}</p>
            <p className="text-xs text-neutral-500 font-mono">{INFO[active].detail}</p>
          </>
        ) : (
          <p className="text-sm text-neutral-500 italic">
            Hover on any state or transition arrow to learn about the fault confinement lifecycle.
          </p>
        )}
      </div>
    </div>
  )
}
