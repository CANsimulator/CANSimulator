'use client'

import { useState } from 'react'

interface Row {
  bitRate: string
  bitTime: string
  maxLength: number // meters
  color: string
  example: string
}

const ROWS: Row[] = [
  { bitRate: '1 Mbit/s', bitTime: '1 μs', maxLength: 40, color: '#FF5252', example: 'Powertrain CAN, in-vehicle high-speed' },
  { bitRate: '500 kbit/s', bitTime: '2 μs', maxLength: 100, color: '#FFB300', example: 'Passenger vehicle body / chassis CAN' },
  { bitRate: '250 kbit/s', bitTime: '4 μs', maxLength: 250, color: '#00BCD4', example: 'SAE J1939 heavy-duty trucks' },
  { bitRate: '125 kbit/s', bitTime: '8 μs', maxLength: 500, color: '#7C4DFF', example: 'CANopen, low-speed body bus' },
  { bitRate: '50 kbit/s', bitTime: '20 μs', maxLength: 1000, color: '#00E676', example: 'Industrial CAN over long cables' },
]

const MAX_LEN = 1000

export function BusLengthChart() {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: max recommended bus length at each bit rate (ISO 11898-2) — hover any bar
      </p>

      {/* Chart */}
      <div className="relative space-y-2.5">
        {/* Axis ticks at top */}
        <div className="flex mb-1 pl-[90px] sm:pl-[110px] text-[9px] text-neutral-600 font-mono select-none">
          <div className="flex-1 relative h-3">
            {[0, 250, 500, 750, 1000].map(m => (
              <div
                key={m}
                className="absolute top-0 -translate-x-1/2"
                style={{ left: `${(m / MAX_LEN) * 100}%` }}
              >
                <div className="h-1.5 w-px bg-neutral-700 mx-auto" />
                <div className="text-center">{m}m</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bars */}
        {ROWS.map((row, i) => {
          const widthPct = (row.maxLength / MAX_LEN) * 100
          const isHovered = hovered === i
          const isDimmed = hovered !== null && !isHovered
          return (
            <div
              key={row.bitRate}
              className="flex items-center gap-2 transition-opacity duration-150"
              style={{ opacity: isDimmed ? 0.35 : 1 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Label */}
              <div className="w-[90px] sm:w-[110px] text-[11px] font-mono font-bold text-right flex-shrink-0" style={{ color: row.color }}>
                {row.bitRate}
              </div>

              {/* Bar track */}
              <div className="flex-1 relative h-7 bg-neutral-950 rounded overflow-hidden">
                {/* Gridlines */}
                {[0.25, 0.5, 0.75].map(p => (
                  <div
                    key={p}
                    className="absolute top-0 bottom-0 w-px bg-neutral-800"
                    style={{ left: `${p * 100}%` }}
                  />
                ))}
                {/* Bar */}
                <div
                  className="absolute top-0 bottom-0 left-0 rounded-r transition-all duration-200 flex items-center justify-end pr-2"
                  style={{
                    width: `${widthPct}%`,
                    background: `linear-gradient(90deg, ${row.color}55 0%, ${row.color} 100%)`,
                    boxShadow: isHovered ? `0 0 20px ${row.color}66` : 'none',
                  }}
                >
                  <span className="text-[10px] font-mono font-bold text-black drop-shadow">
                    {row.maxLength} m
                  </span>
                </div>
              </div>

              {/* Bit time */}
              <div className="w-[52px] text-[10px] font-mono text-neutral-500 text-left flex-shrink-0">
                {row.bitTime}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      <div
        className="mt-4 rounded border p-3 min-h-[64px] transition-all duration-150"
        style={{
          borderColor: hovered !== null ? `${ROWS[hovered].color}40` : '#374151',
          backgroundColor: hovered !== null ? `${ROWS[hovered].color}08` : '#111827',
          opacity: hovered !== null ? 1 : 0.6,
        }}
        aria-live="polite"
      >
        {hovered !== null ? (
          <div>
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-sm font-mono font-bold" style={{ color: ROWS[hovered].color }}>
                {ROWS[hovered].bitRate}
              </span>
              <span className="text-[11px] text-neutral-400 font-mono">
                · bit time {ROWS[hovered].bitTime} · max ~{ROWS[hovered].maxLength} m
              </span>
            </div>
            <p className="text-[11px] text-neutral-300">
              <span className="text-neutral-500">Typical use:</span> {ROWS[hovered].example}
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-neutral-500 italic">
            Higher bit rates shrink the round-trip propagation budget. Each node must read the same bus level within one bit time — this fundamentally limits how long the bus can be.
          </p>
        )}
      </div>
    </div>
  )
}
