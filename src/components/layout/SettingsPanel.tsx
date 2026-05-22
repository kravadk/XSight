import { AnimatePresence, motion } from 'motion/react';
import { X, Github, ExternalLink, Boxes, Trash2, HelpCircle } from 'lucide-react';
import { usePrefsStore } from '../../store/prefsStore';
import { useUiStore } from '../../store/uiStore';
import { useWalletStore } from '../../store/walletStore';
import { Toggle } from '../common/Toggle';
import { PROJECT_LINKS, X_LAYER } from '../../config/links';

/** Mirrors package.json — shown in the About section. */
const APP_VERSION = 'v0.1.0';

/**
 * Settings panel — slides in from the TopBar gear. Every control here does
 * something real: motion damping feeds MotionConfig, the notification toggle
 * gates event notifications, "clear local data" wipes localStorage. No
 * decorative switches.
 */
export function SettingsPanel() {
  const open = useUiStore((s) => s.settingsOpen);
  const setOpen = useUiStore((s) => s.setSettingsOpen);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setHelpOpen = useUiStore((s) => s.setHelpOpen);

  const reducedMotion = usePrefsStore((s) => s.reducedMotion);
  const setReducedMotion = usePrefsStore((s) => s.setReducedMotion);
  const notifyEvents = usePrefsStore((s) => s.notifyEvents);
  const setNotifyEvents = usePrefsStore((s) => s.setNotifyEvents);
  const clearLocalData = usePrefsStore((s) => s.clearLocalData);

  const network = useWalletStore((s) => s.network);

  const replayWalkthrough = () => {
    setOpen(false);
    setHelpOpen(true);
  };

  const openContracts = () => {
    setOpen(false);
    setActiveTab('developers');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[80] bg-black/60"
          />
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            className="fixed left-3 right-3 top-[68px] z-[90] max-h-[80vh] overflow-y-auto rounded-2xl border border-stadium-line bg-stadium-card p-4 shadow-2xl md:left-auto md:right-4 md:w-[380px]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stadium-text">Settings</h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close settings"
                className="grid h-7 w-7 place-items-center rounded text-stadium-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-stadium-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Preferences */}
            <div className="mb-2 text-micro text-pitch">Preferences</div>
            <div className="mb-4 flex flex-col gap-1 rounded-xl border border-stadium-line bg-stadium-base p-1">
              <Row
                title="Reduce motion"
                hint="Damp animations and transitions across the app."
              >
                <Toggle
                  checked={reducedMotion}
                  onChange={setReducedMotion}
                  ariaLabel="Reduce motion"
                />
              </Row>
              <Row
                title="Event notifications"
                hint="Market resolved, oracle activity and similar events in the bell."
              >
                <Toggle
                  checked={notifyEvents}
                  onChange={setNotifyEvents}
                  ariaLabel="Event notifications"
                />
              </Row>
            </div>

            {/* Help */}
            <div className="mb-2 text-micro text-pitch">Help</div>
            <button
              onClick={replayWalkthrough}
              className="mb-4 flex w-full items-center gap-2.5 rounded-xl border border-stadium-line bg-stadium-base p-3 text-left hover:bg-[rgba(255,255,255,0.04)]"
            >
              <HelpCircle className="h-4 w-4 text-pitch" />
              <span className="text-xs font-semibold text-stadium-text">
                Replay the walkthrough
              </span>
            </button>

            {/* About & links */}
            <div className="mb-2 text-micro text-pitch">About &amp; links</div>
            <div className="mb-4 flex flex-col gap-1 rounded-xl border border-stadium-line bg-stadium-base p-1">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-stadium-text-secondary">Version</span>
                <span className="font-mono text-xs text-stadium-text">{APP_VERSION}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-stadium-text-secondary">Network</span>
                <span className="font-mono text-xs text-stadium-text">
                  {network || X_LAYER.name} · {X_LAYER.chainId}
                </span>
              </div>
              <LinkRow icon={<Boxes className="h-4 w-4" />} label="On-chain contracts" onClick={openContracts} />
              <ExternalRow icon={<Github className="h-4 w-4" />} label="GitHub" href={PROJECT_LINKS.github} />
              <ExternalRow
                icon={<ExternalLink className="h-4 w-4" />}
                label="X Layer explorer"
                href={PROJECT_LINKS.explorer}
              />
            </div>

            {/* Data */}
            <div className="mb-2 text-micro text-pitch">Data</div>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Clear all local X Cup data (preferences, onboarding state) and reload?',
                  )
                ) {
                  clearLocalData();
                }
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-[rgba(224,88,74,0.3)] bg-[rgba(224,88,74,0.08)] p-3 text-left hover:bg-[rgba(224,88,74,0.14)]"
            >
              <Trash2 className="h-4 w-4 text-outcome-loss" />
              <div>
                <div className="text-xs font-semibold text-stadium-text">Clear local data</div>
                <div className="text-[10px] text-stadium-text-secondary">
                  Preferences live only in this browser. On-chain stakes are unaffected.
                </div>
              </div>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-stadium-text">{title}</div>
        <div className="text-[10px] leading-snug text-stadium-text-secondary">{hint}</div>
      </div>
      {children}
    </div>
  );
}

function LinkRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[rgba(255,255,255,0.04)]"
    >
      <span className="text-stadium-text-secondary">{icon}</span>
      <span className="flex-1 text-xs font-semibold text-stadium-text">{label}</span>
      <span className="text-stadium-text-muted">→</span>
    </button>
  );
}

function ExternalRow({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-[rgba(255,255,255,0.04)]"
    >
      <span className="text-stadium-text-secondary">{icon}</span>
      <span className="flex-1 text-xs font-semibold text-stadium-text">{label}</span>
      <ExternalLink className="h-3 w-3 text-stadium-text-muted" />
    </a>
  );
}
