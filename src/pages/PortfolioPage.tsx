import { Button } from '../components/common/Button';
import { Allocation } from '../components/portfolio/Allocation';
import { HoldingsTable } from '../components/portfolio/HoldingsTable';
import { PortfolioChart } from '../components/portfolio/PortfolioChart';
import { StatsRow } from '../components/portfolio/StatsRow';
import { TokenScroll } from '../components/portfolio/TokenScroll';

export const PortfolioPage = () => (
  <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-8 md:px-8">
    <StatsRow />
    <TokenScroll />
    <PortfolioChart />
    <Allocation />
    <HoldingsTable />
    <div className="flex flex-wrap gap-2">
      <Button>🔄 Swap</Button>
      <Button variant="ai">✦ AI Analysis</Button>
      <Button variant="ghost">📥 Deposit</Button>
    </div>
  </div>
);
