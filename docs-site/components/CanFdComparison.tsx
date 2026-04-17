'use client'

import { useState } from 'react'

interface Feature {
  label: string
  classical: string
  fd: string
  classicalNote?: string
  fdNote?: string
  fdBetter: boolean
}

const FEATURES: Feature[] = [
  {
    label: 'Max payload per frame',
    classical: '8 bytes',
    fd: '64 bytes',
    classicalNote: '1×  baseline',
    fdNote: '8×  capacity',
    fdBetter: true,
  },
  {
    label: 'Arbitration bit rate',
    classical: '≤ 1 Mbit/s',
    fd: '≤ 1 Mbit/s',
    classicalNote: 'Same',
    fdNote: 'Same  (compatibility)',
    fdBetter: false,
  },
  {
    label: 'Data-phase bit rate',
    classical: '≤ 1 Mbit/s',
    fd: '≤ 8 Mbit/s',
    fdNote: 'Up to  8× faster',
    fdBetter: true,
  },
  {
    label: 'Bit-rate switch (BRS)',
    classical: 'No',
    fd: 'Yes',
    fdNote: 'Switches after arbitration',
    fdBetter: true,
  },
  {
    label: 'CRC field',
    classical: '15-bit',
    fd: '17-bit  /  21-bit',
    classicalNote: 'Fixed',
    fdNote: '≤16 DB → 17-bit   ·   >16 → 21-bit',
    fdBetter: true,
  },
  {
    label: 'Error Signaling Indicator (ESI)',
    classical: 'No',
    fd: 'Yes',
    fdNote: 'Transmitter passes error state',
    fdBetter: true,
  },
]

export function CanFdComparison() {
  const [brs, setBrs] = useState(true)

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-4 opacity-60 font-mono">
        Interactive: Classical CAN vs CAN FD — toggle the BRS waveform below
      </p>

      {/* Header row */}
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 mb-2">
        <div />
        <div className="rounded-t-md bg-neutral-950 border border-neutral-800 border-b-0 px-3 py-2 text-center">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Classical CAN</div>
          <div className="text-[10px] font-mono text-neutral-600 mt-0.5">ISO 11898-1:2015</div>
        </div>
        <div
          className="rounded-t-md border px-3 py-2 text-center"
          style={{
            backgroundColor: '#00BCD40a',
            borderColor: '#00BCD455',
            borderBottom: 'none',
          }}
        >
          <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#00BCD4' }}>CAN FD</div>
          <div className="text-[10px] font-mono text-neutral-500 mt-0.5">ISO 11898-1:2015 (Part B)</div>
        </div>
      </div>

      {/* Feature rows */}
      <div className="rounded-md overflow-hidden border border-neutral-800">
        {FEATURES.map((f, i) => (
          <div
            key={f.label}
            className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-stretch border-t border-neutral-800 first:border-t-0"
            style={{ backgroundColor: i % 2 === 0 ? '#0f1115' : 'transparent' }}
          >
            {/* Feature label */}
            <div className="px-3 py-2.5 text-[11px] text-neutral-300 font-mono flex items-center">
              {f.label}
            </div>
            {/* Classical value */}
            <div className="px-3 py-2.5 bg-neutral-950/50 flex flex-col justify-center">
              <div className="text-[12px] font-mono font-bold text-neutral-200">{f.classical}</div>
              {f.classicalNote && (
                <div className="text-[9px] text-neutral-500 font-mono mt-0.5">{f.classicalNote}</div>
              )}
            </div>
            {/* FD value */}
            <div
              className="px-3 py-2.5 flex flex-col justify-center"
              style={{
                backgroundColor: f.fdBetter ? '#00BCD408' : '#0f1115',
                borderLeft: f.fdBetter ? '2px solid #00BCD4' : '2px solid transparent',
              }}
            >
              <div className="text-[12px] font-mono font-bold" style={{ color: f.fdBetter ? '#00BCD4' : '#e5e7eb' }}>
                {f.fd}
              </div>
              {f.fdNote && (
                <div className="text-[9px] font-mono mt-0.5" style={{ color: f.fdBetter ? '#00BCD499' : '#6b7280' }}>
                  {f.fdNote}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* BRS waveform visualization */}
      <div className="mt-5 rounded-md border border-neutral-800 bg-neutral-950 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
            Bit-rate switch (BRS) — on-wire view
          </div>
          <label className="flex items-center gap-2 text-[10px] font-mono cursor-pointer select-none">
            <span className={brs ? 'text-neutral-500' : 'text-neutral-300'}>Classical</span>
            <button
              onClick={() => setBrs(!brs)}
              className="relative w-8 h-4 rounded-full transition-colors"
              style={{ backgroundColor: brs ? '#00BCD4' : '#374151' }}
              aria-label="Toggle between Classical CAN and CAN FD waveform"
            >
              <span
                className="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform"
                style={{ left: '2px', transform: brs ? 'translateX(14px)' : 'translateX(0)' }}
              />
            </button>
            <span className={brs ? 'text-cyan-400' : 'text-neutral-500'}>CAN FD</span>
          </label>
        </div>

        {/* Waveform */}
        <svg viewBox="0 0 400 80" className="w-full h-20" preserveAspectRatio="none">
          {/* Baseline */}
          <line x1="0" y1="60" x2="400" y2="60" stroke="#374151" strokeWidth="0.5" />

          {/* Arbitration label */}
          <text x="10" y="14" fill="#9ca3af" fontSize="9" fontFamily="ui-monospace">
            Arbitration (1 Mbit/s)
          </text>
          {/* Data phase label */}
          <text x={brs ? '180' : '280'} y="14" fill={brs ? '#00BCD4' : '#9ca3af'} fontSize="9" fontFamily="ui-monospace">
            Data phase {brs ? '(up to 8 Mbit/s)' : '(1 Mbit/s)'}
          </text>

          {/* Arbitration pulses (wide bits) */}
          {[20, 45, 70, 95, 120, 145, 170].map((x, i) => (
            <rect
              key={`arb-${i}`}
              x={x}
              y={i % 2 === 0 ? 30 : 45}
              width={18}
              height={i % 2 === 0 ? 30 : 15}
              fill={i % 2 === 0 ? '#9ca3af' : '#6b7280'}
              opacity={0.9}
            />
          ))}

          {/* Transition marker */}
          <line x1="175" y1="20" x2="175" y2="65" stroke={brs ? '#00BCD4' : '#6b7280'} strokeWidth="1" strokeDasharray="2 2" />
          <text x="168" y="76" fill={brs ? '#00BCD4' : '#6b7280'} fontSize="8" fontFamily="ui-monospace" textAnchor="end">
            BRS
          </text>

          {/* Data phase pulses */}
          {brs
            ? // CAN FD: narrow bits (faster)
              [180, 188, 196, 204, 212, 220, 228, 236, 244, 252, 260, 268, 276, 284, 292, 300, 308, 316, 324, 332, 340, 348, 356, 364, 372, 380].map(
                (x, i) => (
                  <rect
                    key={`fd-${i}`}
                    x={x}
                    y={i % 2 === 0 ? 30 : 45}
                    width={6}
                    height={i % 2 === 0 ? 30 : 15}
                    fill={i % 2 === 0 ? '#00BCD4' : '#0891b2'}
                  />
                )
              )
            : // Classical: same-width bits as arbitration
              [185, 210, 235, 260, 285, 310, 335, 360].map((x, i) => (
                <rect
                  key={`cc-${i}`}
                  x={x}
                  y={i % 2 === 0 ? 30 : 45}
                  width={18}
                  height={i % 2 === 0 ? 30 : 15}
                  fill={i % 2 === 0 ? '#9ca3af' : '#6b7280'}
                  opacity={0.9}
                />
              ))}
        </svg>

        <p className="text-[10px] text-neutral-500 font-mono mt-1">
          {brs
            ? 'CAN FD keeps the slow arbitration bit rate for compatibility with the priority mechanism, then switches to a faster bit rate during the data phase to push the 64-byte payload through quickly.'
            : 'Classical CAN uses one bit rate for the entire frame. No tricks, no switching — predictable but payload is capped at 8 bytes.'}
        </p>
      </div>

      <p className="mt-3 text-[10px] text-neutral-500 italic">
        Mixed buses are <strong>not</strong> automatically compatible — a single classical-only node will flag errors on FD frames. Use a gateway to bridge.
      </p>
    </div>
  )
}
