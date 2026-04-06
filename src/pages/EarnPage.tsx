import { AutoDeployConfig } from '../components/earn/AutoDeployConfig';
import { EconomyLoop } from '../components/earn/EconomyLoop';
import { LpPosition } from '../components/earn/LpPosition';
import { RevenueBreakdown } from '../components/earn/RevenueBreakdown';

export const EarnPage = () => (
  <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-8 md:px-8">
    <EconomyLoop />
    <LpPosition />
    <RevenueBreakdown />
    <AutoDeployConfig />
  </div>
);
