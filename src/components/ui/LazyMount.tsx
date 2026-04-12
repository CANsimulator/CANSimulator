import React, { useRef, useState, useEffect } from 'react';

interface LazyMountProps {
  children: React.ReactNode;
  minHeight?: number | string;
  rootMargin?: string;
}

/**
 * Delays mounting children until the wrapper scrolls into the viewport.
 * Once mounted, stays mounted. Shows a skeleton placeholder until then.
 */
export function LazyMount({ children, minHeight = 400, rootMargin = '200px' }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [mounted, rootMargin]);

  return (
    <div ref={ref} style={{ minHeight: !mounted ? minHeight : undefined }}>
      {mounted ? (
        children
      ) : (
        <div 
          className="w-full h-full rounded-xl bg-white/5 border border-white/10 animate-pulse flex items-center justify-center"
          style={{ minHeight }}
          aria-hidden="true"
        >
          <div className="text-white/20 text-xs font-mono uppercase tracking-widest">
            Loading Instrument...
          </div>
        </div>
      )}
    </div>
  );
}
