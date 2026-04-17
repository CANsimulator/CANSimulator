'use client'

import { useState } from 'react'

interface Preset {
  bitRate: string
  fOsc: string
  brp: number
  tseg1: number
  tseg2: number
  tqPerBit: number
  samplePoint: number
  notes: string
  color: string
}

const PRESETS: Preset[] = [
  { bitRate: '125 kbit/s', fOsc: '16 MHz', brp: 8, tseg1: 13, tseg2: 2, tqPerBit: 16, samplePoint: 87.5, notes: 'CANopen default', color: '#7C4DFF' },
  { bitRate: '250 kbit/s', fOsc: '16 MHz', brp: 4, tseg1: 13, tseg2: 2, tqPerBit: 16, samplePoint: 87.5, notes: 'SAE J1939 typical', color: '#00BCD4' },
  { bitRate: '500 kbit/s', fOsc: '16 MHz', brp: 2, tseg1: 13, tseg2: 2, tqPerBit: 16, samplePoint: 87.5, notes: 'Passenger vehicle HS-CAN', color: '#FFB300' },
  { bitRate: '500 kbit/s', fOsc: '8 MHz', brp: 1, tseg1: 13, tseg2: 2, tqPerBit: 16, samplePoint: 87.5, notes: 'Lower-clock variant', color: '#FFB300' },
  { bitRate: '1 Mbit/s', fOsc: '16 MHz', brp: 1, tseg1: 13, tseg2: 2, tqPerBit: 16, samplePoint: 87.5, notes: 'Max classical CAN', color: '#FF5252' },
  { bitRate: '1 Mbit/s', fOsc: '8 MHz', brp: 1, tseg1: 5, tseg2: 2, tqPerBit: 8, samplePoint: 75.0, notes: 'Tight timing — SJW margin small', color: '#FF5252' },
]

function classifySP(sp: number): { label: string; color: string } {
  if (sp >= 80 && sp <= 87.5) return { label: 'Recommended', color: '#00E676' }
  if (sp >= 75 && sp < 80) return { label: 'OK', color: '#FFB300' }
  return { label: 'Tight', color: '#FF5252' }
}

export function BitTimingPresets() {
  const [active, setActive] = useState(2) // default to 500 kbit/s @ 16 MHz

  const preset = PRESETS[active]
  const sp = classifySP(preset.samplePoint)
  const tseg1Pct = ((1 + preset.tseg1) / preset.tqPerBit) * 100
  const tseg2Pct = (preset.tseg2 / preset.tqPerBit) * 100
  const syncPct = (1 / preset.tqPerBit) * 100

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: common bit-timing presets — click any card to see its bit anatomy
      </p>

      {/* Preset cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {PRESETS.map((p, i) => {
          const isActive = i === active
          return (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="text-left p-2 rounded border transition-all duration-150 focus:outline-none"
              style={{
                borderColor: isActive ? p.color : '#2d3748',
                backgroundColor: isActive ? `${p.color}10` : '#111827',
                transform: isActive ? 'translateY(-1px)' : 'none',
                boxShadow: isActive ? `0 4px 12px ${p.color}25` : 'none',
              }}
            >
              <div
                className="text-[13px] font-mono font-bold leading-tight"
                style={{ color: isActive ? p.color : '#e5e7eb' }}
              >
                {p.bitRate}
              </div>
              <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                f_osc {p.fOsc}
              </div>
              <div className="text-[9px] text-neutral-600 font-mono mt-0.5 truncate">
                {p.notes}
              </div>
            </button>
          )
        })}
      </div>

      {/* Active preset detail */}
      <div className="rounded border p-3" style={{ borderColor: `${preset.color}40`, backgroundColor: `${preset.color}08` }}>
        {/* Register values */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          {[
            { label: 'BRP', value: preset.brp },
            { label: 'TSEG1', value: preset.tseg1 },
            { label: 'TSEG2', value: preset.tseg2 },
            { label: 'Tq/bit', value: preset.tqPerBit },
            { label: 'Sample', value: `${preset.samplePoint}%` },
          ].map(v => (
            <div key={v.label} className="bg-neutral-950 rounded px-2 py-1.5 border border-neutral-800">
              <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono">{v.label}</div>
              <div className="text-[13px] font-mono font-bold" style={{ color: preset.color }}>{v.value}</div>
            </div>
          ))}
        </div>

        {/* Bit anatomy visualization */}
        <div className="bg-neutral-950 rounded p-3 border border-neutral-800">
          <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono">
            <span className="text-neutral-500">Bit anatomy ({preset.tqPerBit} Tq)</span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
              style={{ color: sp.color, backgroundColor: `${sp.color}20` }}
            >
              {sp.label}
            </span>
          </div>

          {/* Bar */}
          <div className="relative h-8 flex rounded overflow-hidden" style={{ gap: '1px' }}>
            {/* Sync segment (always 1 Tq) */}
            <div className="flex items-center justify-center" style={{ width: `${syncPct}%`, backgroundColor: '#64748b' }}>
              <span className="text-[8px] font-mono text-white font-bold">S</span>
            </div>
            {/* TSEG1 */}
            <div
              className="flex items-center justify-center relative"
              style={{ width: `${tseg1Pct}%`, backgroundColor: `${preset.color}55` }}
            >
              <span className="text-[9px] font-mono text-neutral-100 font-bold">TSEG1 ({preset.tseg1} Tq)</span>
            </div>
            {/* TSEG2 */}
            <div
              className="flex items-center justify-center"
              style={{ width: `${tseg2Pct}%`, backgroundColor: `${preset.color}88` }}
            >
              <span className="text-[9px] font-mono text-neutral-100 font-bold">TSEG2 ({preset.tseg2})</span>
            </div>
          </div>

          {/* Sample point marker */}
          <div className="relative mt-1 h-4">
            <div
              className="absolute -top-5"
              style={{ left: `${preset.samplePoint}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-0 h-0 mx-auto" style={{
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderTop: `6px solid ${sp.color}`,
              }} />
            </div>
            <div
              className="absolute"
              style={{ left: `${preset.samplePoint}%`, transform: 'translateX(-50%)' }}
            >
              <div className="text-[9px] font-mono font-bold whitespace-nowrap" style={{ color: sp.color }}>
                sample @ {preset.samplePoint}%
              </div>
            </div>
          </div>

          {/* Equation */}
          <div className="mt-4 text-[10px] font-mono text-neutral-500 border-t border-neutral-800 pt-2">
            Bit rate = <span className="text-neutral-300">f_osc</span> / (BRP × (1 + TSEG1 + TSEG2)) ={' '}
            <span style={{ color: preset.color }}>{preset.bitRate}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
