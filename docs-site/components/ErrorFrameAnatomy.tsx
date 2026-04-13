'use client'

import { useState, useCallback } from 'react'

type FieldId = 'active-flag' | 'passive-flag' | 'delimiter' | null

interface FieldInfo {
  label: string
  bits: string
  color: string
  description: string
  detail: string
}

const INFO: Record<Exclude<FieldId, null>, FieldInfo> = {
  'active-flag': {
    label: 'Active Error Flag',
    bits: '6 dominant bits',
    color: '#ff3d00',
    description:
      'Sent by error-active nodes. Six consecutive dominant bits deliberately violate the bit-stuffing rule, causing all other nodes to also detect an error and respond with their own error flags. The result is a superposition of 6–12 dominant bits.',
    detail: 'Destroys the current frame — the transmitter will automatically retransmit.',
  },
  'passive-flag': {
    label: 'Passive Error Flag',
    bits: '6 recessive bits',
    color: '#ffab00',
    description:
      'Sent by error-passive nodes instead of the active flag. Six recessive bits do not disturb other transmissions on the bus — a passive node signals its error without disrupting traffic.',
    detail:
      'A node becomes error-passive when TEC > 127 or REC > 127. It must also wait 8 extra bit times before transmitting again.',
  },
  delimiter: {
    label: 'Error Delimiter',
    bits: '8 recessive bits',
    color: '#78909c',
    description:
      'Eight consecutive recessive bits that mark the end of the error frame. After the delimiter, the normal inter-frame space (3 recessive bits) follows before the bus is considered idle again.',
    detail: 'Same structure regardless of whether the error flag was active or passive.',
  },
}

export function ErrorFrameAnatomy() {
  const [active, setActive] = useState<FieldId>(null)
  const [mode, setMode] = useState<'active' | 'passive'>('active')

  const enter = useCallback((id: FieldId) => setActive(id), [])
  const leave = useCallback(() => setActive(null), [])

  const flagId: Exclude<FieldId, null> = mode === 'active' ? 'active-flag' : 'passive-flag'
  const flagInfo = INFO[flagId]

  function op(id: FieldId) {
    if (active === null) return 1
    return active === id ? 1 : 0.3
  }

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs opacity-60 font-mono">
          Interactive: CAN error frame structure
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => { setMode('active'); setActive(null) }}
            className={`px-2 py-0.5 text-[10px] rounded font-mono transition-colors ${
              mode === 'active'
                ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
                : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => { setMode('passive'); setActive(null) }}
            className={`px-2 py-0.5 text-[10px] rounded font-mono transition-colors ${
              mode === 'passive'
                ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
                : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Passive
          </button>
        </div>
      </div>

      {/* Frame bar */}
      <div className="flex rounded-md overflow-hidden border border-neutral-700 h-14">
        {/* Error Flag */}
        <button
          type="button"
          className="relative flex-[6] flex flex-col items-center justify-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{
            backgroundColor: flagInfo.color,
            opacity: op(flagId),
            transform: active === flagId ? 'scaleY(1.08)' : 'scaleY(1)',
          }}
          onMouseEnter={() => enter(flagId)}
          onMouseLeave={leave}
          onFocus={() => enter(flagId)}
          onBlur={leave}
        >
          <span className="text-xs sm:text-sm font-bold text-white">
            Error Flag
          </span>
          <span className="text-[10px] text-white/70">
            {mode === 'active' ? '6 dominant' : '6 recessive'}
          </span>
        </button>

        {/* Error Delimiter */}
        <button
          type="button"
          className="relative flex-[8] flex flex-col items-center justify-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{
            backgroundColor: INFO.delimiter.color,
            opacity: op('delimiter'),
            transform: active === 'delimiter' ? 'scaleY(1.08)' : 'scaleY(1)',
          }}
          onMouseEnter={() => enter('delimiter')}
          onMouseLeave={leave}
          onFocus={() => enter('delimiter')}
          onBlur={leave}
        >
          <span className="text-xs sm:text-sm font-bold text-white">
            Error Delimiter
          </span>
          <span className="text-[10px] text-white/70">8 recessive</span>
        </button>
      </div>

      {/* Bit polarity visualization */}
      <div className="flex mt-1 mx-0 h-5 rounded-sm overflow-hidden">
        {/* Error flag bits */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`flag-${i}`}
            className="flex-[1] flex items-center justify-center border-r border-neutral-800"
            style={{
              backgroundColor: mode === 'active' ? '#ff3d0033' : '#ffab0020',
              opacity: op(flagId),
            }}
          >
            <span className="text-[9px] font-mono" style={{ color: mode === 'active' ? '#ff6e40' : '#ffd54f' }}>
              {mode === 'active' ? '0' : '1'}
            </span>
          </div>
        ))}
        {/* Delimiter bits */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`del-${i}`}
            className="flex-[1] flex items-center justify-center border-r border-neutral-800 last:border-r-0"
            style={{
              backgroundColor: '#78909c20',
              opacity: op('delimiter'),
            }}
          >
            <span className="text-[9px] font-mono text-neutral-500">1</span>
          </div>
        ))}
      </div>

      {/* Info panel */}
      <div
        className="mt-3 rounded-md border border-neutral-700 bg-neutral-950 p-4 min-h-[72px] transition-opacity duration-150"
        style={{ opacity: active ? 1 : 0.5 }}
        aria-live="polite"
      >
        {active ? (
          <>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: INFO[active].color }}
              />
              <span className="font-semibold text-sm text-white">
                {INFO[active].label}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {INFO[active].bits}
              </span>
            </div>
            <p className="text-sm text-neutral-300 mb-1">{INFO[active].description}</p>
            <p className="text-xs text-neutral-500 font-mono">{INFO[active].detail}</p>
          </>
        ) : (
          <p className="text-sm text-neutral-500 italic">
            Hover a field above. Toggle Active / Passive to see the difference in error flag polarity.
          </p>
        )}
      </div>
    </div>
  )
}
