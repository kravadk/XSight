import {
  Swords, Ticket, Network, Crown, Bot, BadgeCheck, Code2,
  Briefcase, MessageSquare, Plug, Coins, BookOpen, MoreHorizontal, X,
  LayoutGrid, ArrowDownUp, Trophy, Activity, FileCode,
} from 'lucide-react';
import { useUiStore, type Tab, type Product } from '@shared/store/uiStore';
import { cn } from '@shared/utils/format';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ProductSwitch } from './ProductSwitch';

type Item = { id: Tab; label: string; icon: typeof Swords };

const NAV: Record<Product, { main: Item[]; more: Item[] }> = {
  xsight: {
    main: [
      { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
      { id: 'chat', label: 'Chat', icon: MessageSquare },
      { id: 'api', label: 'API', icon: Plug },
      { id: 'earn', label: 'Earn', icon: Coins },
    ],
    more: [
      { id: 'guide', label: 'Guide', icon: BookOpen },
      { id: 'build', label: 'Build', icon: Code2 },
    ],
  },
  xcup: {
    main: [
      { id: 'markets', label: 'Markets', icon: Swords },
      { id: 'bets', label: 'My Bets', icon: Ticket },
      { id: 'bracket', label: 'Bracket', icon: Network },
      { id: 'leaderboard', label: 'Ranks', icon: Crown },
    ],
    more: [
      { id: 'pundit', label: 'AI Pundit', icon: Bot },
      { id: 'fanpass', label: 'FanPass', icon: BadgeCheck },
      { id: 'developers', label: 'Developers', icon: Code2 },
      { id: 'docs', label: 'Docs', icon: BookOpen },
    ],
  },
  hook: {
    main: [
      { id: 'hook', label: 'Overview', icon: LayoutGrid },
      { id: 'hook-swap', label: 'Swap', icon: ArrowDownUp },
      { id: 'hook-pot', label: 'Pot', icon: Trophy },
      { id: 'hook-activity', label: 'Activity', icon: Activity },
    ],
    more: [
      { id: 'hook-contracts', label: 'Contracts', icon: FileCode },
    ],
  },
};

export function BottomTabBar() {
  const { product, activeTab, setActiveTab } = useUiStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const { main, more } = NAV[product];
  const isMoreActive = more.some((i) => i.id === activeTab);

  const select = (id: Tab) => {
    setActiveTab(id);
    setMoreOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="md:hidden fixed bottom-16 left-3 right-3 z-50 rounded-2xl border border-stadium-line bg-stadium-card p-3 shadow-2xl"
            >
              <div className="mb-2 px-1">
                <ProductSwitch />
              </div>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-micro text-stadium-text-secondary">More</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close more menu"
                  className="grid h-8 w-8 place-items-center rounded-lg text-stadium-text-secondary hover:bg-[rgba(255,255,255,0.06)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {more.map((it) => {
                  const active = activeTab === it.id;
                  return (
                    <button
                      key={it.id}
                      onClick={() => select(it.id)}
                      className={cn(
                        'flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 transition-colors',
                        active ? 'bg-pitch-bg text-pitch' : 'bg-[rgba(255,255,255,0.04)] text-stadium-text-secondary',
                      )}
                    >
                      <it.icon className="h-5 w-5" />
                      <span className="text-sm font-semibold">{it.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-[70px] justify-around border-t border-stadium-line bg-stadium-base/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {main.map((it) => {
          const active =
            activeTab === it.id ||
            (it.id === 'markets' && activeTab === 'market-detail') ||
            (it.id === 'portfolio' && activeTab === 'dashboard');
          return (
            <button
              key={it.id}
              onClick={() => setActiveTab(it.id)}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors',
                active ? 'text-pitch' : 'text-stadium-text-secondary',
              )}
            >
              {active && <motion.span layoutId="bottom-active" className="absolute top-1 h-1 w-8 rounded-full bg-pitch" />}
              <it.icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{it.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className={cn(
            'relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors',
            isMoreActive || moreOpen ? 'text-pitch' : 'text-stadium-text-secondary',
          )}
        >
          {(isMoreActive || moreOpen) && (
            <motion.span layoutId="bottom-active" className="absolute top-1 h-1 w-8 rounded-full bg-pitch" />
          )}
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-semibold">More</span>
        </button>
      </nav>
    </>
  );
}
