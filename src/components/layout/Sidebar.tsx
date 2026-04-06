import { useUiStore, type TabKey } from '../../store/uiStore';
import { useWalletStore } from '../../store/walletStore';

interface NavItem {
  key: TabKey;
  label: string;
  icon: string;
}

const items: NavItem[] = [
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'portfolio', label: 'Portfolio', icon: '📊' },
  { key: 'api', label: 'API', icon: '🔌' },
  { key: 'earn', label: 'Earn', icon: '💰' },
];

export const Sidebar = () => {
  const active = useUiStore((s) => s.activeTab);
  const setTab = useUiStore((s) => s.setTab);
  const short = useWalletStore((s) => s.short);

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-[220px] flex-col bg-[#1A1A1A] text-white">
      <div className="px-6 pt-6 pb-8">
        <div className="flex items-center gap-2 text-[18px] font-bold tracking-tight">
          <span className="text-[#00C853]">⚡</span> XSight
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`relative flex h-11 items-center gap-3 rounded-[10px] px-4 text-[14px] font-medium transition-colors ${
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-[#9CA3AF] hover:bg-white/[0.05]'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#00C853]" />
              )}
              <span className="text-[16px]">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-5 pb-6">
        <div className="mb-3 border-t border-white/10 pt-4" />
        <div className="mb-3 flex items-center gap-2 text-[12px] text-[#9CA3AF]">
          <span className="pulse-dot" />
          X Layer
        </div>
        <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 font-mono text-[11px] text-[#9CA3AF]">
          {short}
        </div>
      </div>
    </aside>
  );
};
