import { Trophy } from 'lucide-react';
import { SidebarNav } from './SidebarNav';
import { SidebarStatus } from './SidebarStatus';
import { useUiStore } from '../../store/uiStore';

export function Sidebar() {
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 w-[240px] flex-col border-r border-stadium-line bg-stadium-sidebar">
      <button
        onClick={() => setActiveTab('markets')}
        className="flex items-center gap-2.5 px-6 py-6 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
      >
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-pitch-bg ring-1 ring-pitch-border">
          <Trophy className="h-[18px] w-[18px] text-gold" />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="font-display text-xl tracking-wide text-stadium-text">X CUP</span>
          <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-stadium-text-muted">
            Prediction Market
          </span>
        </div>
      </button>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <SidebarNav />
      </div>

      <SidebarStatus />
    </aside>
  );
}
