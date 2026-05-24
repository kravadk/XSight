interface TierRow {
  tier: number;
  label: string;
  bps: number;
}

interface Props {
  tiers: TierRow[];
  /** Optional active tier to highlight (current connected wallet's tier) */
  activeTier?: number;
}

const STYLE: Record<number, { stroke: string; bg: string; text: string }> = {
  0: { stroke: '#9DA89C', bg: 'rgba(255,255,255,0.04)', text: 'text-stadium-text-secondary' },
  1: { stroke: '#4AA8E0', bg: 'rgba(74,168,224,0.08)', text: 'text-outcome-away' },
  2: { stroke: '#34C172', bg: 'rgba(52,193,114,0.10)', text: 'text-pitch' },
  3: { stroke: '#E7B84F', bg: 'rgba(231,184,79,0.12)', text: 'text-gold' },
};

function TierProgressRing({ tier }: { tier: number }) {
  const s = STYLE[tier];
  const fraction = (tier + 1) / 4;
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - fraction);
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0">
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke={s.stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 18 18)"
        style={{ filter: `drop-shadow(0 0 4px ${s.stroke})` }}
      />
      <text x="18" y="22" textAnchor="middle" fontSize="11" fontWeight="800" fill={s.stroke} fontFamily="ui-rounded, system-ui">
        T{tier}
      </text>
    </svg>
  );
}

export function HookTierLadder({ tiers, activeTier }: Props) {
  return (
    <div className="stadium-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-pitch text-[10px] tracking-[0.2em] uppercase font-bold">Tier Ladder</span>
        </div>
        <span className="text-[11px] text-stadium-text-muted font-mono">5 → 30 bps</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {tiers.map((row) => {
          const s = STYLE[row.tier];
          const isActive = activeTier === row.tier;
          return (
            <div
              key={row.tier}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all`}
              style={{
                background: s.bg,
                borderColor: isActive ? s.stroke : `${s.stroke}33`,
                boxShadow: isActive ? `0 0 24px ${s.stroke}44` : 'none',
              }}
            >
              <TierProgressRing tier={row.tier} />
              <div className={`flex-1 font-display text-base md:text-lg ${s.text}`} style={{ fontWeight: 700 }}>
                {row.label}
              </div>
              <div className={`font-display text-xl md:text-2xl ${s.text} tabular`} style={{ fontWeight: 800 }}>
                {row.bps} <span className="text-xs opacity-70">bps</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-stadium-text-muted leading-relaxed">
        Fee charged on swap input via Uniswap V4 dynamic-fee flag. Computed
        each swap from your FanPass + on-chain reputation score.
      </p>
    </div>
  );
}
