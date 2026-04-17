'use client'

import { useState } from 'react'

type State = 'recessive' | 'dominant'

interface Readout {
  canh: number
  canl: number
  vdiff: number
  logic: string
  logicColor: string
}

const READOUTS: Record<State, Readout> = {
  recessive: { canh: 2.5, canl: 2.5, vdiff: 0.0, logic: 'Logic 1', logicColor: '#00E676' },
  dominant: { canh: 3.5, canl: 1.5, vdiff: 2.0, logic: 'Logic 0', logicColor: '#FF5252' },
}

const V_MIN = 0
const V_MAX = 5

function voltageToY(v: number, top: number, bot: number) {
  const pct = (v - V_MIN) / (V_MAX - V_MIN)
  return top + (1 - pct) * (bot - top)
}

export function VoltageLevels() {
  const [state, setState] = useState<State>('dominant')
  const r = READOUTS[state]

  const plotTop = 20
  const plotBot = 160
  const canhX = 90
  const canlX = 220
  const vdiffX = 350

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: ISO 11898-2 voltage levels — toggle dominant vs recessive
      </p>

      {/* State toggle */}
      <div className="flex gap-2 mb-4">
        {(['recessive', 'dominant'] as const).map(s => {
          const isActive = state === s
          const c = READOUTS[s].logicColor
          return (
            <button
              key={s}
              onClick={() => setState(s)}
              className="flex-1 py-1.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider transition-all duration-150 border"
              style={{
                borderColor: isActive ? c : '#2d3748',
                backgroundColor: isActive ? `${c}20` : '#0f1115',
                color: isActive ? c : '#9ca3af',
              }}
            >
              {s}  {isActive ? `·  ${READOUTS[s].logic}` : ''}
            </button>
          )
        })}
      </div>

      {/* Voltmeter SVG */}
      <div className="bg-neutral-950 rounded border border-neutral-800 p-3">
        <svg viewBox="0 0 420 210" className="w-full" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: 260 }}>
          <defs>
            <linearGradient id="canhGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00BCD4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00BCD4" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="canlGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#F06292" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#F06292" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Voltage axis (left) */}
          {[0, 1, 2, 3, 4, 5].map(v => {
            const y = voltageToY(v, plotTop, plotBot)
            return (
              <g key={v}>
                <line x1="30" y1={y} x2="400" y2={y} stroke="#1f2937" strokeWidth="0.5" />
                <text x="26" y={y + 3} textAnchor="end" fontSize="8" fill="#6b7280" fontFamily="ui-monospace">
                  {v}V
                </text>
              </g>
            )
          })}

          {/* Midline at 2.5V */}
          <line
            x1="30"
            y1={voltageToY(2.5, plotTop, plotBot)}
            x2="400"
            y2={voltageToY(2.5, plotTop, plotBot)}
            stroke="#64748b"
            strokeWidth="0.5"
            strokeDasharray="3 3"
          />
          <text x="404" y={voltageToY(2.5, plotTop, plotBot) + 3} fontSize="7" fill="#64748b" fontFamily="ui-monospace">
            bias
          </text>

          {/* CANH bar */}
          <g>
            <rect
              x={canhX - 25}
              y={voltageToY(r.canh, plotTop, plotBot)}
              width="50"
              height={plotBot - voltageToY(r.canh, plotTop, plotBot)}
              fill="url(#canhGrad)"
              style={{ transition: 'all 0.4s ease' }}
            />
            <line
              x1={canhX - 30}
              y1={voltageToY(r.canh, plotTop, plotBot)}
              x2={canhX + 30}
              y2={voltageToY(r.canh, plotTop, plotBot)}
              stroke="#00BCD4"
              strokeWidth="2"
              style={{ transition: 'all 0.4s ease' }}
            />
            <text x={canhX} y={plotBot + 15} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#00BCD4" fontFamily="ui-monospace">
              CANH
            </text>
            <text x={canhX} y={plotBot + 28} textAnchor="middle" fontSize="11" fill="#00BCD4" fontFamily="ui-monospace">
              {r.canh.toFixed(1)} V
            </text>
          </g>

          {/* CANL bar */}
          <g>
            <rect
              x={canlX - 25}
              y={voltageToY(r.canl, plotTop, plotBot)}
              width="50"
              height={plotBot - voltageToY(r.canl, plotTop, plotBot)}
              fill="url(#canlGrad)"
              style={{ transition: 'all 0.4s ease' }}
            />
            <line
              x1={canlX - 30}
              y1={voltageToY(r.canl, plotTop, plotBot)}
              x2={canlX + 30}
              y2={voltageToY(r.canl, plotTop, plotBot)}
              stroke="#F06292"
              strokeWidth="2"
              style={{ transition: 'all 0.4s ease' }}
            />
            <text x={canlX} y={plotBot + 15} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#F06292" fontFamily="ui-monospace">
              CANL
            </text>
            <text x={canlX} y={plotBot + 28} textAnchor="middle" fontSize="11" fill="#F06292" fontFamily="ui-monospace">
              {r.canl.toFixed(1)} V
            </text>
          </g>

          {/* V_diff bracket indicator */}
          <g>
            <line
              x1={vdiffX - 20}
              y1={voltageToY(r.canl, plotTop, plotBot)}
              x2={vdiffX - 20}
              y2={voltageToY(r.canh, plotTop, plotBot)}
              stroke={r.logicColor}
              strokeWidth="1.5"
              style={{ transition: 'all 0.4s ease' }}
            />
            <line
              x1={vdiffX - 25}
              y1={voltageToY(r.canh, plotTop, plotBot)}
              x2={vdiffX - 15}
              y2={voltageToY(r.canh, plotTop, plotBot)}
              stroke={r.logicColor}
              strokeWidth="1.5"
            />
            <line
              x1={vdiffX - 25}
              y1={voltageToY(r.canl, plotTop, plotBot)}
              x2={vdiffX - 15}
              y2={voltageToY(r.canl, plotTop, plotBot)}
              stroke={r.logicColor}
              strokeWidth="1.5"
            />
            <text
              x={vdiffX - 10}
              y={(voltageToY(r.canh, plotTop, plotBot) + voltageToY(r.canl, plotTop, plotBot)) / 2 + 3}
              fontSize="11"
              fontWeight="bold"
              fill={r.logicColor}
              fontFamily="ui-monospace"
              style={{ transition: 'all 0.4s ease' }}
            >
              V_diff = {r.vdiff.toFixed(1)} V
            </text>
            <text x={vdiffX} y={plotBot + 15} textAnchor="middle" fontSize="11" fontWeight="bold" fill={r.logicColor} fontFamily="ui-monospace">
              Differential
            </text>
            <text x={vdiffX} y={plotBot + 28} textAnchor="middle" fontSize="10" fill={r.logicColor} fontFamily="ui-monospace">
              {r.logic}
            </text>
          </g>

          {/* Receiver threshold bands (decision region) */}
          <g opacity="0.4">
            {/* Dominant region above 0.9V diff (i.e., top 0.9V from 2.5V reference is ambiguous) */}
            <text x="30" y={plotTop + 8} fontSize="7" fill="#FF5252" fontFamily="ui-monospace">
              receiver: V_diff &gt; 0.9V → dominant
            </text>
            <text x="30" y={plotBot - 3} fontSize="7" fill="#00E676" fontFamily="ui-monospace">
              receiver: V_diff &lt; 0.5V → recessive
            </text>
          </g>
        </svg>
      </div>

      {/* Readout summary cards */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {[
          { label: 'CANH', value: `${r.canh.toFixed(1)} V`, color: '#00BCD4' },
          { label: 'CANL', value: `${r.canl.toFixed(1)} V`, color: '#F06292' },
          { label: 'V_diff', value: `${r.vdiff.toFixed(1)} V`, color: r.logicColor },
        ].map(c => (
          <div
            key={c.label}
            className="bg-neutral-950 rounded border border-neutral-800 px-2.5 py-2"
            style={{ borderColor: `${c.color}30` }}
          >
            <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono">{c.label}</div>
            <div className="text-[14px] font-mono font-bold" style={{ color: c.color, transition: 'color 0.4s' }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-neutral-400 leading-relaxed">
        {state === 'recessive' ? (
          <>
            <span className="text-cyan-400 font-mono font-bold">Recessive</span> is the idle state. Both CANH and CANL sit at ~2.5 V through the termination network — nobody is actively driving the bus. The differential is near 0 V, and the receiver reads logic 1.
          </>
        ) : (
          <>
            <span className="text-rose-400 font-mono font-bold">Dominant</span> means a node is actively driving the bus. CANH is pulled up to ~3.5 V, CANL down to ~1.5 V — creating a ~2.0 V differential. Dominant always wins over recessive on the shared wire, which is the electrical foundation of non-destructive arbitration.
          </>
        )}
      </p>
    </div>
  )
}
