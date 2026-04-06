import { RECENT_CALLS } from '../../utils/mockData';

export const RecentCalls = () => (
  <div className="card overflow-hidden">
    <div className="border-b border-[#F0F0F0] p-6 pb-4">
      <h3 className="text-[16px] font-semibold">Recent calls</h3>
    </div>
    <div className="grid grid-cols-[1.4fr_1.2fr_0.8fr_0.8fr_0.6fr] gap-4 bg-[#FAFAFA] px-6 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
      <span>Endpoint</span>
      <span>Caller</span>
      <span>Paid</span>
      <span>Time</span>
      <span>Status</span>
    </div>
    {RECENT_CALLS.map((c, i) => (
      <div
        key={i}
        className="grid grid-cols-[1.4fr_1.2fr_0.8fr_0.8fr_0.6fr] items-center gap-4 border-t border-[#F0F0F0] px-6 py-3 text-[13px]"
      >
        <span className="font-mono text-[12px]">{c.endpoint}</span>
        <span className="font-mono text-[12px] text-[#6B7280]">{c.caller}</span>
        <span className="font-medium">${c.paid.toFixed(2)}</span>
        <span className="text-[#6B7280]">{c.time}</span>
        <span>{c.status === 'ok' ? '✅' : '⏳'}</span>
      </div>
    ))}
  </div>
);
