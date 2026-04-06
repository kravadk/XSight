import { useUiStore, type TabKey } from '../../store/uiStore';

const items: { key: TabKey; label: string; icon: string }[] = [
  { key: 'chat', label: 'Chat', icon: '💬' },
  { key: 'portfolio', label: 'Portfolio', icon: '📊' },
  { key: 'api', label: 'API', icon: '🔌' },
  { key: 'earn', label: 'Earn', icon: '💰' },
];

export const BottomTabBar = () => {
  const active = useUiStore((s) => s.activeTab);
  const setTab = useUiStore((s) => s.setTab);

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-[#F0F0F0] bg-white">
      {items.map((item) => {
        const a = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              a ? 'text-[#00C853]' : 'text-[#9CA3AF]'
            }`}
          >
            <span className="text-[18px]">{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
};
