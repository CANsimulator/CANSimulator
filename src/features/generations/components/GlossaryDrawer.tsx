import { useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BookOpenText, Search, X } from 'lucide-react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { cn } from '../../../utils/cn';

interface GlossaryTerm {
  term: string;
  meaning: string;
}

const TERMS: GlossaryTerm[] = [
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

function TermList({
  terms,
  reduceMotion,
}: {
  terms: GlossaryTerm[];
  reduceMotion: boolean | null;
}) {
  // Group alphabetically
  const grouped = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    for (const t of terms) {
      const letter = t.term[0].toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(t);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [terms]);

  if (terms.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No terms matching your search.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map(([letter, items]) => (
        <div key={letter}>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
            {letter}
          </p>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <motion.article
                key={item.term}
                initial={reduceMotion ? undefined : { opacity: 0, x: 12 }}
                animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 0.2, delay: idx * 0.04 }
                }
                className="rounded-xl border border-white/10 bg-black/30 p-4 transition-colors duration-150 hover:bg-black/40"
              >
                <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-cyan-200">
                  {item.term}
                </h4>
                <p className="text-sm text-gray-300">{item.meaning}</p>
              </motion.article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function GlossaryDrawer() {
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTerms = useMemo(() => {
    if (!search.trim()) return TERMS;
    const q = search.toLowerCase();
    return TERMS.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.meaning.toLowerCase().includes(q)
    );
  }, [search]);

  const drawerContent = (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-white">
          Glossary
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-white/10 p-2 text-gray-300 transition-colors hover:text-white"
          aria-label="Close glossary"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search field */}
      <div className="relative mb-4">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search terms..."
          className="w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm text-gray-200 placeholder:text-gray-600 outline-none transition-colors focus:border-cyan-400/40 focus:shadow-[0_0_8px_rgba(0,243,255,0.1)]"
        />
      </div>

      <TermList terms={filteredTerms} reduceMotion={reduceMotion} />
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-300 transition-all duration-200 hover:text-white hover:border-white/20 hover:shadow-[0_0_8px_rgba(0,243,255,0.1)]"
      >
        <BookOpenText size={14} />
        Glossary
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={
                reduceMotion
                  ? undefined
                  : isMobile
                    ? { y: '100%' }
                    : { x: '100%' }
              }
              animate={
                reduceMotion
                  ? undefined
                  : isMobile
                    ? { y: 0 }
                    : { x: 0 }
              }
              exit={
                reduceMotion
                  ? undefined
                  : isMobile
                    ? { y: '100%' }
                    : { x: '100%' }
              }
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={cn(
                'fixed z-50 overflow-y-auto border-white/10 bg-dark-950 p-5',
                isMobile
                  ? 'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl border-t'
                  : 'right-0 top-0 h-full w-full max-w-md border-l'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {drawerContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
