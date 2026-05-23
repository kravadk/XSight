import { useState } from 'react';
import { AssetCharts } from '@xsight/components/portfolio/AssetCharts';
import { StatCards } from '@xsight/components/portfolio/StatCards';
import { TransactionSummary } from '@xsight/components/portfolio/TransactionSummary';
import { SwapWidget } from '@xsight/components/portfolio/SwapWidget';
import { HoldingsList } from '@xsight/components/portfolio/HoldingsList';
import { PortfolioActionsBar } from '@xsight/components/portfolio/PortfolioActionsBar';
import { Allocation } from '@xsight/components/portfolio/Allocation';
import { CompoundAdvantage } from '@xsight/components/portfolio/CompoundAdvantage';
import { PortfolioHistoryChart } from '@xsight/components/portfolio/PortfolioHistoryChart';
import { useWalletStore } from '@shared/store/walletStore';
import { useUiStore } from '@shared/store/uiStore';
import { SegmentedTabs } from '@shared/common/SegmentedTabs';

type Sub = 'overview' | 'holdings' | 'history' | 'yield';

const subs: { id: Sub; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'holdings', label: 'Holdings' },
  { id: 'history', label: 'History' },
  { id: 'yield', label: 'Yield' },
];

export function PortfolioPage() {
  const [sub, setSub] = useState<Sub>('overview');
  const connected = useWalletStore(s => s.connected);
  const setActiveTab = useUiStore(s => s.setActiveTab);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[rgba(191,255,0,0.06)] border border-[rgba(191,255,0,0.15)] flex items-center justify-center">
          <svg className="w-10 h-10 text-[#BFFF00]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#F5F5F5] mb-2">Connect your wallet</h2>
          <p className="text-sm text-[#666] max-w-xs">
            Connect your OKX Wallet or MetaMask to view your X Layer portfolio, holdings, and yield positions.
          </p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('xsight:open-wallet'))}
          className="h-12 px-8 rounded-xl bg-[#BFFF00] text-[#0A0A0A] font-bold text-sm hover:bg-[#D4FF33] transition-colors"
        >
          Connect Wallet
        </button>
        <p className="text-[11px] text-[#444]">
          Or use <button onClick={() => setActiveTab('chat')} className="text-[#A78BFA] hover:underline">AI Chat</button> without connecting — ask XSight anything about X Layer markets.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SegmentedTabs value={sub} items={subs} onChange={setSub} />
        <PortfolioActionsBar />
      </div>

      <CompoundAdvantage />

      {sub === 'overview' && (
        <>
          <StatCards />
          <PortfolioHistoryChart />
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="flex-[7] flex flex-col min-w-0 gap-5">
              <AssetCharts />
            </div>
            <div className="flex-[3] flex flex-col gap-4 lg:min-w-[320px]">
              <Allocation />
              <TransactionSummary />
            </div>
          </div>
        </>
      )}

      {sub === 'holdings' && (
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-[7]"><HoldingsList /></div>
          <div className="flex-[3] flex flex-col gap-4 lg:min-w-[320px]">
            <Allocation />
          </div>
        </div>
      )}

      {sub === 'history' && <HoldingsList showHistory />}

      {sub === 'yield' && (
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-[7]">
            <StatCards />
          </div>
          <div className="flex-[3] lg:min-w-[320px]">
            <SwapWidget />
          </div>
        </div>
      )}
    </div>
  );
}
