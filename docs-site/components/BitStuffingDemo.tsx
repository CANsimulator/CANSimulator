'use client'

import { useState, useCallback } from 'react'

interface BitCell {
  value: '0' | '1'
  isStuff: boolean
  runGroup: number // which consecutive-run this bit belongs to
}

// Encode a data sequence with bit stuffing
function stuffBits(data: ('0' | '1')[]): BitCell[] {
  const result: BitCell[] = []
  let consecutiveCount = 0
  let lastBit: '0' | '1' | null = null
  let groupId = 0

  for (const bit of data) {
    if (bit === lastBit) {
      consecutiveCount++
    } else {
      consecutiveCount = 1
      lastBit = bit
      groupId++
    }

    result.push({ value: bit, isStuff: false, runGroup: groupId })

    if (consecutiveCount === 5) {
      // Insert stuff bit of opposite polarity
      const stuffBit: '0' | '1' = bit === '0' ? '1' : '0'
      groupId++
      result.push({ value: stuffBit, isStuff: true, runGroup: groupId })
      consecutiveCount = 1
      lastBit = stuffBit
      groupId++
    }
  }

  return result
}

const DEFAULT_DATA: ('0' | '1')[] = ['1','1','1','1','1','0','0','0','0','0','1','1','1','0','1']

export function BitStuffingDemo() {
  const [data, setData] = useState<('0' | '1')[]>(DEFAULT_DATA)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const stuffed = stuffBits(data)

  const toggleBit = useCallback((idx: number) => {
    setData((prev) => {
      const next = [...prev]
      next[idx] = next[idx] === '0' ? '1' : '0'
      return next
    })
  }, [])

  const reset = useCallback(() => setData(DEFAULT_DATA), [])

  const stuffCount = stuffed.filter((b) => b.isStuff).length

  // Find which data-index each non-stuff bit corresponds to
  let dataIdx = 0
  const stuffedWithDataIdx = stuffed.map((b) => {
    if (b.isStuff) return { ...b, dataIndex: -1 }
    const idx = dataIdx
    dataIdx++
    return { ...b, dataIndex: idx }
  })

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: bit stuffing — click any data bit to toggle, watch stuff bits update
      </p>

      {/* Data bits (editable) */}
      <div className="mb-1">
        <span className="text-[10px] text-neutral-500 font-mono block mb-1">
          Data bits ({data.length}):
        </span>
        <div className="flex gap-px flex-wrap">
          {data.map((bit, i) => {
            // Mark runs of 5
            let runLen = 1
            for (let j = i - 1; j >= 0 && data[j] === bit; j--) runLen++

            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleBit(i)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="w-7 h-7 flex items-center justify-center text-xs font-mono font-bold rounded-sm transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
                style={{
                  backgroundColor: bit === '0' ? '#00b8d433' : '#7c4dff33',
                  color: bit === '0' ? '#00e5ff' : '#b388ff',
                  border: hoveredIdx === i ? '1px solid #fff' : '1px solid transparent',
                  outline: runLen >= 5 ? `1px solid ${bit === '0' ? '#00e5ff55' : '#b388ff55'}` : 'none',
                }}
                aria-label={`Data bit ${i}: ${bit}, click to toggle`}
              >
                {bit}
              </button>
            )
          })}
        </div>
      </div>

      {/* Wire bits (with stuff bits highlighted) */}
      <div className="mt-3">
        <span className="text-[10px] text-neutral-500 font-mono block mb-1">
          On the wire ({stuffed.length} bits = {data.length} data + {stuffCount} stuff):
        </span>
        <div className="flex gap-px flex-wrap">
          {stuffedWithDataIdx.map((bit, i) => (
            <div
              key={i}
              onMouseEnter={() => {
                if (bit.dataIndex >= 0) setHoveredIdx(bit.dataIndex)
              }}
              onMouseLeave={() => setHoveredIdx(null)}
              className="w-7 h-7 flex items-center justify-center text-xs font-mono font-bold rounded-sm transition-all relative"
              style={{
                backgroundColor: bit.isStuff
                  ? '#ffab0033'
                  : bit.value === '0'
                    ? '#00b8d422'
                    : '#7c4dff22',
                color: bit.isStuff
                  ? '#ffd54f'
                  : bit.value === '0'
                    ? '#00e5ff'
                    : '#b388ff',
                border: bit.isStuff
                  ? '1px solid #ffab0066'
                  : hoveredIdx !== null && bit.dataIndex === hoveredIdx
                    ? '1px solid #fff'
                    : '1px solid transparent',
                transform: bit.isStuff ? 'scaleY(1.15)' : 'scaleY(1)',
              }}
            >
              {bit.value}
              {bit.isStuff && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] text-amber-400 whitespace-nowrap">
                  S
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend + controls */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-4 text-[10px] text-neutral-400 font-mono">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/50" />
            stuff bit
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#00b8d433' }} />
            dominant (0)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#7c4dff33' }} />
            recessive (1)
          </span>
        </div>
        <button
          type="button"
          onClick={reset}
          className="px-2 py-0.5 text-[10px] rounded bg-neutral-700 hover:bg-neutral-600 text-white transition-colors font-mono"
        >
          Reset
        </button>
      </div>

      {/* Rule reminder */}
      <p className="mt-3 text-xs text-neutral-500">
        After every 5 consecutive identical bits, a complementary <span className="text-amber-400 font-mono">stuff bit</span> is inserted.
        Click any data bit to toggle it and see how the stuff pattern changes.
      </p>
    </div>
  )
}
