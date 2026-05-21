import { Swords, Ticket, Network, Crown, Bot, BadgeCheck, Code2 } from 'lucide-react';
import { useUiStore, type Tab } from '../../store/uiStore';
import { cn } from '../../utils/format';
import { motion } from 'motion/react';

const navGroups: { label: string; items: { id: Tab; label: string; icon: typeof Swords; badge?: 'live' }[] }[] = [
  {
    label: 'Predict',
    items: [
      { id: 'markets', label: 'Markets', icon: Swords, badge: 'live' },
      { id: 'bets', label: 'My Bets', icon: Ticket },
    ],
  },
  {
    label: 'Compete',
    items: [
      { id: 'bracket', label: 'Bracket', icon: Network },
      { id: 'leaderboard', label: 'Leaderboard', icon: Crown },
    ],
  },
  {
    label: 'Intel',
    items: [
      { id: 'pundit', label: 'AI Pundit', icon: Bot, badge: 'live' },
      { id: 'fanpass', label: 'FanPass', icon: BadgeCheck },
      { id: 'developers', label: 'Developers', icon: Code2 },
    ],
  },
];

export function SidebarNav() {
  const { activeTab, setActiveTab } = useUiStore();

  return (
    <nav className="mt-6 flex flex-col gap-5">
      {navGroups.map((group) => (
        <div key={group.label}>
          <div className="px-6 mb-1.5 text-micro text-stadium-text-muted">{group.label}</div>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive =
                activeTab === item.id || (item.id === 'markets' && activeTab === 'market-detail');
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    'relative flex min-h-10 items-center justify-between px-6 py-2.5 transition-colors',
                    isActive
                      ? 'text-stadium-text bg-pitch-bg'
                      : 'text-stadium-text-secondary hover:text-stadium-text hover:bg-[rgba(255,255,255,0.04)]',
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full bg-pitch"
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <item.icon className={cn('h-4 w-4', isActive && 'text-pitch')} />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </div>
                  {item.badge === 'live' && (
                    <span
                      className="h-2 w-2 rounded-full bg-pitch"
                      style={{ animation: 'pulse-dot 2s ease-in-out infinite' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
