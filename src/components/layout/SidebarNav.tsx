import { Briefcase, MessageSquare, Plug, Coins, BookOpen, Code } from 'lucide-react';
import { useUiStore, type Tab } from '../../store/uiStore';
import { cn } from '../../utils/format';

const navGroups: { label: string; items: { id: Tab; label: string; icon: any; badge?: 'live' }[] }[] = [
  {
    label: 'Trading',
    items: [
      { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
      { id: 'chat', label: 'AI Chat', icon: MessageSquare, badge: 'live' },
    ],
  },
  {
    label: 'Earn',
    items: [
      { id: 'api', label: 'x402 API', icon: Plug },
      { id: 'earn', label: 'Auto-Yield', icon: Coins },
    ],
  },
  {
    label: 'Docs',
    items: [
      { id: 'guide', label: 'Guide', icon: BookOpen },
      { id: 'build', label: 'Build', icon: Code },
    ],
  },
];

export function SidebarNav() {
  const { activeTab, setActiveTab } = useUiStore();

  return (
    <nav className="flex flex-col gap-4 mt-6">
      {navGroups.map((group) => (
        <div key={group.label}>
          <div className="px-6 mb-1 text-micro text-[#444]">{group.label}</div>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive =
                activeTab === item.id || (item.id === 'portfolio' && activeTab === 'dashboard');
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'flex items-center justify-between px-6 py-2 h-9 transition-colors relative group',
                    isActive
                      ? 'text-[#F5F5F5] bg-[rgba(255,255,255,0.04)]'
                      : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)]',
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#BFFF00] rounded-r-full" />
                  )}
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {item.badge === 'live' && <div className="w-2 h-2 rounded-full bg-[#BFFF00] animate-pulse" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
