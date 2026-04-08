import { useState } from 'react';
import { AssetCharts } from '../components/portfolio/AssetCharts';
import { StatCards } from '../components/portfolio/StatCards';
import { TransactionSummary } from '../components/portfolio/TransactionSummary';
import { SwapWidget } from '../components/portfolio/SwapWidget';
import { HoldingsList } from '../components/portfolio/HoldingsList';
import { PortfolioActionsBar } from '../components/portfolio/PortfolioActionsBar';
import { Allocation } from '../components/portfolio/Allocation';
import { CompoundAdvantage } from '../components/portfolio/CompoundAdvantage';
import { cn } from '../utils/format';

type Sub = 'overview' | 'holdings' | 'history' | 'yield';

const subs: { id: Sub; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'holdings', label: 'Holdings' },
  { id: 'history', label: 'History' },
  { id: 'yield', label: 'Yield' },
];

export function PortfolioPage() {
  const [sub, setSub] = useState<Sub>('overview');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {subs.map((s) => (
            <button
              key={s.id}
              onClick={() => setSub(s.id)}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold rounded-full transition-colors',
                sub === s.id
                  ? 'bg-[#BFFF00] text-[#0A0A0A]'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5] bg-[rgba(255,255,255,0.04)]',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <PortfolioActionsBar />
      </div>

      <CompoundAdvantage />

      {sub === 'overview' && (
        <>
          <StatCards />
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
