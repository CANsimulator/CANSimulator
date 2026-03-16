import { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { GenerationId } from '../types';
import { cn } from '../../../utils/cn';

interface MigrationChecklistProps {
  primary: GenerationId;
}

interface ChecklistSection {
  id: string;
  title: string;
  items: string[];
}

const CHECKLIST: ChecklistSection[] = [
  {
    id: 'classic-fd',
    title: 'Classic → FD migration',
    items: [
      'Audit all Classic-only ECUs and gateway constraints.',
      'Validate BRS timing and transceiver behavior in mixed buses.',
      'Update tooling for FD DLC, CRC-17/21, and trace decoding.',
      'Run regression on arbitration timing and error counters.',
    ],
  },
  {
    id: 'fd-xl',
    title: 'FD → XL migration',
    items: [
      'Map high-payload domains that justify XL adoption.',
      'Plan hardware refresh for XL-capable controllers/transceivers.',
      'Define segmentation strategy using VCID and acceptance rules.',
      'Execute phased rollout with coexistence and fallback tests.',
    ],
  },
];

export function MigrationChecklist({ primary }: MigrationChecklistProps) {
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [openMobileSheet, setOpenMobileSheet] = useState(false);

  // Track checked items as "sectionId:itemIndex"
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const totalItems = CHECKLIST.reduce((sum, s) => sum + s.items.length, 0);
  const checkedCount = checkedItems.size;
  const progressPercent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  const toggleItem = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const currentPathHint = useMemo(() => {
    if (primary === 'Classic')
      return 'Current focus: prepare for Classic → FD transition.';
    if (primary === 'FD')
      return 'Current focus: optimize FD and evaluate XL trigger points.';
    return 'Current focus: XL rollout governance and compatibility gates.';
  }, [primary]);

  const content = (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="rounded-lg border border-white/10 bg-black/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
            Progress
          </span>
          <span className="text-xs font-bold text-gray-300">
            {checkedCount}/{totalItems} complete
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      <p className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-gray-300">
        <span className="font-bold text-cyan-200">Migration guidance:</span>{' '}
        {currentPathHint}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CHECKLIST.map((section) => (
          <article
            key={section.id}
            className="rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
              <ArrowRight size={14} className="text-cyan-300" />
              {section.title}
            </h3>

            {/* Step connector & checkable items */}
            <ul className="space-y-0">
              {section.items.map((item, idx) => {
                const key = `${section.id}:${idx}`;
                const isChecked = checkedItems.has(key);
                const isLast = idx === section.items.length - 1;

                return (
                  <li key={key} className="flex">
                    {/* Vertical connector line + checkbox */}
                    <div className="mr-3 flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => toggleItem(key)}
                        aria-label={
                          isChecked ? `Uncheck: ${item}` : `Check: ${item}`
                        }
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200',
                          isChecked
                            ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300'
                            : 'border-white/20 bg-white/5 text-transparent hover:border-white/30'
                        )}
                      >
                        {isChecked && (
                          <motion.div
                            initial={
                              reduceMotion ? undefined : { scale: 0 }
                            }
                            animate={
                              reduceMotion ? undefined : { scale: 1 }
                            }
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          >
                            <Check size={12} />
                          </motion.div>
                        )}
                      </button>
                      {!isLast && (
                        <div className="my-1 h-full w-px bg-white/10" />
                      )}
                    </div>

                    {/* Item text */}
                    <span
                      className={cn(
                        'pb-3 pt-0.5 text-sm transition-all duration-200',
                        isChecked
                          ? 'text-gray-500 line-through'
                          : 'text-gray-300'
                      )}
                    >
                      {item}
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-black uppercase tracking-widest text-white">
            Migration Guidance
          </h2>
          <button
            type="button"
            onClick={() => setOpenMobileSheet(true)}
            className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-300 transition-colors hover:text-white"
          >
            Open Sheet
          </button>
        </div>
        <p className="text-sm text-gray-400">{currentPathHint}</p>

        {/* Progress preview */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {openMobileSheet && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/70">
            <motion.div
              initial={reduceMotion ? undefined : { y: '100%' }}
              animate={reduceMotion ? undefined : { y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-white/10 bg-dark-950 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                  Migration Checklist
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenMobileSheet(false)}
                  className="rounded-lg border border-white/10 p-2 text-gray-300"
                >
                  <X size={16} />
                </button>
              </div>
              {content}
            </motion.div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <h2 className="mb-4 text-lg font-black uppercase tracking-widest text-white">
        Migration Guidance
      </h2>
      <div className={cn('transition-all duration-200')}>{content}</div>
    </section>
  );
}
