import { useEffect, useState } from 'react';
import { ArrowDownUp, Sliders } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useSwap } from '@shared/hooks/useSwap';
import { api, type CatalogTokenDto } from '@shared/api/client';
import { toast } from '@shared/store/toastStore';
import { useUiStore } from '@shared/store/uiStore';
import { useWalletStore } from '@shared/store/walletStore';
import { TokenPicker } from '@shared/common/TokenPicker';
import { SwapWizard } from './SwapWizard';

export function SwapWidget() {
  const setTab = useUiStore((s) => s.setActiveTab);
  const { execute } = useSwap();
  const tokens = useWalletStore((s) => s.tokens);

  const [from, setFrom] = useState<CatalogTokenDto | null>(null);
  const [to, setTo] = useState<CatalogTokenDto | null>(null);
  const [amount, setAmount] = useState('100');
  const [quote, setQuote] = useState<{ rate: string; toAmount: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Bootstrap defaults from the catalog (USDT → OKB)
  useEffect(() => {
    let cancelled = false;
    void Promise.all([api.resolveToken('USDT'), api.resolveToken('OKB')]).then(([u, o]) => {
      if (cancelled) return;
      setFrom((prev) => prev ?? u);
      setTo((prev) => prev ?? o);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live quoting
  useEffect(() => {
    if (!from || !to) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    const num = Number(amount);
    if (!num || num <= 0 || from.address.toLowerCase() === to.address.toLowerCase()) {
      setQuote(null);
      return;
    }
    const raw = BigInt(Math.round(num * 10 ** from.decimals)).toString();
    void (async () => {
      try {
        const q = await api.swapQuote(from.address, to.address, raw);
        if (cancelled) return;
        const toHuman = (Number(q.toAmount) / 10 ** to.decimals).toString();
        setQuote({ rate: q.rate, toAmount: toHuman });
      } catch {
        if (!cancelled) setQuote(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to, amount]);

  const handleSwap = async () => {
    if (!from || !to) {
      toast.error('Pick both tokens');
      return;
    }
    const num = Number(amount);
    if (!num || num <= 0) {
      toast.error('Enter an amount');
      return;
    }
    if (from.address.toLowerCase() === to.address.toLowerCase()) {
      toast.error('Pick different tokens');
      return;
    }
    setSubmitting(true);
    setTab('chat');
    // Pass addresses (not symbols) so any catalog token works
    await execute(from.address, to.address, num, quote ? Number(quote.toAmount) : 0);
    setSubmitting(false);
  };

  const flip = () => {
    if (!from || !to) return;
    setFrom(to);
    setTo(from);
  };

  const fromBalance = from
    ? tokens.find((t) => t.symbol.toUpperCase() === from.symbol.toUpperCase())?.amount ?? 0
    : 0;

  const setPercent = (pct: number) => {
    if (fromBalance <= 0) return;
    const v = (fromBalance * pct) / 100;
    setAmount(v.toFixed(6).replace(/\.?0+$/, ''));
  };

  return (
    <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-base font-bold text-[#F5F5F5]">Exchange</h2>
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[#A3A3A3] hover:text-[#F5F5F5] text-[10px] font-bold uppercase tracking-wider transition-colors"
        >
          <Sliders className="w-3 h-3" /> Advanced
        </button>
      </div>
      <AnimatePresence>{wizardOpen && <SwapWizard onClose={() => setWizardOpen(false)} />}</AnimatePresence>

      <div className="flex-1 flex flex-col gap-2 relative">
        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[rgba(255,255,255,0.04)]">
          <div className="flex justify-between items-center mb-2 gap-2">
            <TokenPicker value={from} onChange={setFrom} exclude={to?.address} />
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))}
              className="bg-transparent text-right text-xl font-mono text-[#F5F5F5] w-1/2 focus:outline-none tabular"
            />
          </div>
          <div className="flex justify-between items-center text-xs text-[#666]">
            <span className="truncate max-w-[60%]">{from?.name ?? '—'}</span>
            {fromBalance > 0 && (
              <div className="flex items-center gap-1">
                <span className="tabular text-[#666]">bal: {fromBalance.toFixed(4)}</span>
                {[25, 50, 100].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPercent(p)}
                    className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(191,255,0,0.1)] hover:text-[#BFFF00] text-[#A3A3A3]"
                  >
                    {p === 100 ? 'MAX' : `${p}%`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            onClick={flip}
            className="w-8 h-8 rounded-full bg-[#161616] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#A3A3A3] hover:text-[#BFFF00] hover:border-[#BFFF00] transition-colors"
          >
            <ArrowDownUp className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[rgba(255,255,255,0.04)]">
          <div className="flex justify-between items-center mb-2 gap-2">
            <TokenPicker value={to} onChange={setTo} exclude={from?.address} />
            <span className="text-right text-xl font-mono text-[#F5F5F5] w-1/2 truncate tabular">
              {quote?.toAmount ?? '—'}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-[#666]">
            <span className="truncate max-w-[60%]">{to?.name ?? '—'}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 mb-6 flex justify-center items-center gap-2 text-xs text-[#666]">
        <span>{quote ? `Rate: ${quote.rate}` : from && to ? 'Quoting...' : 'Pick tokens'}</span>
      </div>

      <button
        onClick={handleSwap}
        disabled={submitting || !from || !to || !quote}
        className="w-full h-11 bg-[#BFFF00] text-[#0A0A0A] font-bold rounded-xl hover:bg-[#D4FF33] glow-lime transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Swap'}
      </button>
    </div>
  );
}
