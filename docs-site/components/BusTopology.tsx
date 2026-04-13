'use client'

import { useState, useCallback } from 'react'

type ElementId =
  | 'node-a'
  | 'node-b'
  | 'node-c'
  | 'node-d'
  | 'backbone'
  | 'term-left'
  | 'term-right'
  | 'stub-a'
  | 'stub-b'
  | 'stub-c'
  | 'stub-d'
  | null

interface ElementInfo {
  label: string
  description: string
  detail: string
}

const INFO: Record<Exclude<ElementId, null>, ElementInfo> = {
  'node-a': {
    label: 'Node A (ECU)',
    description:
      'Each node contains a microcontroller and a CAN transceiver. The transceiver converts single-ended logic (TXD/RXD) to/from the differential bus.',
    detail: 'Typical transceivers: TJA1050, MCP2551, SN65HVD230',
  },
  'node-b': {
    label: 'Node B (ECU)',
    description:
      'All nodes are equal peers on the bus — any node can transmit when the bus is idle. Priority is determined by message ID, not physical position.',
    detail: 'Multi-master: no central controller needed',
  },
  'node-c': {
    label: 'Node C (ECU)',
    description:
      'Nodes tap into the backbone through short stubs. The node\'s physical position on the bus does not affect its priority or behavior.',
    detail: 'Bus topology allows easy addition/removal of nodes',
  },
  'node-d': {
    label: 'Node D (ECU)',
    description:
      'In a typical vehicle, each ECU handles a specific domain: engine management, ABS, body electronics, infotainment gateway, etc.',
    detail: 'A modern car may have 70+ ECUs across multiple CAN buses',
  },
  backbone: {
    label: 'Backbone (CANH + CANL)',
    description:
      'The backbone is a single unshielded twisted pair carrying two differential signals: CANH (high) and CANL (low). The twist rejects electromagnetic interference.',
    detail: 'AWG 22–24, ~120 Ω characteristic impedance, 1–2 twists/inch',
  },
  'term-left': {
    label: 'Termination Resistor (120 Ω)',
    description:
      'Absorbs signal reflections at the cable end. Without it, transmitted signals bounce back and corrupt subsequent bits — especially at higher bit rates.',
    detail:
      'Two 120 Ω in parallel = 60 Ω DC load. Measure CANH↔CANL with bus off: expect ~60 Ω.',
  },
  'term-right': {
    label: 'Termination Resistor (120 Ω)',
    description:
      'Must be placed at each physical end of the backbone. Missing or misplaced terminators are the #1 cause of intermittent CAN failures.',
    detail:
      '120 Ω = missing one terminator. 40 Ω = extra terminator added.',
  },
  'stub-a': {
    label: 'Stub (Node A)',
    description:
      'Short cable connecting the node to the backbone. Must be kept as short as possible to avoid signal reflections.',
    detail: '< 30 cm at 500 kbit/s, < 10 cm at 1 Mbit/s',
  },
  'stub-b': {
    label: 'Stub (Node B)',
    description:
      'Long stubs act as unterminated transmission line branches, creating reflections that corrupt the bus signal.',
    detail: 'Reflections from long stubs are invisible at low bit rates but fatal at 500 kbit/s+',
  },
  'stub-c': {
    label: 'Stub (Node C)',
    description:
      'In production vehicles, stubs are typically just the PCB trace from the transceiver to the bus connector — effectively zero length.',
    detail: 'Lab setups with meter-long patch cables are a common source of debugging headaches',
  },
  'stub-d': {
    label: 'Stub (Node D)',
    description:
      'Each stub should be as short as physically possible. Star topologies (equal-length branches from a central point) are specifically discouraged for high-speed CAN.',
    detail: 'Star topologies create multiple unterminated reflections',
  },
}

// Layout constants for the SVG
const W = 720
const H = 280
const BACKBONE_Y = 170
const NODE_Y = 30
const NODE_W = 90
const NODE_H = 56
const NODE_SPACING = 150
const FIRST_NODE_X = 120
const TERM_SIZE = 16
const CANH_COLOR = '#00e5ff'
const CANL_COLOR = '#e040fb'
const STUB_COLOR = '#4a5568'
const NODE_FILL = '#111823'
const NODE_STROKE = '#2d3748'

function nodeX(i: number) {
  return FIRST_NODE_X + i * NODE_SPACING
}

// Resistor zigzag path
function resistorPath(cx: number, cy: number, vertical: boolean): string {
  const segs = 4
  const amp = 5
  const len = 20
  const step = len / segs

  if (vertical) {
    let d = `M ${cx} ${cy - len / 2}`
    for (let i = 0; i < segs; i++) {
      const dir = i % 2 === 0 ? amp : -amp
      d += ` L ${cx + dir} ${cy - len / 2 + step * (i + 0.5)}`
    }
    d += ` L ${cx} ${cy + len / 2}`
    return d
  }
  let d = `M ${cx - len / 2} ${cy}`
  for (let i = 0; i < segs; i++) {
    const dir = i % 2 === 0 ? -amp : amp
    d += ` L ${cx - len / 2 + step * (i + 0.5)} ${cy + dir}`
  }
  d += ` L ${cx + len / 2} ${cy}`
  return d
}

// Ground symbol
function Ground({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + 6} stroke="#4a5568" strokeWidth={1.5} />
      <line x1={x - 8} y1={y + 6} x2={x + 8} y2={y + 6} stroke="#4a5568" strokeWidth={1.5} />
      <line x1={x - 5} y1={y + 10} x2={x + 5} y2={y + 10} stroke="#4a5568" strokeWidth={1.2} />
      <line x1={x - 2} y1={y + 14} x2={x + 2} y2={y + 14} stroke="#4a5568" strokeWidth={1} />
    </g>
  )
}

export function BusTopology() {
  const [active, setActive] = useState<ElementId>(null)

  const handleEnter = useCallback((id: ElementId) => {
    setActive(id)
  }, [])

  const handleLeave = useCallback(() => {
    setActive(null)
  }, [])

  function isActive(id: ElementId) {
    return active === id
  }

  function opacity(id: ElementId) {
    if (active === null) return 1
    return active === id ? 1 : 0.35
  }

  const backboneStartX = 40
  const backboneEndX = W - 40

  // Terminator positions
  const termLeftX = backboneStartX
  const termRightX = backboneEndX
  const termY = BACKBONE_Y + 30

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: CAN bus topology — hover on any element
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="CAN bus linear topology diagram"
      >
        {/* ---- BACKBONE (CANH + CANL twin lines) ---- */}
        <g
          onMouseEnter={() => handleEnter('backbone')}
          onMouseLeave={handleLeave}
          className="cursor-pointer"
          style={{ opacity: opacity('backbone') }}
        >
          {/* CANH */}
          <line
            x1={backboneStartX}
            y1={BACKBONE_Y - 3}
            x2={backboneEndX}
            y2={BACKBONE_Y - 3}
            stroke={CANH_COLOR}
            strokeWidth={isActive('backbone') ? 3 : 2}
            strokeLinecap="round"
          />
          {/* CANL */}
          <line
            x1={backboneStartX}
            y1={BACKBONE_Y + 3}
            x2={backboneEndX}
            y2={BACKBONE_Y + 3}
            stroke={CANL_COLOR}
            strokeWidth={isActive('backbone') ? 3 : 2}
            strokeLinecap="round"
          />
          {/* Label */}
          <text
            x={(backboneStartX + backboneEndX) / 2}
            y={BACKBONE_Y - 14}
            textAnchor="middle"
            fill={isActive('backbone') ? '#fff' : '#718096'}
            fontSize={10}
            fontFamily="var(--font-mono), monospace"
          >
            <tspan fill={CANH_COLOR}>CANH</tspan>
            {'  '}backbone{'  '}
            <tspan fill={CANL_COLOR}>CANL</tspan>
          </text>
        </g>

        {/* ---- NODES + STUBS ---- */}
        {['A', 'B', 'C', 'D'].map((label, i) => {
          const cx = nodeX(i)
          const nodeId = `node-${label.toLowerCase()}` as ElementId
          const stubId = `stub-${label.toLowerCase()}` as ElementId

          return (
            <g key={label}>
              {/* Stub line */}
              <g
                onMouseEnter={() => handleEnter(stubId)}
                onMouseLeave={handleLeave}
                className="cursor-pointer"
                style={{ opacity: opacity(stubId) }}
              >
                <line
                  x1={cx}
                  y1={NODE_Y + NODE_H}
                  x2={cx}
                  y2={BACKBONE_Y - 6}
                  stroke={isActive(stubId) ? '#fff' : STUB_COLOR}
                  strokeWidth={isActive(stubId) ? 2 : 1.5}
                  strokeDasharray={isActive(stubId) ? 'none' : '4 3'}
                />
                <text
                  x={cx + 8}
                  y={(NODE_Y + NODE_H + BACKBONE_Y - 6) / 2}
                  fill={isActive(stubId) ? '#fff' : '#4a5568'}
                  fontSize={9}
                  fontFamily="var(--font-mono), monospace"
                >
                  stub
                </text>
                {/* Junction dot */}
                <circle
                  cx={cx}
                  cy={BACKBONE_Y}
                  r={isActive(stubId) ? 4 : 3}
                  fill={isActive(stubId) ? '#fff' : '#718096'}
                />
              </g>

              {/* Node box */}
              <g
                onMouseEnter={() => handleEnter(nodeId)}
                onMouseLeave={handleLeave}
                className="cursor-pointer"
                style={{ opacity: opacity(nodeId) }}
              >
                <rect
                  x={cx - NODE_W / 2}
                  y={NODE_Y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  fill={isActive(nodeId) ? '#1a2332' : NODE_FILL}
                  stroke={isActive(nodeId) ? CANH_COLOR : NODE_STROKE}
                  strokeWidth={isActive(nodeId) ? 2 : 1.5}
                />
                {/* Node label */}
                <text
                  x={cx}
                  y={NODE_Y + 22}
                  textAnchor="middle"
                  fill={isActive(nodeId) ? '#fff' : '#cbd5e0'}
                  fontSize={13}
                  fontWeight="bold"
                  fontFamily="var(--font-body), system-ui, sans-serif"
                >
                  Node {label}
                </text>
                {/* Sub label */}
                <text
                  x={cx}
                  y={NODE_Y + 38}
                  textAnchor="middle"
                  fill={isActive(nodeId) ? '#a0aec0' : '#4a5568'}
                  fontSize={9}
                  fontFamily="var(--font-mono), monospace"
                >
                  MCU + XCVR
                </text>
                {/* TX/RX indicators */}
                <text
                  x={cx - NODE_W / 2 + 8}
                  y={NODE_Y + NODE_H - 6}
                  fill="#00e676"
                  fontSize={7}
                  fontFamily="var(--font-mono), monospace"
                >
                  TX
                </text>
                <text
                  x={cx + NODE_W / 2 - 20}
                  y={NODE_Y + NODE_H - 6}
                  fill="#ffab00"
                  fontSize={7}
                  fontFamily="var(--font-mono), monospace"
                >
                  RX
                </text>
              </g>
            </g>
          )
        })}

        {/* ---- LEFT TERMINATOR ---- */}
        <g
          onMouseEnter={() => handleEnter('term-left')}
          onMouseLeave={handleLeave}
          className="cursor-pointer"
          style={{ opacity: opacity('term-left') }}
        >
          {/* Vertical line down from backbone */}
          <line
            x1={termLeftX}
            y1={BACKBONE_Y}
            x2={termLeftX}
            y2={termY - TERM_SIZE / 2}
            stroke={isActive('term-left') ? '#fff' : '#718096'}
            strokeWidth={1.5}
          />
          {/* Resistor zigzag */}
          <path
            d={resistorPath(termLeftX, termY, true)}
            fill="none"
            stroke={isActive('term-left') ? '#ffab00' : '#718096'}
            strokeWidth={isActive('term-left') ? 2.5 : 1.5}
            strokeLinejoin="round"
          />
          {/* Line to ground */}
          <line
            x1={termLeftX}
            y1={termY + TERM_SIZE / 2}
            x2={termLeftX}
            y2={termY + TERM_SIZE / 2 + 6}
            stroke={isActive('term-left') ? '#fff' : '#718096'}
            strokeWidth={1.5}
          />
          <Ground x={termLeftX} y={termY + TERM_SIZE / 2 + 6} />
          {/* Label */}
          <text
            x={termLeftX - 14}
            y={termY + 4}
            textAnchor="end"
            fill={isActive('term-left') ? '#ffab00' : '#4a5568'}
            fontSize={10}
            fontWeight="bold"
            fontFamily="var(--font-mono), monospace"
          >
            120 Ω
          </text>
        </g>

        {/* ---- RIGHT TERMINATOR ---- */}
        <g
          onMouseEnter={() => handleEnter('term-right')}
          onMouseLeave={handleLeave}
          className="cursor-pointer"
          style={{ opacity: opacity('term-right') }}
        >
          <line
            x1={termRightX}
            y1={BACKBONE_Y}
            x2={termRightX}
            y2={termY - TERM_SIZE / 2}
            stroke={isActive('term-right') ? '#fff' : '#718096'}
            strokeWidth={1.5}
          />
          <path
            d={resistorPath(termRightX, termY, true)}
            fill="none"
            stroke={isActive('term-right') ? '#ffab00' : '#718096'}
            strokeWidth={isActive('term-right') ? 2.5 : 1.5}
            strokeLinejoin="round"
          />
          <line
            x1={termRightX}
            y1={termY + TERM_SIZE / 2}
            x2={termRightX}
            y2={termY + TERM_SIZE / 2 + 6}
            stroke={isActive('term-right') ? '#fff' : '#718096'}
            strokeWidth={1.5}
          />
          <Ground x={termRightX} y={termY + TERM_SIZE / 2 + 6} />
          <text
            x={termRightX + 14}
            y={termY + 4}
            textAnchor="start"
            fill={isActive('term-right') ? '#ffab00' : '#4a5568'}
            fontSize={10}
            fontWeight="bold"
            fontFamily="var(--font-mono), monospace"
          >
            120 Ω
          </text>
        </g>

        {/* ---- PARALLEL RESISTANCE LABEL ---- */}
        <text
          x={(backboneStartX + backboneEndX) / 2}
          y={BACKBONE_Y + 50}
          textAnchor="middle"
          fill="#2d3748"
          fontSize={9}
          fontFamily="var(--font-mono), monospace"
        >
          Total DC load: 120 Ω ∥ 120 Ω = 60 Ω
        </text>
      </svg>

      {/* Info panel */}
      <div
        className="mt-3 rounded-md border border-neutral-700 bg-neutral-950 p-4 min-h-[80px] transition-opacity duration-150"
        style={{ opacity: active ? 1 : 0.5 }}
        aria-live="polite"
      >
        {active ? (
          <>
            <div className="flex items-center gap-2 mb-1.5">
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
            Hover or tap any element above — nodes, backbone, stubs, or termination resistors — to learn more.
          </p>
        )}
      </div>
    </div>
  )
}
