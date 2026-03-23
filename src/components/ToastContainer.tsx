import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  
  const typeStyles = {
    success: 'border-cyber-green/40 bg-cyber-green/10 text-cyber-green',
    error: 'border-red-500/40 bg-red-500/10 text-red-400',
    warning: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
    info: 'border-cyber-blue/40 bg-cyber-blue/10 text-cyber-blue',
  };

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 40, y: -10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-lg text-sm ${typeStyles[toast.type ?? 'info']}`}
            role="alert"
          >
            <div className="flex-1 min-w-0">
                <p className="font-bold text-white">{toast.title}</p>
                {toast.description && (
                   <p className="mt-0.5 text-[11px] text-gray-200 leading-relaxed font-mono">{toast.description}</p>
                )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
            >
              <X size={14} className="text-white" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
