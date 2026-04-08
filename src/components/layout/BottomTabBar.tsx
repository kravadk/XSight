import { Briefcase, MessageSquare, Plug, Coins } from 'lucide-react';
import { useUiStore, type Tab } from '../../store/uiStore';
import { cn } from '../../utils/format';

const items: { id: Tab; label: string; icon: any }[] = [
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'api', label: 'API', icon: Plug },
  { id: 'earn', label: 'Earn', icon: Coins },
];

export function BottomTabBar() {
  const { activeTab, setActiveTab } = useUiStore();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-[rgba(255,255,255,0.06)] flex justify-around h-16">
      {items.map((it) => {
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
    </nav>
  );
}
