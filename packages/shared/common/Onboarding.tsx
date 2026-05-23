import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Coins, ShieldCheck, Gift, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { usePrefsStore } from '@shared/store/prefsStore';
import { useUiStore } from '@shared/store/uiStore';

const STEPS = [
  {
    icon: Coins,
    title: 'Pari-mutuel, not a bookmaker',
    body: 'Stake on a World Cup outcome and you join a shared pool. When the match settles, the winning side splits the whole pool pro-rata. No house, no fixed odds — the crowd sets the price.',
  },
  {
    icon: ShieldCheck,
    title: 'Results you can trust',
    body: 'Every result is settled by a bonded optimistic oracle. A proposer stakes a bond on the outcome; anyone can challenge a wrong call and take that bond. Lying costs money — honesty pays.',
  },
  {
    icon: Gift,
    title: 'Play free, or play for real',
    body: 'Not ready to stake? Make a free pick on any match and climb the leaderboard against Hermes, the autonomous AI pundit — zero risk, no wallet needed. Connect a wallet whenever you want to stake.',
  },
] as const;

/**
 * First-run welcome walkthrough — three slides that explain the pool, the oracle
 * and free-to-play before the user touches the interface. Shows once (tracked in
 * `prefsStore`), and is re-openable any time from the TopBar "?" button.
 */
export function Onboarding() {
  const seenOnboarding = usePrefsStore((s) => s.seenOnboarding);
  const setSeenOnboarding = usePrefsStore((s) => s.setSeenOnboarding);
  const helpOpen = useUiStore((s) => s.helpOpen);
  const setHelpOpen = useUiStore((s) => s.setHelpOpen);
  const [step, setStep] = useState(0);

  const open = !seenOnboarding || helpOpen;

  const close = () => {
    setSeenOnboarding(true);
    setHelpOpen(false);
    setStep(0);
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to X Cup"
            className="fixed left-1/2 top-1/2 z-[150] w-[440px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-stadium-line bg-stadium-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stadium-line px-5 py-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pitch">
                Welcome to X Cup
              </span>
              <button
                onClick={close}
                aria-label="Skip walkthrough"
                className="grid h-7 w-7 place-items-center rounded-md text-stadium-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-stadium-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 pt-7 pb-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-pitch-bg ring-1 ring-pitch-border">
                    <Icon className="h-7 w-7 text-pitch" />
                  </div>
                  <h2 className="font-display text-xl text-stadium-text">{current.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-stadium-text-secondary">
                    {current.body}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between border-t border-stadium-line px-5 py-3.5">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? 'w-5 bg-pitch' : 'w-1.5 bg-stadium-line-strong'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-stadium-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-stadium-text"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                )}
                <button
                  onClick={() => (isLast ? close() : setStep((s) => s + 1))}
                  className="flex items-center gap-1.5 rounded-lg bg-pitch px-4 py-1.5 text-xs font-bold text-stadium-base hover:bg-pitch-bright glow-pitch"
                >
                  {isLast ? 'Start exploring' : 'Next'}
                  {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
