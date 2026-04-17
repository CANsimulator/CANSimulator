'use client'

import { useState } from 'react'

interface FrameType {
  id: string
  name: string
  abbr: string
  firstByte: string
  color: string
  purpose: string
  pciHigh: string
  pciLow: string
  example: { hex: string[]; note: string }
  details: string
}

const TYPES: FrameType[] = [
  {
    id: 'sf',
    name: 'Single Frame',
    abbr: 'SF',
    firstByte: '0x0N',
    color: '#00E676',
    purpose: 'Entire message fits in one CAN frame',
    pciHigh: '0000',
    pciLow: 'len (1–7)',
    example: {
      hex: ['02', '22', 'F1', '90', '00', '00', '00', '00'],
      note: 'UDS ReadDataByIdentifier request (SID 0x22, DID 0xF190 = VIN). PCI = 0x02 → 2 bytes of payload follow.',
    },
    details: 'SF has a single PCI byte: the high nibble is 0, and the low nibble holds the data length (1–7 bytes in classical CAN). CAN FD extends this with an escape sequence (PCI 0x00 + length byte) for payloads up to 62 bytes in one frame.',
  },
  {
    id: 'ff',
    name: 'First Frame',
    abbr: 'FF',
    firstByte: '0x1N NN',
    color: '#00BCD4',
    purpose: 'First segment of a multi-frame transfer — carries total length',
    pciHigh: '0001',
    pciLow: 'len high',
    example: {
      hex: ['10', '8E', '62', 'F1', '90', '31', '48', '47'],
      note: 'Response to ReadDataByIdentifier 0xF190. Total length = 0x08E = 142 bytes. First 6 bytes of VIN follow.',
    },
    details: 'FF uses 2 PCI bytes: high nibble is 1, the remaining 12 bits encode total message length (up to 4095 bytes). For longer messages, CAN FD uses an escape sequence (PCI 0x10 0x00 + 4-byte length) to reach 4 GB.',
  },
  {
    id: 'cf',
    name: 'Consecutive Frame',
    abbr: 'CF',
    firstByte: '0x2N',
    color: '#7C4DFF',
    purpose: 'Subsequent segments — carries 7 bytes each with a sequence counter',
    pciHigh: '0010',
    pciLow: 'SN (0–F)',
    example: {
      hex: ['21', '34', '5A', '4A', '53', '41', '45', '53'],
      note: 'Consecutive Frame with SN=1. Next 7 bytes of VIN. SN increments 1 → F, wraps to 0, continues.',
    },
    details: 'CF has a single PCI byte: high nibble is 2, low nibble is the sequence number. Counter starts at 1 after the FF, wraps 0xF → 0x0. Receiver checks the counter to detect missing frames.',
  },
  {
    id: 'fc',
    name: 'Flow Control',
    abbr: 'FC',
    firstByte: '0x3N BS STmin',
    color: '#FFB300',
    purpose: 'Receiver controls sender — continue / wait / abort + block size + min gap',
    pciHigh: '0011',
    pciLow: 'FS (0/1/2)',
    example: {
      hex: ['30', '00', '05', '00', '00', '00', '00', '00'],
      note: 'FC with FS=0 (Continue to Send), BS=0 (send all without further FC), STmin=0x05 (5 ms between CFs).',
    },
    details: 'FC uses 3 bytes. FS (Flow Status) = 0 Continue, 1 Wait, 2 Abort. BS (Block Size) = how many CFs before next FC (0 = unlimited). STmin = minimum separation time: 0x00–0x7F = 0–127 ms, 0xF1–0xF9 = 100–900 μs (high-speed).',
  },
]

export function IsoTpFrameTypes() {
  const [active, setActive] = useState('sf')
  const t = TYPES.find(x => x.id === active) ?? TYPES[0]

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: ISO-TP frame types — click a card for PCI-byte anatomy and hex example
      </p>

      {/* Type selector cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {TYPES.map(type => {
          const isActive = active === type.id
          return (
            <button
              key={type.id}
              onClick={() => setActive(type.id)}
              className="text-left p-2.5 rounded border transition-all duration-150"
              style={{
                borderColor: isActive ? type.color : '#2d3748',
                backgroundColor: isActive ? `${type.color}12` : '#0f1115',
                transform: isActive ? 'translateY(-1px)' : 'none',
                boxShadow: isActive ? `0 4px 12px ${type.color}25` : 'none',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{
                    color: isActive ? '#000' : type.color,
                    backgroundColor: isActive ? type.color : `${type.color}20`,
                  }}
                >
                  {type.abbr}
                </span>
                <span className="text-[11px] font-mono text-neutral-200">{type.name}</span>
              </div>
              <div className="text-[9px] font-mono text-neutral-500 truncate">
                PCI: {type.firstByte}
              </div>
            </button>
          )
        })}
      </div>

      {/* Detail panel */}
      <div className="rounded border p-3" style={{ borderColor: `${t.color}40`, backgroundColor: `${t.color}08` }}>
        <div className="text-[11px] text-neutral-200 mb-3 font-mono">
          <span style={{ color: t.color }} className="font-bold">Purpose:</span> {t.purpose}
        </div>

        {/* PCI byte anatomy */}
        <div className="mb-3">
          <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono mb-1">
            PCI byte (first nibble high, then low)
          </div>
          <div className="flex gap-1 h-9">
            <div
              className="flex-1 flex flex-col items-center justify-center rounded-l"
              style={{ backgroundColor: `${t.color}50` }}
            >
              <div className="text-[10px] font-mono text-neutral-200 font-bold">{t.pciHigh}</div>
              <div className="text-[8px] font-mono text-neutral-400">type nibble</div>
            </div>
            <div
              className="flex-1 flex flex-col items-center justify-center rounded-r"
              style={{ backgroundColor: `${t.color}25` }}
            >
              <div className="text-[10px] font-mono text-neutral-200 font-bold">{t.pciLow}</div>
              <div className="text-[8px] font-mono text-neutral-400">length / SN / FS</div>
            </div>
          </div>
        </div>

        {/* Example hex */}
        <div className="mb-3">
          <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono mb-1">
            Example frame payload
          </div>
          <div className="flex gap-1">
            {t.example.hex.map((b, i) => (
              <div
                key={i}
                className="flex-1 bg-neutral-950 rounded py-2 text-center font-mono text-[11px]"
                style={{
                  color: i === 0 ? t.color : i < (t.id === 'ff' ? 2 : t.id === 'fc' ? 3 : 1) ? `${t.color}aa` : '#d1d5db',
                  fontWeight: i === 0 ? 'bold' : 'normal',
                  border: i === 0 ? `1px solid ${t.color}60` : '1px solid #1f2937',
                }}
              >
                {b}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-neutral-400 mt-1.5 font-mono italic">
            {t.example.note}
          </p>
        </div>

        {/* Details */}
        <p className="text-[11px] text-neutral-300 leading-relaxed">{t.details}</p>
      </div>
    </div>
  )
}
