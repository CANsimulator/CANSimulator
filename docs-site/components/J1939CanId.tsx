'use client'

import { useState, useCallback } from 'react'

interface Field {
  id: string
  label: string
  shortLabel: string
  bits: number
  color: string
  hex: string
  description: string
  detail: string
}

// 29-bit J1939 extended identifier breakdown
// Priority(3) + Reserved(1) + DP(1) + PF(8) + PS(8) + SA(8) = 29 bits
// Simplified as 4 regions matching the docs: Priority | Rsvd+DP | PGN(PF+PS) | SA
const FIELDS: Field[] = [
  {
    id: 'priority',
    label: 'Priority',
    shortLabel: 'P',
    bits: 3,
    color: '#00BCD4',
    hex: '0b110',
    description: 'Priority (3 bits) — bits 28–26',
    detail:
      'Values 0–7. Priority 0 is highest. Priority 3 is typical for engine data (e.g., EEC1, PGN 61444). Priority 6 is used for less critical messages. Lower numeric value = higher bus priority, same as standard CAN.',
  },
  {
    id: 'reserved',
    label: 'Rsvd / DP',
    shortLabel: 'R',
    bits: 2,
    color: '#546E7A',
    hex: '0b00',
    description: 'Reserved + Data Page (2 bits) — bits 25–24',
    detail:
      'Reserved (bit 25) must be 0 in most J1939 messages. Data Page (bit 24) selects between two sets of PGN definitions — page 0 covers standard J1939 PGNs; page 1 is used for proprietary and extended PGN definitions.',
  },
  {
    id: 'pgn',
    label: 'PGN',
    shortLabel: 'PGN',
    bits: 16,
    color: '#7C4DFF',
    hex: 'PF=0xF0  PS=0x04',
    description: 'PDU Format + PDU Specific = PGN (16 bits) — bits 23–8',
    detail:
      'The PGN (Parameter Group Number) is formed from PF (8 bits, bits 23–16) and PS (8 bits, bits 15–8). If PF < 240 (0xF0), the message is peer-to-peer: PS is the destination address, and the PGN is identified by PF alone. If PF ≥ 240, the message is broadcast: PS is a group extension and is part of the PGN. Example: PGN 61444 (0xF004) = EEC1, Engine Speed.',
  },
  {
    id: 'sa',
    label: 'Source Address',
    shortLabel: 'SA',
    bits: 8,
    color: '#FFB300',
    hex: '0x00',
    description: 'Source Address (8 bits) — bits 7–0',
    detail:
      'Identifies the transmitting node (0–253). Addresses 254 (0xFE) and 255 (0xFF) are reserved. Nodes negotiate their address at startup via the Address Claiming procedure using their 64-bit NAME field, which encodes manufacturer, function code, and instance.',
  },
]

const TOTAL_BITS = FIELDS.reduce((s, f) => s + f.bits, 0) // 29

export function J1939CanId() {
  const [active, setActive] = useState<string | null>(null)

  const enter = useCallback((id: string) => setActive(id), [])
  const leave = useCallback(() => setActive(null), [])

  const activeField = active ? FIELDS.find(f => f.id === active) : null

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4 font-mono text-xs">
      <p className="mb-3 opacity-60 text-[10px]">
        Interactive: J1939 29-bit extended CAN identifier — hover any field
      </p>

      {/* Bit ruler */}
      <div className="flex mb-0.5 text-[9px] text-neutral-600 select-none">
        <span>bit 28</span>
        <span className="ml-auto">bit 0</span>
      </div>

      {/* Field bars */}
      <div className="flex rounded overflow-hidden h-12" style={{ gap: '1px' }}>
        {FIELDS.map(f => {
          const pct = (f.bits / TOTAL_BITS) * 100
          const isActive = active === f.id
          const isDimmed = active !== null && !isActive
          return (
            <button
              key={f.id}
              onMouseEnter={() => enter(f.id)}
              onMouseLeave={leave}
              onFocus={() => enter(f.id)}
              onBlur={leave}
              className="flex flex-col items-center justify-center transition-all duration-150 focus:outline-none"
              style={{
                width: `${pct}%`,
                backgroundColor: isActive ? f.color : `${f.color}30`,
                opacity: isDimmed ? 0.25 : 1,
                transform: isActive ? 'scaleY(1.06)' : 'scaleY(1)',
              }}
            >
              <span
                className="text-[9px] sm:text-[10px] font-bold leading-tight truncate px-0.5"
                style={{ color: isActive ? '#fff' : f.color }}
              >
                {f.shortLabel}
              </span>
              <span
                className="text-[8px] leading-tight opacity-80"
                style={{ color: isActive ? '#ffffffcc' : `${f.color}99` }}
              >
                {f.bits}b
              </span>
            </button>
          )
        })}
      </div>

      {/* Field labels below bars */}
      <div className="flex mt-1" style={{ gap: '1px' }}>
        {FIELDS.map(f => {
          const pct = (f.bits / TOTAL_BITS) * 100
          const isActive = active === f.id
          return (
            <div
              key={f.id}
              className="text-center leading-none"
              style={{ width: `${pct}%`, color: isActive ? f.color : '#4b5563' }}
            >
              <div className="text-[8px] mt-0.5 truncate px-0.5">{f.label}</div>
            </div>
          )
        })}
      </div>

      {/* Example value */}
      <div className="mt-3 flex items-center gap-2 text-[10px]">
        <span className="text-neutral-500">Example&nbsp;(PGN&nbsp;61444&nbsp;EEC1):</span>
        <div className="flex gap-0.5">
          {FIELDS.map(f => {
            const isActive = active === f.id
            return (
              <code
                key={f.id}
                className="px-1.5 py-0.5 rounded text-[10px] transition-colors duration-150"
                style={{
                  backgroundColor: isActive ? `${f.color}25` : '#1a1a2e',
                  color: isActive ? f.color : '#6b7280',
                  border: `1px solid ${isActive ? `${f.color}50` : '#2d3748'}`,
                }}
              >
                {f.hex}
              </code>
            )
          })}
        </div>
      </div>

      {/* Info panel */}
      <div
        className="mt-3 rounded border p-3 min-h-[72px] transition-all duration-150"
        style={{
          borderColor: activeField ? `${activeField.color}40` : '#374151',
          backgroundColor: activeField ? `${activeField.color}0a` : '#111827',
          opacity: activeField ? 1 : 0.6,
        }}
        aria-live="polite"
      >
        {activeField ? (
          <>
            <p className="mb-1" style={{ color: activeField.color }}>
              {activeField.description}
            </p>
            <p className="text-neutral-400 leading-relaxed text-[10px]">{activeField.detail}</p>
          </>
        ) : (
          <p className="text-neutral-500 italic text-[10px]">
            Hover any field to see bit positions, encoding rules, and examples.
          </p>
        )}
      </div>
    </div>
  )
}
