import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Sidebar } from '@shared/layout/Sidebar';
import { TopBar } from '@shared/layout/TopBar';
import { BottomTabBar } from '@shared/layout/BottomTabBar';
import { SettingsPanel } from '@shared/layout/SettingsPanel';
import { ToastHost } from '@shared/common/ToastHost';
import { CommandPalette } from '@shared/common/CommandPalette';
import { ErrorBoundary } from '@shared/common/ErrorBoundary';
import { Onboarding } from '@shared/common/Onboarding';
import { ConnectModal } from '@shared/common/ConnectModal';
import { DemoBanner } from '@shared/common/DemoBanner';
import { Confetti } from '@shared/common/Confetti';
import { useUiStore, type Product } from '@shared/store/uiStore';
import { usePrefsStore } from '@shared/store/prefsStore';
import { useBackendSync } from '@shared/hooks/useBackendSync';

// XSight copilot
const PortfolioPage = lazy(() => import('@xsight/pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage })));
const ChatPage = lazy(() => import('@xsight/pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const ApiPage = lazy(() => import('@xsight/pages/ApiPage').then((m) => ({ default: m.ApiPage })));
const EarnPage = lazy(() => import('@xsight/pages/EarnPage').then((m) => ({ default: m.EarnPage })));
const GuidePage = lazy(() => import('@xsight/pages/GuidePage').then((m) => ({ default: m.GuidePage })));
const BuildPage = lazy(() => import('@xsight/pages/BuildPage').then((m) => ({ default: m.BuildPage })));

// X Cup prediction market
const MarketsPage = lazy(() => import('@xcup/pages/MarketsPage').then((m) => ({ default: m.MarketsPage })));
const MarketDetailPage = lazy(() => import('@xcup/pages/MarketDetailPage').then((m) => ({ default: m.MarketDetailPage })));
const BetsPage = lazy(() => import('@xcup/pages/BetsPage').then((m) => ({ default: m.BetsPage })));
const BracketPage = lazy(() => import('@xcup/pages/BracketPage').then((m) => ({ default: m.BracketPage })));
const LeaderboardPage = lazy(() => import('@xcup/pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const PunditPage = lazy(() => import('@xcup/pages/PunditPage').then((m) => ({ default: m.PunditPage })));
const FanPassPage = lazy(() => import('@xcup/pages/FanPassPage').then((m) => ({ default: m.FanPassPage })));

// Hook hackathon
const HookPage = lazy(() => import('@hook/pages/HookPage').then((m) => ({ default: m.HookPage })));

// Shared
const DevelopersPage = lazy(() => import('./pages/DevelopersPage').then((m) => ({ default: m.DevelopersPage })));
const DocsPage = lazy(() => import('./pages/DocsPage').then((m) => ({ default: m.DocsPage })));

export default function App() {
  const { product, activeTab } = useUiStore();
  const setProduct = useUiStore((s) => s.setProduct);
  const reducedMotion = usePrefsStore((s) => s.reducedMotion);
  useBackendSync();

  // Deep-link entry from product-specific README links (e.g. ?product=hook).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('product');
    if (p === 'xsight' || p === 'xcup' || p === 'hook') setProduct(p as Product);
  }, [setProduct]);

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
    <div className="flex min-h-screen w-full overflow-x-hidden bg-stadium-base text-stadium-text">
      <Sidebar />
      <div className="flex min-h-screen w-full min-w-0 flex-col md:ml-[240px] md:w-[calc(100vw-240px)] md:flex-none">
        <TopBar />
        <main className="relative min-w-0 flex-1 overflow-x-hidden p-3 pb-24 md:p-6 md:pb-8">
          <DemoBanner />
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full min-w-0"
            >
              <ErrorBoundary resetKey={activeTab}>
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
                {/* Hook — all hook-* sub-tabs render HookPage, which reads activeTab to switch in-page view */}
                {activeTab.startsWith('hook') && <HookPage />}
                {/* Shared */}
                {activeTab === 'developers' && <DevelopersPage />}
                {activeTab === 'docs' && <DocsPage />}
                {/* fallback for any unrouted tab */}
                {['cup', 'agentbet', 'files', 'rewards'].includes(activeTab) &&
                  (product === 'xcup' ? <MarketsPage /> : product === 'hook' ? <HookPage /> : <ChatPage />)}
              </Suspense>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomTabBar />
      <ToastHost />
      <CommandPalette />
      <SettingsPanel />
      <ConnectModal />
      <Onboarding />
      <Confetti />
    </div>
    </MotionConfig>
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
