import { AnimatePresence, motion } from 'motion/react';
import { Wallet, X, Monitor, Smartphone, Fuel, ExternalLink } from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';
import { useUiStore } from '../../store/uiStore';
import { toast } from '../../store/toastStore';
import { X_LAYER } from '../../config/links';

/**
 * Wallet connect modal — replaces the bare "Connect" button with a short
 * explainer. The OKX Connect SDK auto-routes (extension on desktop, QR / deep
 * link on mobile and Telegram), so one action covers every path; the modal's
 * job is to set expectations and point a new user at gas before they connect.
 */
export function ConnectModal() {
  const open = useUiStore((s) => s.connectModalOpen);
  const setOpen = useUiStore((s) => s.setConnectModalOpen);
  const connecting = useWalletStore((s) => s.connecting);
  const connect = useWalletStore((s) => s.connect);

  const handleConnect = async () => {
    await connect();
    const s = useWalletStore.getState();
    if (s.connected) {
      if (!s.onXLayer) await s.ensureXLayer();
      toast.success('Wallet connected');
      setOpen(false);
    } else if (s.error) {
      toast.error(s.error);
    }
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
            className="fixed inset-0 z-[140] bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Connect your wallet"
            className="fixed left-1/2 top-1/2 z-[150] w-[420px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-stadium-line bg-stadium-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stadium-line px-5 py-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-pitch" />
                <span className="text-sm font-bold text-stadium-text">Connect your wallet</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-7 w-7 place-items-center rounded-md text-stadium-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-stadium-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 px-5 py-5">
              <p className="text-xs leading-relaxed text-stadium-text-secondary">
                X Cup uses OKX Connect. One button covers every device — pick whichever
                matches you:
              </p>

              <div className="flex items-start gap-3 rounded-xl border border-stadium-line bg-stadium-base p-3">
                <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-pitch" />
                <div>
                  <div className="text-xs font-bold text-stadium-text">Desktop</div>
                  <div className="text-[11px] text-stadium-text-secondary">
                    The OKX Wallet browser extension opens for approval.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-stadium-line bg-stadium-base p-3">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-pitch" />
                <div>
                  <div className="text-xs font-bold text-stadium-text">Mobile &amp; Telegram</div>
                  <div className="text-[11px] text-stadium-text-secondary">
                    Scan the QR with OKX Wallet, or follow the deep link.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-gold-border bg-gold-bg p-3">
                <Fuel className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <div>
                  <div className="text-xs font-bold text-stadium-text">
                    X Cup runs on {X_LAYER.name} · chain {X_LAYER.chainId}
                  </div>
                  <div className="text-[11px] text-stadium-text-secondary">
                    Gas is paid in OKB. The wallet adds X Layer automatically — you only
                    need a little OKB to stake.
                  </div>
                  <a
                    href={X_LAYER.bridge}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-gold hover:underline"
                  >
                    Get OKB for gas <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <button
                onClick={() => void handleConnect()}
                disabled={connecting}
                className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-pitch text-sm font-bold text-stadium-base hover:bg-pitch-bright glow-pitch disabled:opacity-60"
              >
                <Wallet className="h-4 w-4" />
                {connecting ? 'Connecting…' : 'Connect wallet'}
              </button>
              <p className="text-center text-[10px] text-stadium-text-muted">
                You can explore every screen and make free picks without connecting.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
