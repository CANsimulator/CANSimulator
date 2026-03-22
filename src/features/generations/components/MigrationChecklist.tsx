import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, X, RotateCcw } from 'lucide-react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { GenerationId } from '../types';
import { cn } from '../../../utils/cn';
import { useRef } from 'react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';

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
  const mobileSheetRef = useRef<HTMLDivElement>(null);

  useFocusTrap(mobileSheetRef, openMobileSheet, () => setOpenMobileSheet(false));

  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!confirmReset) return;
    const timer = setTimeout(() => setConfirmReset(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmReset]);

  const handleReset = () => {
    setCheckedItems(new Set());
    setConfirmReset(false);
  };

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

  const filteredChecklist = useMemo(() => {
    if (!showIncompleteOnly) return CHECKLIST;
    return CHECKLIST.map(section => ({
      ...section,
      items: section.items.map((text, idx) => ({ text, originalIdx: idx }))
        .filter(item => !checkedItems.has(`${section.id}:${item.originalIdx}`))
    }));
  }, [showIncompleteOnly, checkedItems]);

  const content = (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/30 p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
            Progress
          </span>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
            {checkedCount}/{totalItems} complete
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      <p className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/30 p-3 text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
        <span className="font-bold text-cyber-blue dark:text-cyan-200">Migration guidance:</span>{' '}
        {currentPathHint}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowIncompleteOnly(prev => !prev)}
            aria-pressed={showIncompleteOnly}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 border",
              showIncompleteOnly 
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-800 dark:text-cyan-300 shadow-sm"
                : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20 shadow-sm"
            )}
          >
            {showIncompleteOnly ? 'Show all' : 'Incomplete only'}
          </button>

          <AnimatePresence mode="wait">
            {confirmReset ? (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-1.5"
              >
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight">Confirm Reset?</span>
                <button
                  onClick={handleReset}
                  className="px-2 py-1 rounded bg-red-500/20 border border-red-500/50 text-red-600 dark:text-red-400 text-[11px] font-bold uppercase hover:bg-red-500/30 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-2 py-1 rounded bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 text-[11px] font-bold uppercase transition-colors"
                >
                  No
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="reset"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setConfirmReset(true)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-gray-500 hover:text-red-500 hover:border-red-500/30 transition-all duration-200"
                title="Reset all progress"
              >
                <RotateCcw size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredChecklist.map((section) => (
          <article
            key={section.id}
            className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 p-4 transition-colors duration-300"
          >
            <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-dark-950 dark:text-white">
              <ArrowRight size={14} className="text-cyan-600 dark:text-cyan-300" />
              {section.title}
            </h3>

            {/* Step connector & checkable items */}
            <ul className="space-y-0 min-h-[40px]">
              {section.items.map((itemObj, idx) => {
                const isObject = typeof itemObj !== 'string';
                const item = isObject ? (itemObj as any).text : (itemObj as string);
                const originalIdx = isObject ? (itemObj as any).originalIdx : idx;
                const key = `${section.id}:${originalIdx}`;
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
                            : 'border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-white/5 text-transparent hover:border-gray-300 dark:hover:border-white/30'
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
                        <div className="my-1 h-full w-px bg-gray-200 dark:bg-white/10" />
                      )}
                    </div>

                    {/* Item text */}
                    <span
                      className={cn(
                        'pb-3 pt-0.5 text-sm transition-all duration-200',
                        isChecked
                          ? 'text-gray-400 dark:text-gray-500 line-through font-normal'
                          : 'text-gray-700 dark:text-gray-300 font-medium'
                      )}
                    >
                      {item}
                    </span>
                  </li>
                );
              })}
               {section.items.length === 0 && (
                 <li className="py-2 text-[11px] text-gray-500 dark:text-gray-600 italic">
                   No incomplete items in this section.
                 </li>
              )}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <section className="rounded-3xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-black uppercase tracking-widest text-dark-950 dark:text-white">
            Migration Guidance
          </h2>
          <button
            type="button"
            onClick={() => setOpenMobileSheet(true)}
            className="rounded-lg border border-gray-200 dark:border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 transition-colors hover:text-dark-950 dark:hover:text-white"
          >
            Open Sheet
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{currentPathHint}</p>

        {/* Progress preview */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

      <AnimatePresence>
        {openMobileSheet && (
          <div key="mobile-sheet-container" className="fixed inset-0 z-50 flex items-end">
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpenMobileSheet(false)}
            />
            <motion.div
              ref={mobileSheetRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-checklist-title"
              initial={reduceMotion ? undefined : { y: '100%' }}
              animate={reduceMotion ? undefined : { y: 0 }}
              exit={reduceMotion ? undefined : { y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-gray-200 dark:border-white/10 bg-white dark:bg-dark-950 p-5 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 id="mobile-checklist-title" className="text-sm font-black uppercase tracking-widest text-dark-950 dark:text-white">
                  Migration Checklist
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenMobileSheet(false)}
                  className="rounded-lg border border-gray-200 dark:border-white/10 p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                  aria-label="Close checklist"
                >
                  <X size={16} />
                </button>
              </div>
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] p-6 md:p-8">
      <h2 className="mb-4 text-lg font-black uppercase tracking-widest text-dark-950 dark:text-white">
        Migration Guidance
      </h2>
      <div className={cn('transition-all duration-200')}>{content}</div>
    </section>
  );
}
