import { useState } from 'react';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { GenerationId } from '../types';
import { cn } from '../../../utils/cn';

interface MigrationChecklistProps {
  primary: GenerationId;
}

const CHECKLIST = [
  {
    id: 'classic-fd',
    title: 'Classic -> FD migration',
    items: [
      'Audit all Classic-only ECUs and gateway constraints.',
      'Validate BRS timing and transceiver behavior in mixed buses.',
      'Update tooling for FD DLC, CRC-17/21, and trace decoding.',
      'Run regression on arbitration timing and error counters.',
    ],
  },
  {
    id: 'fd-xl',
    title: 'FD -> XL migration',
    items: [
      'Map high-payload domains that justify XL adoption.',
      'Plan hardware refresh for XL-capable controllers/transceivers.',
      'Define segmentation strategy using VCID and acceptance rules.',
      'Execute phased rollout with coexistence and fallback tests.',
    ],
  },
];

export function MigrationChecklist({ primary }: MigrationChecklistProps) {
  const isMobile = useIsMobile();
  const [openMobileSheet, setOpenMobileSheet] = useState(false);

  const currentPathHint =
    primary === 'Classic'
      ? 'Current focus: prepare for Classic -> FD transition.'
      : primary === 'FD'
        ? 'Current focus: optimize FD and evaluate XL trigger points.'
        : 'Current focus: XL rollout governance and compatibility gates.';

  const content = (
    <div className="space-y-4">
      <p className="rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-gray-300">
        <span className="font-bold text-cyan-200">Migration guidance:</span> {currentPathHint}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CHECKLIST.map((section) => (
          <article key={section.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
              <ArrowRight size={14} className="text-cyan-300" />
              {section.title}
            </h3>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle2 size={14} className="mt-0.5 text-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
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
          <h2 className="text-base font-black uppercase tracking-widest text-white">Migration Guidance</h2>
          <button
            type="button"
            onClick={() => setOpenMobileSheet(true)}
            className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-300"
          >
            Open Sheet
          </button>
        </div>
        <p className="text-sm text-gray-400">{currentPathHint}</p>

        {openMobileSheet && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/70">
            <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-white/10 bg-dark-950 p-5">
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
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <h2 className="mb-4 text-lg font-black uppercase tracking-widest text-white">Migration Guidance</h2>
      <div className={cn('transition-all duration-200')}>{content}</div>
    </section>
  );
}

