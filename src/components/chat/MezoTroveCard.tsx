import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, ExternalLink, Bitcoin } from 'lucide-react';
import { api } from '../../api/client';
import type { MezoTroveDto } from '../../api/client';
import { useChat } from '../../hooks/useChat';

interface Props {
  address: string;
}

function HealthBadge({ health }: { health: MezoTroveDto['trove']['health'] }) {
  const cfg = {
    safe: { label: 'Safe', color: 'text-[#22C55E]', bg: 'bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.2)]' },
    warning: { label: 'Warning', color: 'text-[#F59E0B]', bg: 'bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]' },
    danger: { label: 'Danger', color: 'text-[#EF4444]', bg: 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)]' },
    liquidatable: { label: 'At Risk!', color: 'text-[#EF4444]', bg: 'bg-[rgba(239,68,68,0.15)] border-[rgba(239,68,68,0.3)]' },
  }[health];
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

function CRBar({ ratio }: { ratio: number }) {
  // Show from 100% (liquidation) to 200%+ visually
  const pct = Math.min(Math.max((ratio - 1.0) / 1.0, 0), 1) * 100;
  const color = ratio < 1.1 ? '#EF4444' : ratio < 1.25 ? '#F59E0B' : ratio < 1.5 ? '#F59E0B' : '#22C55E';
  return (
    <div className="w-full h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function MezoTroveCard({ address }: Props) {
  const [data, setData] = useState<MezoTroveDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { send } = useChat();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.mezoTrove(address);
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load Trove');
      }
    })();
    return () => { cancelled = true; };
  }, [address]);

  const noTrove = data && data.trove.statusCode !== 1;

  return (
    <div className="bg-[#151515] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 mt-1 w-full max-w-[380px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-[rgba(249,115,22,0.15)] border border-[rgba(249,115,22,0.3)] flex items-center justify-center">
          <Bitcoin className="w-4 h-4 text-[#F97316]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[#F5F5F5]">Mezo Trove</h3>
          <p className="text-[10px] text-[#666] truncate">{address}</p>
        </div>
        {data?.trove.health && <HealthBadge health={data.trove.health} />}
      </div>

      {/* Loading */}
      {!data && !error && (
        <div className="space-y-2">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-[#EF4444]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* No active Trove */}
      {noTrove && (
        <div className="text-center py-4">
          <Shield className="w-8 h-8 text-[#444] mx-auto mb-2" />
          <p className="text-xs text-[#A3A3A3] mb-1">No active Trove found</p>
          <p className="text-[10px] text-[#555]">Status: {data?.trove.status ?? '—'}</p>
          <button
            onClick={() => void send('How do I open a Trove on Mezo to borrow MUSD?')}
            className="mt-3 w-full h-8 rounded-lg bg-[rgba(249,115,22,0.12)] border border-[rgba(249,115,22,0.25)] text-[#F97316] text-xs font-bold hover:bg-[rgba(249,115,22,0.2)] transition-colors"
          >
            Open a Trove →
          </button>
        </div>
      )}

      {/* Active Trove */}
      {data && data.trove.statusCode === 1 && (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#1A1A1A] rounded-xl p-3">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">BTC Collateral</div>
              <div className="text-base font-bold text-[#F5F5F5] tabular">
                {data.trove.collBtc.toFixed(6)}
              </div>
              <div className="text-[10px] text-[#A3A3A3]">
                ≈ ${data.trove.collValueUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-3">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">MUSD Debt</div>
              <div className="text-base font-bold text-[#F97316] tabular">
                {data.trove.netDebtMusd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-[#A3A3A3]">+200 gas reserve</div>
            </div>
          </div>

          {/* Collateral ratio */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-[#666]">Collateral Ratio</span>
              <span className={`font-bold tabular ${
                data.trove.collateralRatio < 1.1 ? 'text-[#EF4444]' :
                data.trove.collateralRatio < 1.5 ? 'text-[#F59E0B]' : 'text-[#22C55E]'
              }`}>
                {(data.trove.collateralRatio * 100).toFixed(1)}%
              </span>
            </div>
            <CRBar ratio={data.trove.collateralRatio} />
            <div className="flex justify-between text-[10px] text-[#555] mt-1">
              <span>110% liq.</span>
              <span>150% safe</span>
              <span>200%+</span>
            </div>
          </div>

          {/* BTC price + liquidation */}
          <div className="flex gap-2 mb-4 text-xs">
            <div className="flex-1 bg-[#1A1A1A] rounded-lg p-2">
              <div className="text-[10px] text-[#555] mb-0.5">BTC Price</div>
              <div className="text-[#F5F5F5] font-mono">
                ${data.trove.btcPriceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="flex-1 bg-[#1A1A1A] rounded-lg p-2">
              <div className="text-[10px] text-[#555] mb-0.5">Liq. Price</div>
              <div className={`font-mono ${data.trove.btcPriceUsd * 0.9 < (data.trove.collateralRatio < 1.25 ? data.trove.btcPriceUsd : 0) ? 'text-[#EF4444]' : 'text-[#A3A3A3]'}`}>
                ${((data.trove.debtMusd * 1.1) / data.trove.collBtc).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => void send('How can I deploy my borrowed MUSD to earn yield?')}
              className="flex-1 h-9 rounded-lg bg-[rgba(249,115,22,0.12)] border border-[rgba(249,115,22,0.25)] text-[#F97316] text-xs font-bold hover:bg-[rgba(249,115,22,0.2)] transition-colors"
            >
              Earn with MUSD
            </button>
            <a
              href="https://mezo.org/feature/borrow"
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#A3A3A3] hover:text-[#F5F5F5] text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Manage
            </a>
          </div>
        </>
      )}

      {/* Network badge */}
      <div className="mt-3 flex items-center gap-1 text-[10px] text-[#444]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#F97316] opacity-60" />
        Mezo Testnet · chainId 31611
      </div>
    </div>
  );
}
