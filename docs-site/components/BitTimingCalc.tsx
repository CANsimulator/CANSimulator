'use client'

import { useState, useMemo } from 'react'

const COMMON_CLOCKS = [8, 16, 20, 24, 40, 48, 80] // MHz
const TARGET_RATES = [125, 250, 500, 1000] // kbit/s

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export function BitTimingCalc() {
  const [clockMhz, setClockMhz] = useState(16)
  const [brp, setBrp] = useState(2)
  const [tseg1, setTseg1] = useState(13)
  const [tseg2, setTseg2] = useState(2)
  const [sjw, setSjw] = useState(1)

  const results = useMemo(() => {
    const tq = brp / clockMhz // µs
    const totalTq = 1 + tseg1 + tseg2 // sync_seg(1) + tseg1 + tseg2
    const bitrate = 1_000 / (tq * totalTq) // kbit/s
    const samplePoint = ((1 + tseg1) / totalTq) * 100 // %

    return {
      tq: tq * 1000, // ns
      totalTq,
      bitrate: Math.round(bitrate * 100) / 100,
      samplePoint: Math.round(samplePoint * 10) / 10,
      sjwValid: sjw >= 1 && sjw <= Math.min(4, tseg2),
    }
  }, [clockMhz, brp, tseg1, tseg2, sjw])

  const samplePointOk =
    results.samplePoint >= 75 && results.samplePoint <= 87.5

  const bitrateMatch = TARGET_RATES.find(
    (r) => Math.abs(results.bitrate - r) < 0.5
  )

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: CAN bit-timing calculator
      </p>

      {/* Inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Clock (MHz)
          <select
            value={clockMhz}
            onChange={(e) => setClockMhz(Number(e.target.value))}
            className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white text-sm"
          >
            {COMMON_CLOCKS.map((c) => (
              <option key={c} value={c}>
                {c} MHz
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          BRP
          <input
            type="number"
            min={1}
            max={1024}
            value={brp}
            onChange={(e) => setBrp(clamp(Number(e.target.value), 1, 1024))}
            className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white text-sm font-mono w-full"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          TSEG1
          <input
            type="number"
            min={1}
            max={256}
            value={tseg1}
            onChange={(e) => setTseg1(clamp(Number(e.target.value), 1, 256))}
            className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white text-sm font-mono w-full"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          TSEG2
          <input
            type="number"
            min={1}
            max={128}
            value={tseg2}
            onChange={(e) => setTseg2(clamp(Number(e.target.value), 1, 128))}
            className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white text-sm font-mono w-full"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          SJW
          <input
            type="number"
            min={1}
            max={4}
            value={sjw}
            onChange={(e) => setSjw(clamp(Number(e.target.value), 1, 4))}
            className="bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white text-sm font-mono w-full"
          />
        </label>
      </div>

      {/* Visual bit layout */}
      <div className="flex rounded overflow-hidden h-8 mb-4 border border-neutral-700" role="img" aria-label="Bit time segments">
        {/* Sync seg */}
        <div
          className="flex items-center justify-center text-[10px] font-mono text-white"
          style={{
            width: `${(1 / results.totalTq) * 100}%`,
            backgroundColor: '#78909c',
            minWidth: 30,
          }}
        >
          Sync
        </div>
        {/* TSEG1 */}
        <div
          className="flex items-center justify-center text-[10px] font-mono text-white"
          style={{
            width: `${(tseg1 / results.totalTq) * 100}%`,
            backgroundColor: '#00b8d4',
          }}
        >
          TSEG1 ({tseg1} Tq)
        </div>
        {/* Sample point marker */}
        <div
          className="w-0.5 bg-yellow-400 z-10 relative"
          style={{ marginLeft: '-1px', marginRight: '-1px' }}
          title="Sample point"
        />
        {/* TSEG2 */}
        <div
          className="flex items-center justify-center text-[10px] font-mono text-white"
          style={{
            width: `${(tseg2 / results.totalTq) * 100}%`,
            backgroundColor: '#7c4dff',
          }}
        >
          TSEG2 ({tseg2} Tq)
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="bg-neutral-800 rounded p-2">
          <span className="text-neutral-500 text-xs block">Bit Rate</span>
          <span className={`font-mono font-bold ${bitrateMatch ? 'text-green-400' : 'text-white'}`}>
            {results.bitrate} kbit/s
          </span>
          {bitrateMatch && (
            <span className="text-green-500 text-[10px] block">
              matches {bitrateMatch} kbit/s
            </span>
          )}
        </div>

        <div className="bg-neutral-800 rounded p-2">
          <span className="text-neutral-500 text-xs block">Sample Point</span>
          <span className={`font-mono font-bold ${samplePointOk ? 'text-green-400' : 'text-amber-400'}`}>
            {results.samplePoint}%
          </span>
          <span className="text-neutral-600 text-[10px] block">
            target 75 – 87.5%
          </span>
        </div>

        <div className="bg-neutral-800 rounded p-2">
          <span className="text-neutral-500 text-xs block">Time Quantum</span>
          <span className="font-mono font-bold text-white">
            {results.tq.toFixed(1)} ns
          </span>
        </div>

        <div className="bg-neutral-800 rounded p-2">
          <span className="text-neutral-500 text-xs block">Total TQ / bit</span>
          <span className="font-mono font-bold text-white">
            {results.totalTq}
          </span>
          <span className="text-neutral-600 text-[10px] block">
            1 + {tseg1} + {tseg2}
          </span>
        </div>
      </div>

      {!results.sjwValid && (
        <p className="mt-3 text-xs text-amber-400">
          SJW must be between 1 and min(4, TSEG2). Current TSEG2 = {tseg2}.
        </p>
      )}
    </div>
  )
}
