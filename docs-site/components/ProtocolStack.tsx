'use client'

import { useState, useCallback } from 'react'

type LayerId = 'application' | 'transport' | 'datalink' | 'physical' | null

interface LayerInfo {
  label: string
  protocols: string
  standard: string
  color: string
  description: string
  link: string
}

const LAYERS: LayerInfo[] = [
  {
    label: 'Application',
    protocols: 'UDS (ISO 14229) · J1939 · CANopen · OBD-II',
    standard: '',
    color: '#7c4dff',
    description:
      'Diagnostic services, vehicle data broadcast, industrial device profiles, and emissions monitoring. Each protocol defines its own message semantics and addressing.',
    link: '/docs/higher-layers',
  },
  {
    label: 'Transport',
    protocols: 'ISO-TP (ISO 15765-2) — segmentation & flow control',
    standard: '',
    color: '#00e676',
    description:
      'Segments messages longer than 8 bytes into multiple CAN frames and reassembles them at the receiver. Uses Single Frame, First Frame, Consecutive Frame, and Flow Control.',
    link: '/docs/higher-layers#iso-tp--transport-protocol-iso-15765-2',
  },
  {
    label: 'Data Link',
    protocols: 'CAN frame, arbitration, CRC, ACK',
    standard: 'ISO 11898-1',
    color: '#00b8d4',
    description:
      'Defines the frame format, non-destructive bitwise arbitration, CRC error detection, acknowledgment, and error handling with fault confinement.',
    link: '/docs/frame-format',
  },
  {
    label: 'Physical',
    protocols: 'CANH / CANL, transceiver, termination',
    standard: 'ISO 11898-2',
    color: '#ffab00',
    description:
      'Differential signaling on a twisted pair (CANH + CANL), 120 Ω termination, bus topology, transceiver electrical specs, and signal integrity.',
    link: '/docs/physical-layer',
  },
]

export function ProtocolStack() {
  const [active, setActive] = useState<LayerId>(null)

  const enter = useCallback((id: LayerId) => setActive(id), [])
  const leave = useCallback(() => setActive(null), [])

  const layerIds: LayerId[] = ['application', 'transport', 'datalink', 'physical']

  function op(id: LayerId) {
    if (active === null) return 1
    return active === id ? 1 : 0.3
  }

  return (
    <div className="my-6 rounded-md border border-neutral-700 bg-neutral-900 p-4">
      <p className="text-xs mb-3 opacity-60 font-mono">
        Interactive: CAN protocol stack — hover on any layer
      </p>

      {/* Stack layers */}
      <div className="flex flex-col gap-0.5">
        {LAYERS.map((layer, i) => {
          const id = layerIds[i]
          const isActive = active === id
          return (
            <a
              key={layer.label}
              href={layer.link}
              className="group flex items-stretch rounded-md overflow-hidden transition-all duration-150 no-underline"
              style={{
                opacity: op(id),
                transform: isActive ? 'scale(1.01)' : 'scale(1)',
              }}
              onMouseEnter={() => enter(id)}
              onMouseLeave={leave}
              onFocus={() => enter(id)}
              onBlur={leave}
            >
              {/* Layer name badge */}
              <div
                className="flex items-center justify-center px-4 py-3 min-w-[110px] sm:min-w-[130px] transition-colors"
                style={{
                  backgroundColor: isActive ? layer.color : `${layer.color}40`,
                }}
              >
                <span
                  className="text-xs sm:text-sm font-bold transition-colors"
                  style={{ color: isActive ? '#fff' : layer.color }}
                >
                  {layer.label}
                </span>
              </div>

              {/* Protocol details */}
              <div
                className="flex-1 flex items-center justify-between px-4 py-3 transition-colors"
                style={{
                  backgroundColor: isActive ? '#1a2332' : '#111823',
                  borderLeft: `2px solid ${isActive ? layer.color : 'transparent'}`,
                }}
              >
                <span className="text-xs sm:text-sm text-neutral-300 font-mono">
                  {layer.protocols}
                </span>
                {layer.standard && (
                  <span
                    className="text-[10px] sm:text-xs font-mono ml-2 whitespace-nowrap"
                    style={{ color: isActive ? layer.color : '#4a5568' }}
                  >
                    ← {layer.standard}
                  </span>
                )}
              </div>
            </a>
          )
        })}
      </div>

      {/* Info panel */}
      <div
        className="mt-3 rounded-md border border-neutral-700 bg-neutral-950 p-4 min-h-[56px] transition-opacity duration-150"
        style={{ opacity: active ? 1 : 0.5 }}
        aria-live="polite"
      >
        {active ? (
          <p className="text-sm text-neutral-300">
            {LAYERS[layerIds.indexOf(active)].description}
          </p>
        ) : (
          <p className="text-sm text-neutral-500 italic">
            Hover on any layer to see what it covers. Click to navigate to the relevant page.
          </p>
        )}
      </div>
    </div>
  )
}
