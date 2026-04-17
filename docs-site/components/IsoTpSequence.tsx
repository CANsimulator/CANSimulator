'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface Step {
  direction: 'to-ecu' | 'to-tester'
  frameType: 'FF' | 'FC' | 'CF'
  label: string
  pci: string
  note: string
  color: string
}

const STEPS: Step[] = [
  {
    direction: 'to-ecu',
    frameType: 'FF',
    label: 'First Frame',
    pci: '10 8E [6 bytes of data]',
    note: 'I have 142 bytes to send',
    color: '#00BCD4',
  },
  {
    direction: 'to-tester',
    frameType: 'FC',
    label: 'Flow Control — BS=0, STmin=5 ms',
    pci: '30 00 05',
    note: 'Send all frames, 5 ms apart',
    color: '#FFB300',
  },
  {
    direction: 'to-ecu',
    frameType: 'CF',
    label: 'Consecutive Frame  SN=1',
    pci: '21 [7 bytes]',
    note: '',
    color: '#7C4DFF',
  },
  {
    direction: 'to-ecu',
    frameType: 'CF',
    label: 'Consecutive Frame  SN=2',
    pci: '22 [7 bytes]',
    note: '',
    color: '#7C4DFF',
  },
  {
    direction: 'to-ecu',
    frameType: 'CF',
    label: 'Consecutive Frame  SN=3 … F',
    pci: '23 … 2F [7 bytes each]',
    note: 'Sequence number wraps 0–F',
    color: '#7C4DFF',
  },
  {
    direction: 'to-ecu',
    frameType: 'CF',
    label: 'Consecutive Frame  SN=0',
    pci: '20 [7 bytes]',
    note: 'Counter wrapped back to 0',
    color: '#7C4DFF',
  },
  {
    direction: 'to-ecu',
    frameType: 'CF',
    label: 'Last Consecutive Frame',
    pci: '2N [remaining bytes]',
    note: 'Transfer complete — ECU reassembles',
    color: '#00E676',
  },
]

const FRAME_TYPE_INFO: Record<string, string> = {
  FF: 'First Frame (PCI 0x1N) — opens a multi-frame transfer. Contains total message length in the first two bytes.',
  FC: 'Flow Control (PCI 0x3N) — sent by receiver to authorise transmission. BS=0 means send all; STmin sets minimum gap between consecutive frames.',
  CF: 'Consecutive Frame (PCI 0x2N) — carries the payload segments. SN (sequence number) increments 1–F then wraps to 0.',
}

export function IsoTpSequence() {
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const advance = useCallback(() => {
    setActive(prev => {
      if (prev >= STEPS.length - 1) {
        setPlaying(false)
        return prev
      }
      return prev + 1
    })
  }, [])

  useEffect(() => {
    if (playing) {
      timerRef.current = setTimeout(advance, 900)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, active, advance])

  const togglePlay = () => {
    if (active >= STEPS.length - 1) {
      setActive(0)
      setPlaying(true)
    } else {
      setPlaying(p => !p)
    }
  }

  const step = STEPS[active]

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4 font-mono text-xs">
      <p className="mb-4 opacity-60 text-[10px]">
        Interactive: ISO-TP multi-frame exchange — step through or auto-play
      </p>

      {/* Header row */}
      <div className="grid grid-cols-[1fr_24px_1fr] mb-1 text-[10px] text-neutral-400 uppercase tracking-widest">
        <span className="text-center">Tester</span>
        <span />
        <span className="text-center">ECU</span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical timelines */}
        <div className="absolute left-[calc(25%-1px)] top-0 bottom-0 w-px bg-neutral-700" />
        <div className="absolute right-[calc(25%-1px)] top-0 bottom-0 w-px bg-neutral-700" />

        {STEPS.map((s, i) => {
          const isActive = i === active
          const isPast = i < active
          const color = isActive ? s.color : isPast ? `${s.color}55` : '#374151'
          const textColor = isActive ? s.color : isPast ? `${s.color}99` : '#4b5563'

          return (
            <button
              key={i}
              onClick={() => { setPlaying(false); setActive(i) }}
              className="w-full grid grid-cols-[1fr_24px_1fr] items-center py-2 px-0 text-left transition-all duration-200 hover:bg-neutral-800 rounded"
              style={{ cursor: 'pointer' }}
            >
              {/* Left side */}
              <div className="flex justify-end pr-2">
                {s.direction === 'to-ecu' ? (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ color: textColor, backgroundColor: isActive ? `${s.color}18` : 'transparent' }}
                  >
                    {s.frameType}
                  </span>
                ) : (
                  <span />
                )}
              </div>

              {/* Arrow */}
              <div className="relative flex items-center justify-center h-6">
                {/* Horizontal line spanning full width */}
                <div
                  className="absolute"
                  style={{
                    height: '1.5px',
                    backgroundColor: color,
                    left: s.direction === 'to-ecu' ? '-100%' : '100%',
                    right: s.direction === 'to-ecu' ? '100%' : '-100%',
                    transition: 'background-color 0.2s',
                  }}
                />
                {/* Arrow dot */}
                <div
                  className="w-2 h-2 rounded-full z-10 transition-colors duration-200"
                  style={{ backgroundColor: color }}
                />
              </div>

              {/* Right side */}
              <div className="flex justify-start pl-2">
                {s.direction === 'to-tester' ? (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ color: textColor, backgroundColor: isActive ? `${s.color}18` : 'transparent' }}
                  >
                    {s.frameType}
                  </span>
                ) : (
                  <span />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Step counter + controls */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => { setPlaying(false); setActive(a => Math.max(0, a - 1)) }}
          disabled={active === 0}
          className="px-3 py-1 rounded text-[10px] border border-neutral-600 text-neutral-300 disabled:opacity-30 hover:border-neutral-400 transition-colors"
        >
          ← Prev
        </button>
        <button
          onClick={togglePlay}
          className="px-3 py-1 rounded text-[10px] border transition-colors"
          style={{
            borderColor: playing ? '#FFB300' : '#00BCD4',
            color: playing ? '#FFB300' : '#00BCD4',
          }}
        >
          {playing ? '⏸ Pause' : active >= STEPS.length - 1 ? '↺ Replay' : '▶ Play'}
        </button>
        <button
          onClick={() => { setPlaying(false); setActive(a => Math.min(STEPS.length - 1, a + 1)) }}
          disabled={active >= STEPS.length - 1}
          className="px-3 py-1 rounded text-[10px] border border-neutral-600 text-neutral-300 disabled:opacity-30 hover:border-neutral-400 transition-colors"
        >
          Next →
        </button>
        <span className="ml-auto text-neutral-500 text-[10px]">
          Step {active + 1} / {STEPS.length}
        </span>
      </div>

      {/* Detail panel */}
      <div
        className="mt-3 rounded border p-3 transition-all duration-200 min-h-[88px]"
        style={{ borderColor: `${step.color}40`, backgroundColor: `${step.color}0a` }}
      >
        <div className="flex items-baseline gap-3 mb-1.5">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${step.color}25`, color: step.color }}
          >
            {step.frameType}
          </span>
          <span className="text-neutral-200 text-[11px]">{step.label}</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-neutral-500 text-[10px]">PCI bytes:</span>
          <code style={{ color: step.color }} className="text-[10px]">{step.pci}</code>
        </div>
        {FRAME_TYPE_INFO[step.frameType] && (
          <p className="text-neutral-400 text-[10px] leading-relaxed">
            {FRAME_TYPE_INFO[step.frameType]}
          </p>
        )}
        {step.note && (
          <p className="mt-1 text-neutral-300 text-[10px] italic opacity-80">
            "{step.note}"
          </p>
        )}
      </div>
    </div>
  )
}
