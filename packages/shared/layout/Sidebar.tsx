import { SidebarNav } from './SidebarNav';
import { SidebarStatus } from './SidebarStatus';
import { ProductSwitch } from './ProductSwitch';

export function Sidebar() {
  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 w-[240px] flex-col border-r border-stadium-line bg-stadium-sidebar">
      <div className="px-4 pb-3 pt-5">
        <div className="mb-2 px-2 text-micro text-stadium-text-muted">XSight · three product surfaces</div>
        <ProductSwitch />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <SidebarNav />
      </div>

      <SidebarStatus />
    </aside>
  );
}
