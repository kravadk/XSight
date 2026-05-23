import { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { api, type TokenSecurityDto } from '@shared/api/client';
import { useChat } from '@shared/hooks/useChat';
import { tokenMeta } from '@shared/config/tokens';
import { TokenIcon } from '@shared/common/TokenIcon';

interface Props {
  symbol: string;
}

export function RiskCard({ symbol }: Props) {
  const [data, setData] = useState<TokenSecurityDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { send } = useChat();
  const meta = tokenMeta(symbol);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.security(symbol);
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const levelColor =
    data?.level === 'LOW'
      ? 'text-[#22C55E]'
      : data?.level === 'MEDIUM'
        ? 'text-[#F59E0B]'
        : 'text-[#EF4444]';

  const Icon = data?.level === 'LOW' ? ShieldCheck : data?.level === 'HIGH' ? AlertTriangle : ShieldAlert;

  return (
    <div className="bg-[#151515] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 mt-1 w-full max-w-[360px]">
      <div className="flex items-center gap-2 mb-3">
        <TokenIcon symbol={meta.symbol} size={20} />
        <h3 className="text-sm font-bold text-[#F5F5F5] flex-1">Risk Scan: {meta.symbol}</h3>
        <Icon className={`w-4 h-4 ${levelColor}`} />
      </div>

      {error && <div className="text-xs text-[#EF4444]">{error}</div>}
      {!data && !error && <div className="text-xs text-[#A3A3A3]">Scanning...</div>}

      {data && (
        <>
          <div className="flex items-baseline gap-2 mb-3">
            <span className={`text-3xl font-bold ${levelColor}`}>{data.riskScore}</span>
            <span className="text-xs text-[#A3A3A3]">/ 100</span>
            <span className={`ml-auto text-xs font-bold ${levelColor}`}>{data.level}</span>
          </div>

          {data.warnings.length > 0 && (
            <ul className="text-xs text-[#A3A3A3] mb-3 space-y-1">
              {data.warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          )}

          <div className="text-xs text-[#A3A3A3] mb-4 p-3 bg-[#1A1A1A] rounded-lg leading-relaxed">
            {data.verdict}
          </div>

          <button
            onClick={() => void send(`Swap 50 USDT to ${meta.symbol}`)}
            className="w-full h-9 bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[#F5F5F5] text-xs font-bold rounded-lg transition-colors"
          >
            Buy {meta.symbol}
          </button>
        </>
      )}
    </div>
  );
}
