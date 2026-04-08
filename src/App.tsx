import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { useUiStore } from './store/uiStore';
import { PortfolioPage } from './pages/PortfolioPage';
import { ChatPage } from './pages/ChatPage';
import { ApiPage } from './pages/ApiPage';
import { EarnPage } from './pages/EarnPage';
import { GuidePage } from './pages/GuidePage';
import { BuildPage } from './pages/BuildPage';
import { AnimatePresence, motion } from 'motion/react';
import { ToastHost } from './components/common/ToastHost';
import { useBackendSync } from './hooks/useBackendSync';
import { BottomTabBar } from './components/layout/BottomTabBar';
import { CommandPalette } from './components/common/CommandPalette';

export default function App() {
  const { activeTab } = useUiStore();
  useBackendSync();

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5] flex">
      <Sidebar />
      <div className="flex-1 md:ml-[240px] flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 p-3 md:p-5 relative pb-24 md:pb-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'portfolio' && <PortfolioPage />}
              {activeTab === 'dashboard' && <PortfolioPage />}
              {activeTab === 'chat' && <ChatPage />}
              {activeTab === 'api' && <ApiPage />}
              {activeTab === 'earn' && <EarnPage />}
              {activeTab === 'guide' && <GuidePage />}
              {activeTab === 'build' && <BuildPage />}
              {!['portfolio', 'dashboard', 'chat', 'api', 'earn', 'guide', 'build'].includes(activeTab) && (
                <div className="flex items-center justify-center h-full text-[#A3A3A3]">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} coming soon
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomTabBar />
      <ToastHost />
      <CommandPalette />
    </div>
  );
}
