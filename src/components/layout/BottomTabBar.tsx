import { Briefcase, MessageSquare, Plug, Coins, BookOpen, Code, MoreHorizontal, X } from 'lucide-react';
import { useUiStore, type Tab } from '../../store/uiStore';
import { cn } from '../../utils/format';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const mainItems: { id: Tab; label: string; icon: any }[] = [
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'api', label: 'API', icon: Plug },
  { id: 'earn', label: 'Earn', icon: Coins },
];

const moreItems: { id: Tab; label: string; icon: any }[] = [
  { id: 'guide', label: 'Guide', icon: BookOpen },
  { id: 'build', label: 'Build', icon: Code },
];

export function BottomTabBar() {
  const { activeTab, setActiveTab } = useUiStore();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreItems.some(i => i.id === activeTab);

  const handleSelect = (id: Tab) => {
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
              className="md:hidden fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="md:hidden fixed bottom-16 left-3 right-3 z-50 bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded-2xl p-3 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-[#A3A3A3]">More</span>
                <button onClick={() => setMoreOpen(false)} className="text-[#666] hover:text-[#F5F5F5]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {moreItems.map(it => {
                  const active = activeTab === it.id;
                  return (
                    <button
                      key={it.id}
                      onClick={() => handleSelect(it.id)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                        active
                          ? 'bg-[rgba(191,255,0,0.12)] text-[#BFFF00]'
                          : 'bg-[rgba(255,255,255,0.04)] text-[#A3A3A3] hover:text-[#F5F5F5]',
                      )}
                    >
                      <it.icon className="w-5 h-5" />
                      <span className="text-sm font-semibold">{it.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-[rgba(255,255,255,0.06)] flex justify-around h-16">
        {mainItems.map((it) => {
          const active = activeTab === it.id || (it.id === 'portfolio' && activeTab === 'dashboard');
          return (
            <button
              key={it.id}
              onClick={() => setActiveTab(it.id)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
                active ? 'text-[#BFFF00]' : 'text-[#A3A3A3]',
              )}
            >
              <it.icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{it.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMoreOpen(o => !o)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
            isMoreActive || moreOpen ? 'text-[#BFFF00]' : 'text-[#A3A3A3]',
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-semibold">More</span>
        </button>
      </nav>
    </>
  );
}
