'use client'

import { useState, useMemo } from 'react'

type CategoryId = 'general' | 'flow' | 'data' | 'security' | 'transfer' | 'timing' | 'session' | 'vehicle'

interface Nrc {
  code: string
  name: string
  category: CategoryId
  meaning: string
}

interface CategoryDef {
  id: CategoryId | 'all'
  label: string
  color: string
}

const CATEGORIES: CategoryDef[] = [
  { id: 'all', label: 'All', color: '#9ca3af' },
  { id: 'general', label: 'General', color: '#6b7280' },
  { id: 'flow', label: 'Service flow', color: '#00BCD4' },
  { id: 'data', label: 'Data', color: '#7C4DFF' },
  { id: 'security', label: 'Security', color: '#FF5252' },
  { id: 'transfer', label: 'Transfer', color: '#F06292' },
  { id: 'timing', label: 'Timing', color: '#FFB300' },
  { id: 'session', label: 'Session', color: '#00E676' },
  { id: 'vehicle', label: 'Vehicle cond.', color: '#29B6F6' },
]

const NRCS: Nrc[] = [
  // General
  { code: '0x10', name: 'GeneralReject', category: 'general', meaning: 'Request rejected and none of the other NRCs apply.' },
  { code: '0x11', name: 'ServiceNotSupported', category: 'general', meaning: 'The requested SID is not implemented on this ECU.' },
  { code: '0x12', name: 'SubFunctionNotSupported', category: 'general', meaning: 'SID valid but sub-function byte is not supported.' },
  { code: '0x13', name: 'IncorrectMessageLengthOrInvalidFormat', category: 'general', meaning: 'Wrong request length or malformed parameters.' },
  { code: '0x14', name: 'ResponseTooLong', category: 'general', meaning: 'The positive response would exceed the transport capability.' },
  // Service flow
  { code: '0x21', name: 'BusyRepeatRequest', category: 'flow', meaning: 'ECU is currently busy — repeat the request.' },
  { code: '0x22', name: 'ConditionsNotCorrect', category: 'flow', meaning: 'Preconditions are not met (e.g., engine running, wrong gear).' },
  { code: '0x24', name: 'RequestSequenceError', category: 'flow', meaning: 'Expected a different SID first (e.g., TransferData before RequestDownload).' },
  { code: '0x25', name: 'NoResponseFromSubnetComponent', category: 'flow', meaning: 'Gateway could not reach the target sub-net.' },
  { code: '0x26', name: 'FailurePreventsExecutionOfRequestedAction', category: 'flow', meaning: 'A previously detected failure blocks this operation.' },
  // Data
  { code: '0x31', name: 'RequestOutOfRange', category: 'data', meaning: 'Parameter value, DID, or address is not supported / out of range.' },
  // Security
  { code: '0x33', name: 'SecurityAccessDenied', category: 'security', meaning: 'ECU is locked — SecurityAccess required first.' },
  { code: '0x34', name: 'AuthenticationRequired', category: 'security', meaning: 'Service requires UDS 2020 Authentication (0x29).' },
  { code: '0x35', name: 'InvalidKey', category: 'security', meaning: 'Provided key does not match the expected seed response.' },
  { code: '0x36', name: 'ExceededNumberOfAttempts', category: 'security', meaning: 'Too many wrong keys — ECU locks out further attempts.' },
  { code: '0x37', name: 'RequiredTimeDelayNotExpired', category: 'security', meaning: 'Must wait after a failed attempt before retrying.' },
  { code: '0x38', name: 'SecureDataTransmissionRequired', category: 'security', meaning: 'Request must be sent via SecuredDataTransmission (0x84).' },
  { code: '0x39', name: 'SecureDataTransmissionNotAllowed', category: 'security', meaning: 'This request cannot be sent through secured channel.' },
  // Transfer
  { code: '0x70', name: 'UploadDownloadNotAccepted', category: 'transfer', meaning: 'ECU cannot start the transfer (wrong session, busy, etc.).' },
  { code: '0x71', name: 'TransferDataSuspended', category: 'transfer', meaning: 'Transfer suspended — resume may be possible.' },
  { code: '0x72', name: 'GeneralProgrammingFailure', category: 'transfer', meaning: 'Flash programming / erase / checksum failed.' },
  { code: '0x73', name: 'WrongBlockSequenceCounter', category: 'transfer', meaning: 'TransferData block sequence number does not match.' },
  // Timing
  { code: '0x78', name: 'RequestCorrectlyReceived-ResponsePending', category: 'timing', meaning: 'ECU is still processing — the real response will arrive later. Do not time out.' },
  // Session / vehicle
  { code: '0x7E', name: 'SubFunctionNotSupportedInActiveSession', category: 'session', meaning: 'Sub-function is valid but not in the current session.' },
  { code: '0x7F', name: 'ServiceNotSupportedInActiveSession', category: 'session', meaning: 'SID is valid but not in the current session.' },
  // Vehicle-condition
  { code: '0x81', name: 'RpmTooHigh', category: 'vehicle', meaning: 'Engine RPM exceeds allowed range for this request.' },
  { code: '0x82', name: 'RpmTooLow', category: 'vehicle', meaning: 'Engine RPM below allowed range for this request.' },
  { code: '0x83', name: 'EngineIsRunning', category: 'vehicle', meaning: 'Request requires engine off.' },
  { code: '0x84', name: 'EngineIsNotRunning', category: 'vehicle', meaning: 'Request requires engine running.' },
  { code: '0x87', name: 'VehicleSpeedTooHigh', category: 'vehicle', meaning: 'Vehicle speed exceeds allowed range.' },
  { code: '0x89', name: 'TemperatureTooHigh', category: 'vehicle', meaning: 'Coolant / ambient temperature over limit.' },
  { code: '0x92', name: 'VoltageTooHigh', category: 'vehicle', meaning: 'Battery / supply voltage over threshold.' },
  { code: '0x93', name: 'VoltageTooLow', category: 'vehicle', meaning: 'Battery / supply voltage under threshold.' },
]

function catDef(id: CategoryId): CategoryDef {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[0]
}

export function NrcTable() {
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<CategoryId | 'all'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return NRCS.filter(n => {
      if (activeCat !== 'all' && n.category !== activeCat) return false
      if (!q) return true
      return (
        n.code.toLowerCase().includes(q) ||
        n.name.toLowerCase().includes(q) ||
        n.meaning.toLowerCase().includes(q)
      )
    })
  }, [query, activeCat])

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: UDS Negative Response Codes — search by code, name, or meaning
      </p>

      {/* Search */}
      <div className="relative mb-3">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search NRC code or name…"
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

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {CATEGORIES.map(cat => {
          const isActive = activeCat === cat.id
          const count =
            cat.id === 'all' ? NRCS.length : NRCS.filter(n => n.category === cat.id).length
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
        <div className="grid grid-cols-[70px_1fr_90px] sm:grid-cols-[80px_260px_1fr_100px] bg-neutral-950 text-[10px] uppercase tracking-wider text-neutral-500 font-mono">
          <div className="px-3 py-2">Code</div>
          <div className="px-3 py-2 hidden sm:block">Name</div>
          <div className="px-3 py-2 sm:hidden">Name + meaning</div>
          <div className="px-3 py-2 hidden sm:block">Meaning</div>
          <div className="px-3 py-2 text-right">Category</div>
        </div>

        <div>
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-neutral-500 italic">
              No NRC matches "{query}".
            </div>
          ) : (
            filtered.map((n, i) => {
              const cat = catDef(n.category)
              return (
                <div
                  key={n.code}
                  className="grid grid-cols-[70px_1fr_90px] sm:grid-cols-[80px_260px_1fr_100px] border-t border-neutral-800 hover:bg-neutral-800/40 transition-colors"
                  style={{ backgroundColor: i % 2 === 0 ? '#0f1115' : 'transparent' }}
                >
                  <div className="px-3 py-2 font-mono text-xs font-bold" style={{ color: cat.color }}>
                    {n.code}
                  </div>
                  <div className="px-3 py-2 font-mono text-[11px] text-neutral-200 hidden sm:block">
                    {n.name}
                  </div>
                  <div className="px-3 py-2 text-[11px] text-neutral-300 sm:hidden">
                    <div className="font-mono font-semibold">{n.name}</div>
                    <div className="text-neutral-400 mt-0.5">{n.meaning}</div>
                  </div>
                  <div className="px-3 py-2 text-[11px] text-neutral-400 hidden sm:block">
                    {n.meaning}
                  </div>
                  <div className="px-3 py-2 text-right">
                    <span
                      className="inline-block text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
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

      <div className="mt-2 text-[10px] text-neutral-500 font-mono text-right">
        {filtered.length} of {NRCS.length} NRCs · NRC 0x78 is special: "pending — wait for real response"
      </div>
    </div>
  )
}
