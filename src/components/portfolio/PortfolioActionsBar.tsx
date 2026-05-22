import { Download, Upload, Send, MoreHorizontal, Copy, ExternalLink, RotateCw, X } from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useWalletStore } from '../../store/walletStore';
import { useApiStore } from '../../store/apiStore';
import { useUiStore } from '../../store/uiStore';
import { useChat } from '../../hooks/useChat';
import { api, ApiError } from '../../api/client';
import { toast } from '../../store/toastStore';
import { QRCode } from '../common/QRCode';
import { CipherScramble } from '../common/CipherScramble';

type ModalKind = 'receive' | 'deposit' | null;

export function PortfolioActionsBar() {
  const address = useWalletStore((s) => s.address);
  const setPortfolio = useWalletStore((s) => s.setPortfolio);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const setEconomy = useApiStore((s) => s.setEconomy);
  const { send } = useChat();
  const [modal, setModal] = useState<ModalKind>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const displayAddr = address;
  const explorerUrl = address ? `https://www.oklink.com/xlayer/address/${address}` : '';

  const copyAddr = () => {
    void navigator.clipboard.writeText(displayAddr).then(
      () => toast.success('Address copied'),
      () => toast.error('Copy failed'),
    );
  };

  const handleSend = () => {
    setActiveTab('chat');
    void send('I want to send 50 USDT to another wallet');
  };

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      const [p, e] = await Promise.all([api.portfolio(), api.economy()]);
      setPortfolio({ address: p.address, network: p.network, tokens: p.tokens, totalUsd: p.totalUsd });
      setEconomy(e);
      toast.success('Portfolio refreshed');
    } catch (err) {
      const detail = err instanceof ApiError && err.detail ? err.detail : 'refresh failed';
      toast.error(detail);
    } finally {
      setRefreshing(false);
      setMoreOpen(false);
    }
  };

  const openExplorer = () => {
    window.open(explorerUrl, '_blank', 'noreferrer');
    setMoreOpen(false);
  };

  const actions = [
    { icon: Download, label: 'Receive', onClick: () => setModal('receive') },
    { icon: Upload, label: 'Deposit', onClick: () => setModal('deposit') },
    { icon: Send, label: 'Send', onClick: handleSend },
  ];

  return (
    <>
      <div className="flex items-center gap-2 relative">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="h-9 px-3 flex items-center gap-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[#F5F5F5] text-xs font-semibold transition-colors"
          >
            <a.icon className="w-3.5 h-3.5" /> {a.label}
          </button>
        ))}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className="h-9 px-3 flex items-center gap-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[#F5F5F5] text-xs font-semibold transition-colors"
        >
          <MoreHorizontal className="w-3.5 h-3.5" /> More
        </button>
        {moreOpen && (
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setMoreOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-xl p-1 z-[80] shadow-xl">
              <button
                onClick={refreshAll}
                disabled={refreshing}
                className="w-full px-3 py-2 flex items-center gap-2 rounded-lg text-xs text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh data
              </button>
              <button
                onClick={openExplorer}
                className="w-full px-3 py-2 flex items-center gap-2 rounded-lg text-xs text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)]"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View on explorer
              </button>
              <button
                onClick={() => {
                  copyAddr();
                  setMoreOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center gap-2 rounded-lg text-xs text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)]"
              >
                <Copy className="w-3.5 h-3.5" /> Copy address
              </button>
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModal(null)}
              className="fixed inset-0 bg-black/60 z-[80]"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 z-[90] w-[400px] max-w-[92vw]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#F5F5F5]">
                  {modal === 'receive' ? 'Receive funds' : 'Deposit to X Layer'}
                </h3>
                <button onClick={() => setModal(null)} className="text-[#666666] hover:text-[#F5F5F5]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-[#A3A3A3] mb-3">
                {modal === 'receive'
                  ? 'Share this X Layer address or QR to receive tokens.'
                  : 'Deposit native OKB or X Layer tokens to this wallet address.'}
              </div>

              <div className="flex flex-col items-center gap-3 mb-4">
                <div className="p-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-xl">
                  <QRCode value={displayAddr} size={184} />
                </div>
                <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-lg p-3 break-all font-mono text-[10px] text-[#F5F5F5] w-full text-center">
                  <CipherScramble text={displayAddr} mono duration={800} />
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  onClick={copyAddr}
                  className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg bg-[#BFFF00] hover:bg-[#D4FF33] text-[#0A0A0A] text-xs font-bold transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy address
                </button>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[#F5F5F5] text-xs font-bold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Explorer
                </a>
              </div>

              {modal === 'deposit' && (
                <a
                  href="https://www.okx.com/xlayer/bridge"
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full h-10 leading-10 text-center rounded-lg bg-[rgba(167,139,250,0.08)] hover:bg-[rgba(167,139,250,0.15)] text-[#A78BFA] text-xs font-bold transition-colors"
                >
                  Open X Layer Bridge ↗
                </a>
              )}

              <div className="text-[10px] text-[#666666] text-center mt-3">Network: X Layer Mainnet</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
