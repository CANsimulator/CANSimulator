'use client'

import { useState, useMemo } from 'react'

interface ObdMode {
  code: string
  name: string
  description: string
  color: string
  pids?: ObdPid[]
}

interface ObdPid {
  pid: string
  name: string
  bytes: number
  formula: string
  unit: string
}

const MODES: ObdMode[] = [
  {
    code: '0x01',
    name: 'Current data',
    description: 'Live sensor readings — engine RPM, coolant temp, speed, O₂ sensors',
    color: '#00BCD4',
    pids: [
      { pid: '0x00', name: 'PIDs supported [01-20]', bytes: 4, formula: 'bit-mask', unit: '—' },
      { pid: '0x04', name: 'Calculated engine load', bytes: 1, formula: 'A × 100 / 255', unit: '%' },
      { pid: '0x05', name: 'Engine coolant temp', bytes: 1, formula: 'A − 40', unit: '°C' },
      { pid: '0x0B', name: 'Intake manifold absolute pressure', bytes: 1, formula: 'A', unit: 'kPa' },
      { pid: '0x0C', name: 'Engine RPM', bytes: 2, formula: '(256·A + B) / 4', unit: 'rpm' },
      { pid: '0x0D', name: 'Vehicle speed', bytes: 1, formula: 'A', unit: 'km/h' },
      { pid: '0x0E', name: 'Timing advance', bytes: 1, formula: 'A/2 − 64', unit: '° rel #1 cyl' },
      { pid: '0x0F', name: 'Intake air temperature', bytes: 1, formula: 'A − 40', unit: '°C' },
      { pid: '0x10', name: 'MAF air flow rate', bytes: 2, formula: '(256·A + B) / 100', unit: 'g/s' },
      { pid: '0x11', name: 'Throttle position', bytes: 1, formula: 'A × 100 / 255', unit: '%' },
      { pid: '0x1F', name: 'Run time since engine start', bytes: 2, formula: '256·A + B', unit: 's' },
      { pid: '0x21', name: 'Distance with MIL on', bytes: 2, formula: '256·A + B', unit: 'km' },
      { pid: '0x2F', name: 'Fuel tank level input', bytes: 1, formula: 'A × 100 / 255', unit: '%' },
      { pid: '0x42', name: 'Control module voltage', bytes: 2, formula: '(256·A + B) / 1000', unit: 'V' },
      { pid: '0x46', name: 'Ambient air temperature', bytes: 1, formula: 'A − 40', unit: '°C' },
      { pid: '0x5C', name: 'Engine oil temperature', bytes: 1, formula: 'A − 40', unit: '°C' },
    ],
  },
  {
    code: '0x02',
    name: 'Freeze-frame data',
    description: 'Snapshot of mode 01 data at the moment a DTC was confirmed',
    color: '#FFB300',
    pids: [
      { pid: '0x02', name: 'DTC that caused freeze frame', bytes: 2, formula: 'encoded DTC', unit: '—' },
      { pid: '0x0C', name: 'Engine RPM at freeze', bytes: 2, formula: '(256·A + B) / 4', unit: 'rpm' },
      { pid: '0x0D', name: 'Vehicle speed at freeze', bytes: 1, formula: 'A', unit: 'km/h' },
    ],
  },
  {
    code: '0x03',
    name: 'Stored DTCs',
    description: 'Read confirmed diagnostic trouble codes (MIL illuminated)',
    color: '#FF5252',
  },
  {
    code: '0x04',
    name: 'Clear DTCs',
    description: 'Clear stored codes and turn off MIL',
    color: '#F06292',
  },
  {
    code: '0x05',
    name: 'O₂ sensor test results',
    description: 'Non-continuous oxygen sensor monitoring (legacy)',
    color: '#7C4DFF',
  },
  {
    code: '0x06',
    name: 'On-board monitoring',
    description: 'Continuous and non-continuous test results for non-CAN diagnostics',
    color: '#29B6F6',
  },
  {
    code: '0x07',
    name: 'Pending DTCs',
    description: 'Codes detected on current or last driving cycle but not yet confirmed',
    color: '#FF5252',
  },
  {
    code: '0x08',
    name: 'Bi-directional control',
    description: 'Tester-to-ECU control of on-board components (rarely used)',
    color: '#9ca3af',
  },
  {
    code: '0x09',
    name: 'Vehicle information',
    description: 'VIN, calibration IDs, calibration verification numbers, ECU name',
    color: '#00E676',
    pids: [
      { pid: '0x02', name: 'Vehicle Identification Number (VIN)', bytes: 17, formula: 'ASCII', unit: '—' },
      { pid: '0x04', name: 'Calibration ID', bytes: 16, formula: 'ASCII', unit: '—' },
      { pid: '0x06', name: 'Calibration Verification Number', bytes: 4, formula: 'hex', unit: '—' },
      { pid: '0x0A', name: 'ECU name', bytes: 20, formula: 'ASCII', unit: '—' },
    ],
  },
  {
    code: '0x0A',
    name: 'Permanent DTCs',
    description: 'DTCs that cannot be cleared by scan tool — only the ECU itself can retire them',
    color: '#FF5252',
  },
]

export function ObdPidReference() {
  const [activeMode, setActiveMode] = useState(0) // Mode 01
  const [query, setQuery] = useState('')

  const mode = MODES[activeMode]

  const filteredPids = useMemo(() => {
    if (!mode.pids) return []
    const q = query.trim().toLowerCase()
    if (!q) return mode.pids
    return mode.pids.filter(
      p =>
        p.pid.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q)
    )
  }, [query, mode])

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: OBD-II modes and common PIDs — click a mode to see its PIDs
      </p>

      {/* Mode selector */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mb-4">
        {MODES.map((m, i) => {
          const isActive = i === activeMode
          return (
            <button
              key={m.code}
              onClick={() => { setActiveMode(i); setQuery('') }}
              className="text-left px-2 py-1.5 rounded border transition-all duration-150"
              style={{
                borderColor: isActive ? m.color : '#2d3748',
                backgroundColor: isActive ? `${m.color}10` : '#0f1115',
              }}
            >
              <div
                className="text-[11px] font-mono font-bold"
                style={{ color: isActive ? m.color : '#d1d5db' }}
              >
                {m.code}
              </div>
              <div className="text-[9px] font-mono text-neutral-500 truncate">
                {m.name}
              </div>
            </button>
          )
        })}
      </div>

      {/* Mode detail */}
      <div className="rounded border p-3" style={{ borderColor: `${mode.color}40`, backgroundColor: `${mode.color}08` }}>
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-sm font-mono font-bold" style={{ color: mode.color }}>
            Mode {mode.code}
          </span>
          <span className="text-[12px] text-neutral-200 font-mono">{mode.name}</span>
        </div>
        <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">{mode.description}</p>

        {mode.pids ? (
          <>
            {/* PID search */}
            <div className="relative mb-2">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search PIDs in this mode…"
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none transition-colors"
                style={{ borderColor: query ? mode.color : undefined }}
              />
            </div>

            {/* PID table */}
            <div className="rounded overflow-hidden border border-neutral-800">
              <div className="grid grid-cols-[60px_1fr_50px_80px] sm:grid-cols-[70px_1fr_140px_50px_70px] bg-neutral-950 text-[9px] uppercase tracking-wider text-neutral-500 font-mono">
                <div className="px-2 py-1.5">PID</div>
                <div className="px-2 py-1.5">Description</div>
                <div className="px-2 py-1.5 hidden sm:block">Formula</div>
                <div className="px-2 py-1.5 text-center">Bytes</div>
                <div className="px-2 py-1.5 text-right">Unit</div>
              </div>
              {filteredPids.length === 0 ? (
                <div className="px-3 py-4 text-center text-[11px] text-neutral-500 italic">
                  No PID matches "{query}".
                </div>
              ) : (
                filteredPids.map((p, i) => (
                  <div
                    key={p.pid}
                    className="grid grid-cols-[60px_1fr_50px_80px] sm:grid-cols-[70px_1fr_140px_50px_70px] border-t border-neutral-800 hover:bg-neutral-800/40 transition-colors"
                    style={{ backgroundColor: i % 2 === 0 ? '#0f1115' : 'transparent' }}
                  >
                    <div className="px-2 py-1.5 font-mono text-[11px] font-bold" style={{ color: mode.color }}>
                      {p.pid}
                    </div>
                    <div className="px-2 py-1.5 font-mono text-[10px] text-neutral-200">{p.name}</div>
                    <div className="px-2 py-1.5 font-mono text-[10px] text-neutral-500 hidden sm:block">
                      {p.formula}
                    </div>
                    <div className="px-2 py-1.5 text-[10px] font-mono text-neutral-400 text-center">{p.bytes}</div>
                    <div className="px-2 py-1.5 text-[10px] font-mono text-neutral-400 text-right">{p.unit}</div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-2 text-[9px] text-neutral-500 font-mono text-right">
              {filteredPids.length} of {mode.pids.length} PIDs in mode {mode.code}
            </div>
          </>
        ) : (
          <div className="text-[10px] text-neutral-500 italic font-mono">
            Mode {mode.code} has no data-identifier PIDs — request the mode directly and interpret the response payload.
          </div>
        )}
      </div>
    </div>
  )
}
