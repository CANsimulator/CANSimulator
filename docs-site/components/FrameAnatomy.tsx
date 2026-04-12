'use client'

import { useState, useCallback } from 'react'

interface FrameField {
  name: string
  bits: number
  color: string
  description: string
  encoding: string
}

const STANDARD_FIELDS: FrameField[] = [
  {
    name: 'SOF',
    bits: 1,
    color: '#ff3d00',
    description: 'Start of Frame. A single dominant (0) bit that provides the hard-sync edge for all receivers.',
    encoding: 'Always dominant (0)',
  },
  {
    name: 'ID [10:0]',
    bits: 11,
    color: '#00b8d4',
    description: 'Message identifier. Lower numeric value = higher bus priority. Used for non-destructive bitwise arbitration.',
    encoding: '11 bits, MSB first. Range 0x000 – 0x7FF.',
  },
  {
    name: 'RTR',
    bits: 1,
    color: '#00b8d4',
    description: 'Remote Transmission Request. Distinguishes data frames from remote (request) frames.',
    encoding: 'Dominant (0) = data frame. Recessive (1) = remote frame.',
  },
  {
    name: 'IDE',
    bits: 1,
    color: '#7c4dff',
    description: 'Identifier Extension bit. Tells receivers whether this is a standard (11-bit) or extended (29-bit) frame.',
    encoding: 'Dominant (0) = standard frame. Recessive (1) = extended frame.',
  },
  {
    name: 'r0',
    bits: 1,
    color: '#7c4dff',
    description: 'Reserved bit. Must be transmitted as dominant. Reserved for future protocol use.',
    encoding: 'Always dominant (0)',
  },
  {
    name: 'DLC',
    bits: 4,
    color: '#7c4dff',
    description: 'Data Length Code. Encodes 0 – 8 bytes of payload. Values 9 – 15 are treated as 8 in classical CAN.',
    encoding: '4 bits. 0000 = 0 bytes, 1000 = 8 bytes.',
  },
  {
    name: 'DATA',
    bits: 64,
    color: '#00e676',
    description: 'Application payload. Length determined by DLC (0 – 8 bytes). Transmitted MSB-first per byte, byte 0 first.',
    encoding: '0 to 64 bits (0 – 8 bytes)',
  },
  {
    name: 'CRC',
    bits: 15,
    color: '#ffab00',
    description: 'CRC-15 sequence computed over SOF + Arbitration + Control + Data. Generator polynomial 0x4599.',
    encoding: '15 bits. Detects all burst errors ≤ 15 bits.',
  },
  {
    name: 'CRC del',
    bits: 1,
    color: '#ffab00',
    description: 'CRC delimiter. Separates the CRC sequence from the ACK field.',
    encoding: 'Always recessive (1)',
  },
  {
    name: 'ACK',
    bits: 1,
    color: '#e040fb',
    description: 'ACK slot. Transmitter sends recessive; any receiver with a valid CRC drives dominant to acknowledge.',
    encoding: 'Transmitter: recessive. Receiver: dominant if CRC OK.',
  },
  {
    name: 'ACK del',
    bits: 1,
    color: '#e040fb',
    description: 'ACK delimiter. Fixed recessive bit after the ACK slot.',
    encoding: 'Always recessive (1)',
  },
  {
    name: 'EOF',
    bits: 7,
    color: '#78909c',
    description: 'End of Frame. Seven recessive bits. Longer than any valid stuff-bit sequence so it cannot be mimicked by data.',
    encoding: '7 consecutive recessive (1) bits',
  },
]

const TOTAL_BITS = STANDARD_FIELDS.reduce((sum, f) => sum + f.bits, 0)
const MIN_WIDTH_PX = 32

export function FrameAnatomy() {
  const [active, setActive] = useState<FrameField | null>(null)

  const handleEnter = useCallback((field: FrameField) => {
    setActive(field)
  }, [])

  const handleLeave = useCallback(() => {
    setActive(null)
  }, [])

  return (
    <div className="my-6 select-none">
      <p className="text-xs mb-2 opacity-60 font-mono">
        Standard CAN Data Frame (11-bit ID, 8-byte payload) — {TOTAL_BITS} bits before stuffing
      </p>

      {/* Frame bar */}
      <div
        className="flex rounded-md overflow-hidden border border-neutral-700"
        role="group"
        aria-label="CAN frame fields"
      >
        {STANDARD_FIELDS.map((field) => {
          const proportion = field.bits / TOTAL_BITS
          const isActive = active?.name === field.name
          return (
            <button
              key={field.name}
              type="button"
              className="relative transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{
                flexGrow: proportion * 100,
                flexBasis: 0,
                minWidth: field.bits <= 1 ? MIN_WIDTH_PX / 2 : MIN_WIDTH_PX,
                backgroundColor: field.color,
                opacity: active === null || isActive ? 1 : 0.35,
                transform: isActive ? 'scaleY(1.15)' : 'scaleY(1)',
              }}
              onMouseEnter={() => handleEnter(field)}
              onMouseLeave={handleLeave}
              onFocus={() => handleEnter(field)}
              onBlur={handleLeave}
              aria-label={`${field.name}: ${field.bits} bit${field.bits > 1 ? 's' : ''}`}
            >
              <span className="block py-2 px-1 text-[10px] sm:text-xs font-bold text-white text-center truncate leading-tight">
                {field.name}
              </span>
              <span className="block text-[8px] sm:text-[10px] text-white/70 text-center pb-1">
                {field.bits}b
              </span>
            </button>
          )
        })}
      </div>

      {/* Info panel */}
      <div
        className="mt-3 rounded-md border border-neutral-700 bg-neutral-900 p-4 min-h-[100px] transition-opacity duration-150"
        style={{ opacity: active ? 1 : 0.5 }}
        aria-live="polite"
      >
        {active ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: active.color }}
                aria-hidden
              />
              <span className="font-semibold text-sm text-white">
                {active.name}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {active.bits} bit{active.bits > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-neutral-300 mb-1">{active.description}</p>
            <p className="text-xs text-neutral-500 font-mono">{active.encoding}</p>
          </>
        ) : (
          <p className="text-sm text-neutral-500 italic">
            Hover or tap a field above to see its description and encoding rules.
          </p>
        )}
      </div>
    </div>
  )
}
