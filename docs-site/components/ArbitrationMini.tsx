'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface NodeConfig {
  label: string
  id: number
  color: string
}

const NODES: NodeConfig[] = [
  { label: 'Node A', id: 0x100, color: '#00b8d4' },
  { label: 'Node B', id: 0x200, color: '#ffab00' },
  { label: 'Node C', id: 0x300, color: '#ff3d00' },
]

function toBinary11(value: number): string {
  return value.toString(2).padStart(11, '0')
}

interface ArbitrationStep {
  bitIndex: number
  nodeBits: { nodeIdx: number; bit: '0' | '1' }[]
  busBit: '0' | '1'
  losers: number[]
  explanation: string
}

function computeArbitration(ids: number[]): ArbitrationStep[] {
  const steps: ArbitrationStep[] = []
  const binaries = ids.map((id) => toBinary11(id))
  const eliminated = new Set<number>()

  for (let bitPos = 0; bitPos < 11; bitPos++) {
    const nodeBits = ids.map((_, idx) => ({
      nodeIdx: idx,
      bit: (eliminated.has(idx) ? '-' : binaries[idx][bitPos]) as '0' | '1',
    }))

    const activeBits = nodeBits.filter(
      (nb) => !eliminated.has(nb.nodeIdx) && nb.bit !== '-'
    )
    const busBit: '0' | '1' = activeBits.some((nb) => nb.bit === '0') ? '0' : '1'

    const newLosers: number[] = []
    for (const nb of activeBits) {
      if (busBit === '0' && nb.bit === '1') {
        newLosers.push(nb.nodeIdx)
        eliminated.add(nb.nodeIdx)
      }
    }

    const remaining = ids.length - eliminated.size
    let explanation = `Bit ${bitPos} (MSB-${bitPos}): bus = ${busBit === '0' ? 'dominant' : 'recessive'}.`
    if (newLosers.length > 0) {
      const names = newLosers.map((i) => NODES[i].label).join(', ')
      explanation += ` ${names} sent recessive but read dominant — loses arbitration.`
    }
    if (remaining === 1 && newLosers.length > 0) {
      const winner = ids.findIndex((_, i) => !eliminated.has(i))
      explanation += ` ${NODES[winner].label} wins!`
    }

    steps.push({
      bitIndex: bitPos,
      nodeBits: nodeBits.map((nb) => ({
        ...nb,
        bit: eliminated.has(nb.nodeIdx) && !newLosers.includes(nb.nodeIdx)
          ? ('-' as '0' | '1')
          : nb.bit,
      })),
      busBit,
      losers: newLosers,
      explanation,
    })

    if (remaining <= 1) break
  }

  return steps
}

export function ArbitrationMini() {
  const [ids, setIds] = useState<number[]>(NODES.map((n) => n.id))
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const steps = computeArbitration(ids)
  const visibleSteps = steps.slice(0, step + 1)

  const advance = useCallback(() => {
    setStep((prev) => {
      if (prev >= steps.length - 1) {
        setPlaying(false)
        return prev
      }
      return prev + 1
    })
  }, [steps.length])

  useEffect(() => {
    if (playing) {
      timerRef.current = setTimeout(advance, 600)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [playing, step, advance])

  const reset = useCallback(() => {
    setStep(0)
    setPlaying(false)
  }, [])

  const handleIdChange = useCallback((nodeIdx: number, hex: string) => {
    const val = parseInt(hex, 16)
    if (isNaN(val) || val < 0 || val > 0x7ff) return
    setIds((prev) => {
      const next = [...prev]
      next[nodeIdx] = val
      return next
    })
    reset()
  }, [reset])

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: 3-node arbitration — edit IDs, then step or play
      </p>

      {/* ID Editors */}
      <div className="flex flex-wrap gap-3 mb-4">
        {NODES.map((node, idx) => (
          <label key={node.label} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: node.color }}
              aria-hidden
            />
            <span className="text-neutral-300">{node.label}</span>
            <span className="text-neutral-500">0x</span>
            <input
              type="text"
              maxLength={3}
              defaultValue={ids[idx].toString(16).toUpperCase().padStart(3, '0')}
              onChange={(e) => handleIdChange(idx, e.target.value)}
              className="w-14 bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 font-mono text-xs text-white text-center"
              aria-label={`${node.label} ID in hex`}
            />
            <span className="text-neutral-600 text-xs font-mono">
              {toBinary11(ids[idx])}
            </span>
          </label>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={advance}
          disabled={step >= steps.length - 1}
          className="px-3 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-30 transition-colors"
        >
          Step
        </button>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="px-3 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-3 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Arbitration table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="text-neutral-400 border-b border-neutral-700">
              <th className="text-left py-1 pr-2">Bit</th>
              {NODES.map((n) => (
                <th key={n.label} className="text-center py-1 px-2" style={{ color: n.color }}>
                  {n.label}
                </th>
              ))}
              <th className="text-center py-1 px-2 text-white">Bus</th>
              <th className="text-left py-1 pl-3">Result</th>
            </tr>
          </thead>
          <tbody>
            {visibleSteps.map((s) => (
              <tr
                key={s.bitIndex}
                className={`border-b border-neutral-800 ${
                  s.losers.length > 0 ? 'bg-red-950/20' : ''
                }`}
              >
                <td className="py-1 pr-2 text-neutral-500">{s.bitIndex}</td>
                {s.nodeBits.map((nb) => {
                  const isLoser = s.losers.includes(nb.nodeIdx)
                  return (
                    <td
                      key={nb.nodeIdx}
                      className="text-center py-1 px-2"
                      style={{
                        color: nb.bit === '-' ? '#555' : NODES[nb.nodeIdx].color,
                        textDecoration: isLoser ? 'line-through' : 'none',
                      }}
                    >
                      {nb.bit}
                    </td>
                  )
                })}
                <td className="text-center py-1 px-2 font-bold text-white">
                  {s.busBit}
                </td>
                <td className="py-1 pl-3 text-neutral-400 text-[11px]">
                  {s.losers.length > 0
                    ? s.explanation.split('.').slice(1).join('.').trim()
                    : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Explanation for current step */}
      {visibleSteps.length > 0 && (
        <p className="mt-3 text-sm text-neutral-300" aria-live="polite">
          {visibleSteps[visibleSteps.length - 1].explanation}
        </p>
      )}
    </div>
  )
}
