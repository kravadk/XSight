import { AnimatePresence, motion } from 'framer-motion';
import { BottomTabBar } from './components/layout/BottomTabBar';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { ApiPage } from './pages/ApiPage';
import { ChatPage } from './pages/ChatPage';
import { EarnPage } from './pages/EarnPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { useUiStore } from './store/uiStore';

const renderTab = (tab: string) => {
  switch (tab) {
    case 'chat':
      return <ChatPage />;
    case 'portfolio':
      return <PortfolioPage />;
    case 'api':
      return <ApiPage />;
    case 'earn':
      return <EarnPage />;
    default:
      return null;
  }
};

const App = () => {
  const tab = useUiStore((s) => s.activeTab);
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar />
      <div className="md:pl-[220px]">
        <TopBar />
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderTab(tab)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default App;
