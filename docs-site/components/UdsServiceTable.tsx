'use client'

import { useState, useMemo } from 'react'

interface Service {
  sid: string
  name: string
  category: CategoryId
  useCase: string
  subFunc?: boolean
}

type CategoryId = 'session' | 'data' | 'stored' | 'io' | 'routine' | 'transfer'

interface CategoryDef {
  id: CategoryId | 'all'
  label: string
  color: string
}

const CATEGORIES: CategoryDef[] = [
  { id: 'all', label: 'All', color: '#9ca3af' },
  { id: 'session', label: 'Session', color: '#00BCD4' },
  { id: 'data', label: 'Data', color: '#7C4DFF' },
  { id: 'stored', label: 'Stored DTC', color: '#FFB300' },
  { id: 'io', label: 'IO Control', color: '#FF5252' },
  { id: 'routine', label: 'Routine', color: '#00E676' },
  { id: 'transfer', label: 'Transfer', color: '#F06292' },
]

const SERVICES: Service[] = [
  // Diagnostic and communication management
  { sid: '0x10', name: 'DiagnosticSessionControl', category: 'session', useCase: 'Switch between default, programming, extended sessions', subFunc: true },
  { sid: '0x11', name: 'ECUReset', category: 'session', useCase: 'Hard reset, key-off-on, soft reset', subFunc: true },
  { sid: '0x27', name: 'SecurityAccess', category: 'session', useCase: 'Seed/key unlock for protected operations', subFunc: true },
  { sid: '0x28', name: 'CommunicationControl', category: 'session', useCase: 'Enable/disable normal communication on ECU', subFunc: true },
  { sid: '0x29', name: 'Authentication', category: 'session', useCase: 'Certificate-based authentication (UDS 2020)', subFunc: true },
  { sid: '0x3E', name: 'TesterPresent', category: 'session', useCase: 'Keep-alive to prevent session timeout', subFunc: true },
  { sid: '0x83', name: 'AccessTimingParameter', category: 'session', useCase: 'Read / write P2 and P2★ timing parameters' },
  { sid: '0x84', name: 'SecuredDataTransmission', category: 'session', useCase: 'Encrypted / signed diagnostic message exchange' },
  { sid: '0x85', name: 'ControlDTCSetting', category: 'session', useCase: 'Enable / disable DTC setting', subFunc: true },
  { sid: '0x86', name: 'ResponseOnEvent', category: 'session', useCase: 'Set up event-triggered responses from the ECU' },
  { sid: '0x87', name: 'LinkControl', category: 'session', useCase: 'Change bit-rate or switch to programming link' },
  // Data transmission
  { sid: '0x22', name: 'ReadDataByIdentifier', category: 'data', useCase: 'Read VIN, software version, calibration data' },
  { sid: '0x23', name: 'ReadMemoryByAddress', category: 'data', useCase: 'Read raw memory (address + size)' },
  { sid: '0x24', name: 'ReadScalingDataByIdentifier', category: 'data', useCase: 'Read scaling / units / formula for a DID' },
  { sid: '0x2A', name: 'ReadDataByPeriodicIdentifier', category: 'data', useCase: 'Periodic DID broadcast from ECU' },
  { sid: '0x2C', name: 'DynamicallyDefineDataIdentifier', category: 'data', useCase: 'Define a DID as a composite of others' },
  { sid: '0x2E', name: 'WriteDataByIdentifier', category: 'data', useCase: 'Write calibration values, configuration' },
  { sid: '0x3D', name: 'WriteMemoryByAddress', category: 'data', useCase: 'Write raw memory (bootloader use)' },
  // Stored data transmission
  { sid: '0x14', name: 'ClearDiagnosticInformation', category: 'stored', useCase: 'Clear stored DTCs' },
  { sid: '0x19', name: 'ReadDTCInformation', category: 'stored', useCase: 'Read stored / pending / permanent DTCs', subFunc: true },
  // IO control
  { sid: '0x2F', name: 'InputOutputControlByIdentifier', category: 'io', useCase: 'Force ECU outputs (actuator tests)' },
  // Routine control
  { sid: '0x31', name: 'RoutineControl', category: 'routine', useCase: 'Start / stop / request results of ECU-internal routines', subFunc: true },
  // Upload / download
  { sid: '0x34', name: 'RequestDownload', category: 'transfer', useCase: 'Begin a firmware flash transfer' },
  { sid: '0x35', name: 'RequestUpload', category: 'transfer', useCase: 'Begin a memory read-out transfer' },
  { sid: '0x36', name: 'TransferData', category: 'transfer', useCase: 'Send firmware / memory blocks' },
  { sid: '0x37', name: 'RequestTransferExit', category: 'transfer', useCase: 'Signal end of transfer' },
  { sid: '0x38', name: 'RequestFileTransfer', category: 'transfer', useCase: 'Transfer files (UDS 2013 +)' },
]

function catDef(id: CategoryId): CategoryDef {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[0]
}

export function UdsServiceTable() {
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<CategoryId | 'all'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SERVICES.filter(s => {
      if (activeCat !== 'all' && s.category !== activeCat) return false
      if (!q) return true
      return (
        s.sid.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.useCase.toLowerCase().includes(q)
      )
    })
  }, [query, activeCat])

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: UDS service lookup — search by SID, name, or use case
      </p>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search SID, name, or use case…"
            className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-1.5 text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {CATEGORIES.map(cat => {
          const isActive = activeCat === cat.id
          const count =
            cat.id === 'all'
              ? SERVICES.length
              : SERVICES.filter(s => s.category === cat.id).length
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-150"
              style={{
                backgroundColor: isActive ? cat.color : `${cat.color}15`,
                color: isActive ? '#000' : cat.color,
                border: `1px solid ${isActive ? cat.color : `${cat.color}35`}`,
              }}
            >
              {cat.label}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded overflow-hidden border border-neutral-800">
        {/* Header */}
        <div className="grid grid-cols-[70px_1fr_110px] sm:grid-cols-[80px_200px_1fr_110px] bg-neutral-950 text-[10px] uppercase tracking-wider text-neutral-500 font-mono">
          <div className="px-3 py-2">SID</div>
          <div className="px-3 py-2 hidden sm:block">Service</div>
          <div className="px-3 py-2 sm:hidden">Service + use case</div>
          <div className="px-3 py-2 hidden sm:block">Use case</div>
          <div className="px-3 py-2 text-right">Category</div>
        </div>

        {/* Rows */}
        <div>
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-neutral-500 italic">
              No services match "{query}".
            </div>
          ) : (
            filtered.map((s, i) => {
              const cat = catDef(s.category)
              return (
                <div
                  key={s.sid}
                  className="grid grid-cols-[70px_1fr_110px] sm:grid-cols-[80px_200px_1fr_110px] border-t border-neutral-800 hover:bg-neutral-800/40 transition-colors"
                  style={{ backgroundColor: i % 2 === 0 ? '#0f1115' : 'transparent' }}
                >
                  <div className="px-3 py-2 font-mono text-xs font-bold" style={{ color: cat.color }}>
                    {s.sid}
                  </div>
                  <div className="px-3 py-2 font-mono text-[11px] text-neutral-200 hidden sm:block">
                    {s.name}
                    {s.subFunc && (
                      <span className="ml-1.5 text-[9px] text-neutral-500 align-top">+sub-fn</span>
                    )}
                  </div>
                  <div className="px-3 py-2 text-[11px] text-neutral-300 sm:hidden">
                    <div className="font-mono font-semibold">
                      {s.name}
                      {s.subFunc && (
                        <span className="ml-1.5 text-[9px] text-neutral-500">+sub-fn</span>
                      )}
                    </div>
                    <div className="text-neutral-400 mt-0.5">{s.useCase}</div>
                  </div>
                  <div className="px-3 py-2 text-[11px] text-neutral-400 hidden sm:block">
                    {s.useCase}
                  </div>
                  <div className="px-3 py-2 text-right">
                    <span
                      className="inline-block text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${cat.color}20`,
                        color: cat.color,
                      }}
                    >
                      {cat.label}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Footer count */}
      <div className="mt-2 text-[10px] text-neutral-500 font-mono text-right">
        {filtered.length} of {SERVICES.length} services
      </div>
    </div>
  )
}
