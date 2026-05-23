import { useToastStore } from '@shared/store/toastStore';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-20 left-3 right-3 z-[100] flex flex-col gap-2 md:bottom-6 md:left-auto md:right-6">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertTriangle : Info;
          const color =
            t.kind === 'success' ? 'text-[#22C55E]' : t.kind === 'error' ? 'text-[#EF4444]' : 'text-[#BFFF00]';
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.18 }}
              role="status"
              className="pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#151515] px-4 py-3 shadow-2xl md:min-w-[280px] md:max-w-sm"
            >
              <Icon className={`w-4 h-4 ${color} shrink-0`} />
              <span className="text-sm text-[#F5F5F5] flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="grid h-7 w-7 place-items-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F5F5F5]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
