import { Bell, Wallet, LogOut, X, AlertTriangle, CheckCircle2, Info, Sparkles, Copy, ExternalLink } from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';
import { toast } from '../../store/toastStore';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CipherScramble } from '../common/CipherScramble';
import { useNotificationsStore, type Notification } from '../../store/notificationsStore';
import { MagneticButton } from '../common/MagneticButton';
import { useUiStore } from '../../store/uiStore';

export function TopBar() {
  const { connected, short, address, onXLayer, connecting, connect, disconnect, ensureXLayer } = useWalletStore();
  const product = useUiStore((s) => s.product);
  const notifications = useNotificationsStore((s) => s.items);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const markRead = useNotificationsStore((s) => s.markRead);
  const clearNotifs = useNotificationsStore((s) => s.clear);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const explorerAddressUrl = address ? `https://www.okx.com/web3/explorer/xlayer/address/${address}` : null;

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast.success('Wallet address copied');
  };

  const handleConnect = async () => {
    await connect();
    const s = useWalletStore.getState();
    if (s.connected) {
      if (!s.onXLayer) await s.ensureXLayer();
      toast.success('Wallet connected');
    } else if (s.error) {
      toast.error(s.error);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-[60px] min-w-0 items-center justify-between gap-2 overflow-hidden border-b border-stadium-line bg-stadium-base/95 px-3 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="hidden items-center gap-2 rounded-lg border border-pitch-border bg-pitch-bg px-2.5 py-1.5 text-[10px] font-bold text-pitch md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-pitch" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
          X Layer · 196
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-gold-border bg-gold-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
          <Sparkles className="h-3 w-3" /> {product === 'xcup' ? 'World Cup 2026' : 'AI Copilot'}
        </div>
        {connected && !onXLayer && (
          <button
            onClick={() => void ensureXLayer()}
            className="flex items-center gap-1.5 rounded-lg border border-[rgba(224,88,74,0.3)] bg-[rgba(224,88,74,0.1)] px-2.5 py-1.5 text-[10px] font-bold text-outcome-loss"
          >
            <AlertTriangle className="h-3 w-3" /> Switch to X Layer
          </button>
        )}
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-1.5 md:gap-2.5">
        <button
          onClick={() => setNotifOpen(true)}
          title="Notifications"
          aria-label="Open notifications"
          className="relative grid h-9 w-9 place-items-center rounded-full text-stadium-text-secondary transition-colors hover:bg-[rgba(255,255,255,0.06)]"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-pitch px-1 text-[9px] font-bold text-stadium-base">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {connected ? (
          <div className="flex items-center gap-1.5 rounded-xl border border-stadium-line bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5">
            <CipherScramble text={short} mono className="text-sm font-semibold text-stadium-text" />
            <button
              type="button"
              onClick={copyAddress}
              title="Copy address"
              aria-label="Copy wallet address"
              className="grid h-6 w-6 place-items-center rounded-md text-stadium-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-stadium-text"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {explorerAddressUrl && (
              <a
                href={explorerAddressUrl}
                target="_blank"
                rel="noreferrer"
                title="View on X Layer explorer"
                aria-label="View wallet on X Layer explorer"
                className="grid h-6 w-6 place-items-center rounded-md text-stadium-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-outcome-away"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              onClick={() => {
                disconnect();
                toast.info('Disconnected');
              }}
              title="Disconnect"
              aria-label="Disconnect wallet"
              className="grid h-6 w-6 place-items-center rounded-md text-stadium-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-outcome-loss"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <MagneticButton
            onClick={() => void handleConnect()}
            className="flex h-10 items-center gap-2 rounded-xl bg-pitch px-5 text-sm font-bold text-stadium-base transition-colors hover:bg-pitch-bright glow-pitch disabled:opacity-60"
          >
            <Wallet className="h-4 w-4" />
            {connecting ? 'Connecting…' : 'Connect'}
          </MagneticButton>
        )}
      </div>

      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotifOpen(false)}
              className="fixed inset-0 z-[80] bg-black/60"
            />
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="fixed left-3 right-3 top-[68px] z-[90] max-h-[70vh] overflow-y-auto rounded-2xl border border-stadium-line bg-stadium-card p-4 shadow-2xl md:left-auto md:right-4 md:w-[380px]"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-stadium-text">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="rounded bg-pitch-bg px-1.5 py-0.5 text-[10px] tabular text-pitch">{unreadCount} new</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {notifications.length > 0 && (
                    <button
                      onClick={() => markAllRead()}
                      className="rounded px-2 py-1 text-[10px] text-stadium-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-stadium-text"
                    >
                      Mark read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={() => clearNotifs()}
                      className="rounded px-2 py-1 text-[10px] text-stadium-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-outcome-loss"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    aria-label="Close notifications"
                    className="grid h-7 w-7 place-items-center rounded text-stadium-text-secondary hover:bg-[rgba(255,255,255,0.06)] hover:text-stadium-text"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-stadium-text-secondary">No notifications yet</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {notifications.slice(0, 30).map((n) => (
                    <NotificationRow key={n.id} n={n} onClick={() => markRead(n.id)} />
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

function NotificationRow({ n, onClick }: { n: Notification; onClick: () => void }) {
  const Icon = n.kind === 'success' ? CheckCircle2 : n.kind === 'error' ? AlertTriangle : n.kind === 'event' ? Sparkles : Info;
  const color =
    n.kind === 'success'
      ? 'text-pitch'
      : n.kind === 'error'
        ? 'text-outcome-loss'
        : n.kind === 'event'
          ? 'text-gold'
          : 'text-outcome-away';
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-2.5 rounded-lg border border-stadium-line p-2.5 text-left transition-colors ${
        n.read ? 'bg-transparent' : 'bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)]'
      }`}
    >
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <div className={`truncate text-xs font-semibold ${n.read ? 'text-stadium-text-secondary' : 'text-stadium-text'}`}>
          {n.title}
        </div>
        {n.body && <div className="truncate text-[10px] text-stadium-text-secondary">{n.body}</div>}
        <div className="mt-0.5 text-[10px] tabular text-stadium-text-muted">
          {new Date(n.timestamp).toLocaleTimeString()}
        </div>
      </div>
      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-pitch" />}
    </button>
  );
}
