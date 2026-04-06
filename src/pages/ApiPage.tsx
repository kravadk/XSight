import { ApiHeader } from '../components/api/ApiHeader';
import { EndpointsGrid } from '../components/api/EndpointsGrid';
import { RecentCalls } from '../components/api/RecentCalls';
import { RevenueChart } from '../components/api/RevenueChart';
import { RevenueStats } from '../components/api/RevenueStats';

export const ApiPage = () => (
  <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-8 md:px-8">
    <ApiHeader />
    <EndpointsGrid />
    <RevenueStats />
    <RevenueChart />
    <RecentCalls />
  </div>
);
