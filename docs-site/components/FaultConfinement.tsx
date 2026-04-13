'use client'

import { useState, useCallback } from 'react'

type NodeState = 'error-active' | 'error-passive' | 'bus-off'

interface Snapshot {
  tec: number
  rec: number
  state: NodeState
  event: string
}

function getState(tec: number, rec: number): NodeState {
  if (tec > 255) return 'bus-off'
  if (tec > 127 || rec > 127) return 'error-passive'
  return 'error-active'
}

const STATE_META: Record<NodeState, { label: string; color: string; ring: string; desc: string }> = {
  'error-active': {
    label: 'Error-Active',
    color: '#00e676',
    ring: 'ring-green-500/40',
    desc: 'Normal operation. Sends active error flags (6 dominant bits).',
  },
  'error-passive': {
    label: 'Error-Passive',
    color: '#ffab00',
    ring: 'ring-amber-500/40',
    desc: 'Sends passive error flags (6 recessive bits). Must wait 8 extra bits before transmitting.',
  },
  'bus-off': {
    label: 'Bus-Off',
    color: '#ff3d00',
    ring: 'ring-red-500/40',
    desc: 'Disconnected from bus. Requires 128 × 11 recessive bits to recover.',
  },
}

const EVENTS = [
  { label: 'TX error', tecDelta: 8, recDelta: 0, desc: 'Transmitter detects an error (+8 TEC)' },
  { label: 'RX error', tecDelta: 0, recDelta: 1, desc: 'Receiver detects an error (+1 REC)' },
  { label: 'RX error (sole)', tecDelta: 0, recDelta: 8, desc: 'Sole receiver detects error (+8 REC)' },
  { label: 'TX success', tecDelta: -1, recDelta: 0, desc: 'Successful transmission (−1 TEC)' },
  { label: 'RX success', tecDelta: 0, recDelta: -1, desc: 'Successful reception (−1 REC)' },
  { label: 'Bus-Off recovery', tecDelta: -9999, recDelta: -9999, desc: '128 × 11 recessive bits → reset to 0/0' },
] as const

export function FaultConfinement() {
  const [tec, setTec] = useState(0)
  const [rec, setRec] = useState(0)
  const [history, setHistory] = useState<Snapshot[]>([])

  const state = getState(tec, rec)
  const meta = STATE_META[state]

  const applyEvent = useCallback(
    (eventIdx: number) => {
      const ev = EVENTS[eventIdx]

      // Bus-Off recovery resets both to 0
      if (ev.tecDelta === -9999) {
        if (state !== 'bus-off') return
        setTec(0)
        setRec(0)
        setHistory((h) => [...h, { tec: 0, rec: 0, state: 'error-active', event: ev.label }])
        return
      }

      // Bus-Off nodes can't do anything except recover
      if (state === 'bus-off') return

      const nextTec = Math.max(0, tec + ev.tecDelta)
      const nextRec = Math.max(0, rec + ev.recDelta)
      const nextState = getState(nextTec, nextRec)

      setTec(nextTec)
      setRec(nextRec)
      setHistory((h) => [...h, { tec: nextTec, rec: nextRec, state: nextState, event: ev.label }])
    },
    [tec, rec, state]
  )

  const reset = useCallback(() => {
    setTec(0)
    setRec(0)
    setHistory([])
  }, [])

  // Progress bar percentage (capped at 256 for visual)
  const tecPct = Math.min(tec / 256, 1) * 100
  const recPct = Math.min(rec / 256, 1) * 100

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: CAN fault confinement state machine
      </p>

      {/* State indicator */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full ring-2 ${meta.ring}`}
          style={{ backgroundColor: `${meta.color}15` }}
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: meta.color }}
          />
          <span className="text-sm font-semibold" style={{ color: meta.color }}>
            {meta.label}
          </span>
        </div>
        <span className="text-xs text-neutral-400">{meta.desc}</span>
      </div>

      {/* TEC / REC bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-neutral-400">TEC (Transmit Error Counter)</span>
            <span className="font-mono text-white">{tec}</span>
          </div>
          <div className="h-3 rounded-full bg-neutral-800 overflow-hidden relative">
            {/* Threshold markers */}
            <div
              className="absolute top-0 bottom-0 w-px bg-amber-500/50 z-10"
              style={{ left: `${(128 / 256) * 100}%` }}
              title="128 — Error-Passive threshold"
            />
            <div
              className="absolute top-0 bottom-0 w-px bg-red-500/50 z-10"
              style={{ left: '100%' }}
              title="256 — Bus-Off threshold"
            />
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${tecPct}%`,
                backgroundColor: tec > 255 ? '#ff3d00' : tec > 127 ? '#ffab00' : '#00e676',
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-neutral-600 mt-0.5">
            <span>0</span>
            <span>128</span>
            <span>256</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-neutral-400">REC (Receive Error Counter)</span>
            <span className="font-mono text-white">{rec}</span>
          </div>
          <div className="h-3 rounded-full bg-neutral-800 overflow-hidden relative">
            <div
              className="absolute top-0 bottom-0 w-px bg-amber-500/50 z-10"
              style={{ left: `${(128 / 256) * 100}%` }}
              title="128 — Error-Passive threshold"
            />
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${recPct}%`,
                backgroundColor: rec > 127 ? '#ffab00' : '#00e676',
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-neutral-600 mt-0.5">
            <span>0</span>
            <span>128</span>
            <span>256</span>
          </div>
        </div>
      </div>

      {/* Event buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EVENTS.map((ev, idx) => {
          const disabled =
            (state === 'bus-off' && ev.tecDelta !== -9999) ||
            (state !== 'bus-off' && ev.tecDelta === -9999)
          return (
            <button
              key={ev.label}
              type="button"
              onClick={() => applyEvent(idx)}
              disabled={disabled}
              className="px-3 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              title={ev.desc}
            >
              {ev.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={reset}
          className="px-3 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600 text-white transition-colors ml-auto"
        >
          Reset
        </button>
      </div>

      {/* State machine diagram */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 py-3">
        {(['error-active', 'error-passive', 'bus-off'] as const).map((s, i) => {
          const m = STATE_META[s]
          const isCurrent = state === s
          return (
            <div key={s} className="flex items-center gap-2 sm:gap-4">
              <div
                className={`flex flex-col items-center justify-center rounded-lg border-2 px-3 py-2 transition-all duration-300 ${
                  isCurrent ? 'scale-110' : 'opacity-40 scale-90'
                }`}
                style={{
                  borderColor: m.color,
                  backgroundColor: isCurrent ? `${m.color}15` : 'transparent',
                  minWidth: 90,
                }}
              >
                <span
                  className="text-[10px] sm:text-xs font-bold"
                  style={{ color: m.color }}
                >
                  {m.label}
                </span>
                {s === 'error-active' && (
                  <span className="text-[9px] text-neutral-500">TEC≤127 REC≤127</span>
                )}
                {s === 'error-passive' && (
                  <span className="text-[9px] text-neutral-500">TEC&gt;127 or REC&gt;127</span>
                )}
                {s === 'bus-off' && (
                  <span className="text-[9px] text-neutral-500">TEC&gt;255</span>
                )}
              </div>
              {i < 2 && (
                <span className="text-neutral-600 text-lg">→</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Event history */}
      {history.length > 0 && (
        <div className="max-h-40 overflow-y-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="text-neutral-500 border-b border-neutral-700">
                <th className="text-left py-1 pr-2">#</th>
                <th className="text-left py-1 pr-2">Event</th>
                <th className="text-right py-1 px-2">TEC</th>
                <th className="text-right py-1 px-2">REC</th>
                <th className="text-left py-1 pl-2">State</th>
              </tr>
            </thead>
            <tbody>
              {history.map((snap, i) => (
                <tr key={i} className="border-b border-neutral-800">
                  <td className="py-0.5 pr-2 text-neutral-600">{i + 1}</td>
                  <td className="py-0.5 pr-2 text-neutral-300">{snap.event}</td>
                  <td className="py-0.5 px-2 text-right text-white">{snap.tec}</td>
                  <td className="py-0.5 px-2 text-right text-white">{snap.rec}</td>
                  <td
                    className="py-0.5 pl-2 font-bold"
                    style={{ color: STATE_META[snap.state].color }}
                  >
                    {STATE_META[snap.state].label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
