import { Badge } from '../common/Badge';
import { CountUp } from '../common/CountUp';
import { StatCard } from '../common/StatCard';
import { WALLET } from '../../utils/mockData';

export const StatsRow = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <StatCard
      label="Total Assets"
      value={<CountUp value={WALLET.total} prefix="$" />}
      delta={<Badge tone="green">+{WALLET.todayPnlPct}%</Badge>}
    />
    <StatCard
      label="Today's PNL"
      value={<CountUp value={WALLET.todayPnl} prefix="+$" />}
      delta={<Badge tone="green">+{WALLET.todayPnlPct}%</Badge>}
      delay={0.06}
    />
    <StatCard
      label="30d PNL"
      value={<CountUp value={WALLET.monthPnl} prefix="+$" />}
      delta={<Badge tone="green">+{WALLET.monthPnlPct}%</Badge>}
      delay={0.12}
    />
  </div>
);
