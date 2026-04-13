'use client'

import { useState, useCallback } from 'react'

interface FrameField {
  name: string
  bits: number
  color: string
  description: string
  encoding: string
}

const EXTENDED_FIELDS: FrameField[] = [
  {
    name: 'SOF',
    bits: 1,
    color: '#ff3d00',
    description: 'Start of Frame. A single dominant (0) bit — identical to the standard frame.',
    encoding: 'Always dominant (0)',
  },
  {
    name: 'Base ID',
    bits: 11,
    color: '#00b8d4',
    description: 'The upper 11 bits of the 29-bit identifier (ID[28:18]). Same position as the standard frame ID — this is how arbitration begins identically for both formats.',
    encoding: '11 bits, MSB first. Determines initial arbitration priority.',
  },
  {
    name: 'SRR',
    bits: 1,
    color: '#00e676',
    description: 'Substitute Remote Request. Always recessive (1). Occupies the position where the standard frame has RTR. Ensures a standard frame wins arbitration over an extended frame with the same base ID.',
    encoding: 'Always recessive (1)',
  },
  {
    name: 'IDE',
    bits: 1,
    color: '#00e676',
    description: 'Identifier Extension bit. Recessive (1) signals this is an extended frame. In a standard frame, IDE is dominant (0) — this is how receivers distinguish the two formats.',
    encoding: 'Recessive (1) = extended frame',
  },
  {
    name: 'Ext ID',
    bits: 18,
    color: '#00b8d4',
    description: 'The lower 18 bits of the 29-bit identifier (ID[17:0]). Combined with the Base ID, this gives 29 bits of message identifier.',
    encoding: '18 bits, MSB first. Total ID = Base(11) + Extension(18) = 29 bits.',
  },
  {
    name: 'RTR',
    bits: 1,
    color: '#00b8d4',
    description: 'Remote Transmission Request. Dominant (0) for a data frame, recessive (1) for a remote frame. Placed after the full 29-bit ID.',
    encoding: 'Dominant (0) = data frame. Recessive (1) = remote frame.',
  },
  {
    name: 'r1',
    bits: 1,
    color: '#7c4dff',
    description: 'Reserved bit 1. Must be transmitted as dominant. Not present in the standard frame — extended frames have two reserved bits.',
    encoding: 'Always dominant (0)',
  },
  {
    name: 'r0',
    bits: 1,
    color: '#7c4dff',
    description: 'Reserved bit 0. Must be transmitted as dominant. Same as the standard frame\'s reserved bit.',
    encoding: 'Always dominant (0)',
  },
  {
    name: 'DLC',
    bits: 4,
    color: '#7c4dff',
    description: 'Data Length Code. Encodes 0–8 data bytes, identical to the standard frame.',
    encoding: '4 bits. 0000 = 0 bytes, 1000 = 8 bytes.',
  },
  {
    name: 'DATA',
    bits: 64,
    color: '#00e676',
    description: 'Application payload — 0 to 8 bytes, identical to the standard frame.',
    encoding: '0 to 64 bits (0–8 bytes), MSB first per byte.',
  },
  {
    name: 'CRC',
    bits: 15,
    color: '#ffab00',
    description: 'CRC-15 sequence. Same polynomial (0x4599) and calculation as the standard frame.',
    encoding: '15 bits.',
  },
  {
    name: 'CRC del',
    bits: 1,
    color: '#ffab00',
    description: 'CRC delimiter. Always recessive.',
    encoding: 'Always recessive (1)',
  },
  {
    name: 'ACK',
    bits: 1,
    color: '#e040fb',
    description: 'ACK slot. Transmitter sends recessive; any receiver with a valid CRC drives dominant.',
    encoding: 'Transmitter: recessive. Receiver: dominant if CRC OK.',
  },
  {
    name: 'ACK del',
    bits: 1,
    color: '#e040fb',
    description: 'ACK delimiter. Always recessive.',
    encoding: 'Always recessive (1)',
  },
  {
    name: 'EOF',
    bits: 7,
    color: '#78909c',
    description: 'End of Frame. Seven recessive bits — identical to the standard frame.',
    encoding: '7 consecutive recessive (1) bits.',
  },
]

const TOTAL_BITS = EXTENDED_FIELDS.reduce((sum, f) => sum + f.bits, 0)
const MIN_WIDTH_PX = 28

export function ExtendedFrameAnatomy() {
  const [active, setActive] = useState<FrameField | null>(null)

  const handleEnter = useCallback((field: FrameField) => setActive(field), [])
  const handleLeave = useCallback(() => setActive(null), [])

  return (
    <div className="my-6 select-none">
      <p className="text-xs mb-2 opacity-60 font-mono">
        Extended CAN Data Frame (29-bit ID, 8-byte payload) — {TOTAL_BITS} bits before stuffing
      </p>

      <div
        className="flex rounded-md overflow-hidden border border-neutral-700"
        role="group"
        aria-label="Extended CAN frame fields"
      >
        {EXTENDED_FIELDS.map((field) => {
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
              <span className="block py-2 px-0.5 text-[9px] sm:text-xs font-bold text-white text-center truncate leading-tight">
                {field.name}
              </span>
              <span className="block text-[7px] sm:text-[10px] text-white/70 text-center pb-1">
                {field.bits}b
              </span>
            </button>
          )
        })}
      </div>

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
              />
              <span className="font-semibold text-sm text-white">{active.name}</span>
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
