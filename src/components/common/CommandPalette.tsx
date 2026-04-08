import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Briefcase, MessageSquare, Plug, Coins, ArrowRight, Zap } from 'lucide-react';
import { useUiStore, type Tab } from '../../store/uiStore';
import { useWalletStore } from '../../store/walletStore';
import { useChat } from '../../hooks/useChat';
import { TokenIcon } from './TokenIcon';
import { QUICK_ACTIONS } from '../../config/uiCopy';
import { X402_ENDPOINTS } from '../../config/endpoints';

interface Item {
  id: string;
  title: string;
  hint?: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const tokens = useWalletStore((s) => s.tokens);
  const { send } = useChat();

  // Open with Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery('');
        setHighlighted(0);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const items = useMemo<Item[]>(() => {
    const tabIcon = (tab: Tab) => {
      const map: Record<string, React.ReactNode> = {
        portfolio: <Briefcase className="w-4 h-4" />,
        chat: <MessageSquare className="w-4 h-4" />,
        api: <Plug className="w-4 h-4" />,
        earn: <Coins className="w-4 h-4" />,
      };
      return map[tab] ?? <Zap className="w-4 h-4" />;
    };
    const navItems: Item[] = (
      [
        { tab: 'portfolio', title: 'Portfolio', hint: 'Holdings, allocation, swap' },
        { tab: 'chat', title: 'AI Chat', hint: 'Talk to the trading copilot' },
        { tab: 'api', title: 'x402 API', hint: 'Endpoints & revenue' },
        { tab: 'earn', title: 'Earn', hint: 'Auto-deploy yield loop' },
      ] as { tab: Tab; title: string; hint: string }[]
    ).map((n) => ({
      id: `nav-${n.tab}`,
      title: n.title,
      hint: n.hint,
      icon: tabIcon(n.tab),
      action: () => {
        setActiveTab(n.tab);
        setOpen(false);
      },
      group: 'Navigate',
    }));

    const tokenItems: Item[] = tokens.map((t) => ({
      id: `token-${t.symbol}`,
      title: `Analyze ${t.symbol}`,
      hint: `$${t.usdValue.toFixed(2)} · ${t.amount.toFixed(4)}`,
      icon: <TokenIcon symbol={t.symbol} size={18} />,
      action: () => {
        setActiveTab('chat');
        void send(`Tell me more about ${t.symbol}`);
        setOpen(false);
      },
      group: 'Your tokens',
    }));

    const promptItems: Item[] = QUICK_ACTIONS.map((qa) => ({
      id: `prompt-${qa.label}`,
      title: qa.label,
      hint: qa.message,
      icon: <ArrowRight className="w-4 h-4" />,
      action: () => {
        setActiveTab('chat');
        void send(qa.message);
        setOpen(false);
      },
      group: 'AI prompts',
    }));

    const endpointItems: Item[] = X402_ENDPOINTS.map((ep) => ({
      id: `ep-${ep.path}`,
      title: ep.path,
      hint: `${ep.method} · $${ep.price.toFixed(2)} · ${ep.description}`,
      icon: <Plug className="w-4 h-4" />,
      action: () => {
        setActiveTab('api');
        setOpen(false);
      },
      group: 'API endpoints',
    }));

    return [...navItems, ...tokenItems, ...promptItems, ...endpointItems];
  }, [tokens, setActiveTab, send]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) => it.title.toLowerCase().includes(q) || it.hint?.toLowerCase().includes(q),
    );
  }, [items, query]);

  // Group results
  const groups = useMemo(() => {
    const out: Record<string, Item[]> = {};
    for (const it of filtered) {
      (out[it.group] ??= []).push(it);
    }
    return out;
  }, [filtered]);

  // Reset highlight when query changes
  useEffect(() => setHighlighted(0), [query]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[highlighted]?.action();
    }
  };

  let runningIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[120]"
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-[15vh] -translate-x-1/2 w-[640px] max-w-[92vw] bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl z-[130] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-[rgba(255,255,255,0.06)]">
              <Search className="w-4 h-4 text-[#666]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search tokens, actions, endpoints..."
                className="flex-1 bg-transparent text-sm text-[#F5F5F5] placeholder-[#666] focus:outline-none"
              />
              <kbd className="text-[10px] font-mono text-[#666] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">
                ESC
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
              {filtered.length === 0 && (
                <div className="py-8 text-center text-xs text-[#666]">No matches</div>
              )}
              {Object.entries(groups).map(([group, list]) => (
                <div key={group} className="mb-2">
                  <div className="px-4 py-1 text-micro text-[#666]">{group}</div>
                  {list.map((it) => {
                    runningIndex += 1;
                    const isActive = runningIndex === highlighted;
                    return (
                      <button
                        key={it.id}
                        onMouseEnter={() => setHighlighted(runningIndex)}
                        onClick={it.action}
                        className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                          isActive ? 'bg-[rgba(191,255,0,0.06)]' : 'hover:bg-[rgba(255,255,255,0.04)]'
                        }`}
                      >
                        <div className={isActive ? 'text-[#BFFF00]' : 'text-[#A3A3A3]'}>{it.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-[#F5F5F5] truncate">
                            {it.title}
                          </div>
                          {it.hint && (
                            <div className="text-[11px] text-[#666] truncate">{it.hint}</div>
                          )}
                        </div>
                        {isActive && <ArrowRight className="w-3.5 h-3.5 text-[#BFFF00]" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between text-[10px] text-[#666]">
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="font-mono">↑↓</kbd> navigate
                </span>
                <span>
                  <kbd className="font-mono">↵</kbd> select
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="font-mono">⌘</kbd>
                <kbd className="font-mono">K</kbd>
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
