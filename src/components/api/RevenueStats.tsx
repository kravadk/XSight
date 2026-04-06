import { Badge } from '../common/Badge';
import { CountUp } from '../common/CountUp';
import { StatCard } from '../common/StatCard';
import { API_STATS } from '../../utils/mockData';

export const RevenueStats = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <StatCard
      label="Total Earned"
      value={<CountUp value={API_STATS.totalEarned} prefix="$" />}
    />
    <StatCard
      label="Today"
      value={<CountUp value={API_STATS.today} prefix="$" />}
      delta={<Badge tone="green">+{API_STATS.todayDelta}%</Badge>}
      delay={0.06}
    />
    <StatCard
      label="Calls Today"
      value={<CountUp value={API_STATS.callsToday} digits={0} />}
      delta={<Badge tone="green">+{API_STATS.callsDelta}</Badge>}
      delay={0.12}
    />
  </div>
);
