import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { api, type CatalogTokenDto } from '@shared/api/client';
import { TokenIcon } from './TokenIcon';
import { cn } from '@shared/utils/format';

interface Props {
  value: CatalogTokenDto | null;
  onChange: (token: CatalogTokenDto) => void;
  exclude?: string; // address to hide (so user can't pick same from/to)
  className?: string;
}

/**
 * Searchable token picker covering the full X Layer catalog (~all tokens
 * known to OKX DEX aggregator). User can type a symbol, paste a 0x contract
 * address, or scroll the list. Inspired by Uniswap's token select modal.
 */
export function TokenPicker({ value, onChange, exclude, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogTokenDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial load when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void api
      .catalog(query || undefined, 60)
      .then((r) => {
        if (cancelled) return;
        setResults(r.tokens);
        setTotal(r.total);
      })
      .catch(() => setResults([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, query]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = useMemo(
    () => results.filter((t) => !exclude || t.address.toLowerCase() !== exclude.toLowerCase()),
    [results, exclude],
  );

  const pick = (t: CatalogTokenDto) => {
    onChange(t);
    setOpen(false);
    setQuery('');
  };

  const handlePaste = async () => {
    const trimmed = query.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      try {
        const t = await api.resolveToken(trimmed);
        pick(t);
      } catch {
        // resolveToken returns 404 for tokens not in catalog — fall back to a stub
        pick({
          address: trimmed.toLowerCase(),
          symbol: trimmed.slice(0, 6).toUpperCase(),
          name: 'Custom token',
          decimals: 18,
        });
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-2 bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] px-3 py-1.5 rounded-full transition-colors',
          className,
        )}
      >
        {value ? (
          <>
            <TokenIcon symbol={value.symbol} size={20} />
            <span className="text-sm font-bold text-[#F5F5F5]">{value.symbol}</span>
          </>
        ) : (
          <span className="text-sm font-bold text-[#A3A3A3]">Select token</span>
        )}
        <ChevronDown className="w-4 h-4 text-[#A3A3A3]" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[120]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] max-w-[94vw] max-h-[80vh] bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl z-[130] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
                <div>
                  <h3 className="text-sm font-bold text-[#F5F5F5]">Select token</h3>
                  <p className="text-[10px] text-[#666]">
                    X Layer · {total} tokens via OKX DEX aggregator
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-[#666] hover:text-[#F5F5F5]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handlePaste();
                    }}
                    placeholder="Symbol (USDT, OKB, BULL...) or paste 0x..."
                    className="w-full h-10 pl-9 pr-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#F5F5F5] placeholder-[#666] focus:outline-none focus:border-[rgba(191,255,0,0.3)]"
                  />
                </div>
                {/^0x[0-9a-fA-F]{40}$/.test(query.trim()) && (
                  <button
                    onClick={handlePaste}
                    className="mt-2 w-full h-9 rounded-lg bg-[#BFFF00] hover:bg-[#D4FF33] text-[#0A0A0A] text-xs font-bold"
                  >
                    Use this address
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="py-8 text-center text-xs text-[#666]">Loading catalog...</div>
                )}
                {!loading && filtered.length === 0 && (
                  <div className="py-8 text-center text-xs text-[#666]">
                    No tokens match{query ? ` "${query}"` : ''}
                  </div>
                )}
                {filtered.map((t) => (
                  <button
                    key={t.address}
                    onClick={() => pick(t)}
                    className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-[rgba(255,255,255,0.04)] text-left transition-colors"
                  >
                    <TokenIcon symbol={t.symbol} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#F5F5F5] truncate">{t.symbol}</span>
                        {t.native && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[rgba(191,255,0,0.08)] text-[#BFFF00]">
                            native
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#A3A3A3] truncate">{t.name}</div>
                    </div>
                    <div className="text-[10px] font-mono text-[#666] tabular shrink-0">
                      {t.address.slice(0, 6)}...{t.address.slice(-4)}
                    </div>
                  </button>
                ))}
              </div>

              <div className="px-5 py-2 border-t border-[rgba(255,255,255,0.06)] text-[10px] text-[#666] text-center">
                Routes through Uniswap V3/V4 · QuickSwap · CurveNG · PotatoSwap and 500+ DEXes via OKX aggregator
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
