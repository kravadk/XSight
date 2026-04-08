import { Zap } from 'lucide-react';
import { SidebarNav } from './SidebarNav';
import { SidebarPositions } from './SidebarPositions';
import { SidebarStatus } from './SidebarStatus';
import { useUiStore } from '../../store/uiStore';

export function Sidebar() {
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[240px] bg-[#0A0A0A] border-r border-[rgba(255,255,255,0.06)] flex-col z-50">
      <button
        onClick={() => setActiveTab('portfolio')}
        className="px-6 py-6 flex items-center justify-between hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-[#BFFF00] fill-[#BFFF00]" />
          <span className="text-lg font-bold text-[#F5F5F5]">XSight</span>
        </div>
        <div className="text-micro px-2 py-0.5 bg-[rgba(191,255,0,0.08)] rounded text-[#BFFF00]">
          Beta
        </div>
      </button>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <SidebarNav />
        <SidebarPositions />
      </div>

      <SidebarStatus />
    </aside>
  );
}
