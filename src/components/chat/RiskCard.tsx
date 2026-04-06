import { AiBadge } from '../common/AiBadge';
import { Button } from '../common/Button';
import { TOKENS } from '../../utils/mockData';

interface Props {
  symbol: string;
}

const CHECKS = [
  { ok: true, label: 'Contract verified' },
  { ok: true, label: 'High liquidity' },
  { ok: true, label: 'Not a honeypot' },
  { ok: false, label: 'Top holders concentrated' },
];

export const RiskCard = ({ symbol }: Props) => {
  const token = TOKENS[symbol];
  const score = token?.risk ?? 10;
  const label = score < 20 ? 'LOW' : score < 50 ? 'MED' : 'HIGH';

  return (
    <div className="card relative w-full max-w-[360px] p-5">
      <div className="absolute right-4 top-4">
        <AiBadge />
      </div>
      <div className="mb-1 text-[13px] font-medium text-[#6B7280]">
        🛡️ Security Scan
      </div>
      <div className="mb-3 text-[16px] font-semibold">{symbol}</div>

      <div className="mb-4">
        <div className="mb-1 flex items-baseline justify-between">
          <div className="text-[22px] font-bold">
            {score}<span className="text-[13px] text-[#6B7280]">/100</span>
          </div>
          <div className="text-[12px] font-semibold text-[#00A344]">{label}</div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[#F0F0F0]">
          <div
            className="h-full rounded-full bg-[#00C853]"
            style={{ width: `${100 - score}%` }}
          />
        </div>
      </div>

      <ul className="mb-4 space-y-2 text-[13px]">
        {CHECKS.map((c) => (
          <li key={c.label} className="flex items-center gap-2">
            <span className={c.ok ? 'text-[#00C853]' : 'text-[#F59E0B]'}>
              {c.ok ? '✅' : '⚠️'}
            </span>
            <span className="text-[#0D0D0D]">{c.label}</span>
          </li>
        ))}
      </ul>

      <div className="mb-4 rounded-[12px] bg-[#F3F0FF] px-4 py-3 text-[13px] italic text-[#4B3AA8]">
        "{symbol} looks solid — established token with strong liquidity. Minor concentration risk but no honeypot signals."
      </div>

      <Button variant="ghost" className="!text-[#00C853]">
        Buy {symbol} →
      </Button>
    </div>
  );
};
