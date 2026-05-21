import { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { BottomTabBar } from './components/layout/BottomTabBar';
import { ToastHost } from './components/common/ToastHost';
import { CommandPalette } from './components/common/CommandPalette';
import { useUiStore } from './store/uiStore';
import { useBackendSync } from './hooks/useBackendSync';

// XSight copilot
const PortfolioPage = lazy(() => import('./pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage })));
const ChatPage = lazy(() => import('./pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const ApiPage = lazy(() => import('./pages/ApiPage').then((m) => ({ default: m.ApiPage })));
const EarnPage = lazy(() => import('./pages/EarnPage').then((m) => ({ default: m.EarnPage })));
const GuidePage = lazy(() => import('./pages/GuidePage').then((m) => ({ default: m.GuidePage })));
const BuildPage = lazy(() => import('./pages/BuildPage').then((m) => ({ default: m.BuildPage })));

// X Cup prediction market
const MarketsPage = lazy(() => import('./pages/MarketsPage').then((m) => ({ default: m.MarketsPage })));
const MarketDetailPage = lazy(() => import('./pages/MarketDetailPage').then((m) => ({ default: m.MarketDetailPage })));
const BetsPage = lazy(() => import('./pages/BetsPage').then((m) => ({ default: m.BetsPage })));
const BracketPage = lazy(() => import('./pages/BracketPage').then((m) => ({ default: m.BracketPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const PunditPage = lazy(() => import('./pages/PunditPage').then((m) => ({ default: m.PunditPage })));
const FanPassPage = lazy(() => import('./pages/FanPassPage').then((m) => ({ default: m.FanPassPage })));
const DevelopersPage = lazy(() => import('./pages/DevelopersPage').then((m) => ({ default: m.DevelopersPage })));

export default function App() {
  const { product, activeTab } = useUiStore();
  useBackendSync();

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-stadium-base text-stadium-text">
      <Sidebar />
      <div className="flex min-h-screen w-full min-w-0 flex-col md:ml-[240px] md:w-[calc(100vw-240px)] md:flex-none">
        <TopBar />
        <main className="relative min-w-0 flex-1 overflow-x-hidden p-3 pb-24 md:p-6 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full min-w-0"
            >
              <Suspense fallback={<PageSkeleton />}>
                {/* XSight copilot */}
                {(activeTab === 'portfolio' || activeTab === 'dashboard') && <PortfolioPage />}
                {activeTab === 'chat' && <ChatPage />}
                {activeTab === 'api' && <ApiPage />}
                {activeTab === 'earn' && <EarnPage />}
                {activeTab === 'guide' && <GuidePage />}
                {activeTab === 'build' && <BuildPage />}
                {/* X Cup */}
                {activeTab === 'markets' && <MarketsPage />}
                {activeTab === 'market-detail' && <MarketDetailPage />}
                {activeTab === 'bets' && <BetsPage />}
                {activeTab === 'bracket' && <BracketPage />}
                {activeTab === 'leaderboard' && <LeaderboardPage />}
                {activeTab === 'pundit' && <PunditPage />}
                {activeTab === 'fanpass' && <FanPassPage />}
                {activeTab === 'developers' && <DevelopersPage />}
                {/* fallback for any unrouted tab */}
                {['cup', 'agentbet', 'files', 'rewards'].includes(activeTab) &&
                  (product === 'xcup' ? <MarketsPage /> : <ChatPage />)}
              </Suspense>
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

function PageSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton h-44 w-full rounded-2xl" />
      ))}
    </div>
  );
}
