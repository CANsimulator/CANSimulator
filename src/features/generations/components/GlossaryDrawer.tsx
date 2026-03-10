import { useState } from 'react';
import { BookOpenText, X } from 'lucide-react';
import { useIsMobile } from '../../../hooks/useIsMobile';

const TERMS = [
  {
    term: 'BRS',
    meaning:
      'Bit Rate Switch in CAN FD. Arbitration stays at base rate while data phase can run faster.',
  },
  {
    term: 'ESI',
    meaning:
      'Error State Indicator in CAN FD showing whether transmitter is error-active or error-passive.',
  },
  {
    term: 'VCID',
    meaning:
      'Virtual CAN Network ID in CAN XL used to segment logical traffic domains on shared infrastructure.',
  },
  {
    term: 'SIC',
    meaning:
      'Signal Improvement Capability transceiver behavior for better integrity at higher bit rates.',
  },
  {
    term: 'MTU',
    meaning:
      'Maximum Transmission Unit, the max payload bytes carried by one protocol frame.',
  },
  {
    term: 'Arbitration rate',
    meaning:
      'Bit rate used while deciding bus access priority; often fixed even when data phase is faster.',
  },
];

export function GlossaryDrawer() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-300 transition-colors hover:text-white"
      >
        <BookOpenText size={14} />
        Terminology helper
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70" onClick={() => setOpen(false)}>
          <div
            onClick={(event) => event.stopPropagation()}
            className={
              isMobile
                ? 'fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-dark-950 p-5'
                : 'fixed right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-dark-950 p-5'
            }
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Glossary Drawer</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/10 p-2 text-gray-300"
                aria-label="Close glossary"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {TERMS.map((item) => (
                <article key={item.term} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-200">{item.term}</h4>
                  <p className="text-sm text-gray-300">{item.meaning}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

