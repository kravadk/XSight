import { AnimatedNumber } from '@shared/common/AnimatedNumber';

interface Props {
  /** Score 0..100 — fills the ring proportionally */
  score: number;
  /** Tier 0..3 — drives the stroke color */
  tier: number;
  /** Fee in basis points for the center number */
  feeBps: number;
  /** Tier label e.g. "TRUSTED" */
  tierLabel: string;
  /** Render at this px size (square). Default 180 */
  size?: number;
}

const TIER_STROKE: Record<number, string> = {
  0: '#9DA89C',
  1: '#4AA8E0',
  2: '#34C172',
  3: '#E7B84F',
};

const TIER_GLOW: Record<number, string> = {
  0: 'rgba(157, 168, 156, 0.0)',
  1: 'rgba(74, 168, 224, 0.45)',
  2: 'rgba(52, 193, 114, 0.45)',
  3: 'rgba(231, 184, 79, 0.55)',
};

export function HookFeeRing({ score, tier, feeBps, tierLabel, size = 180 }: Props) {
  const stroke = TIER_STROKE[tier] ?? TIER_STROKE[0];
  const glow = TIER_GLOW[tier] ?? TIER_GLOW[0];
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillFraction = Math.max(0.04, Math.min(1, score / 100));
  const target = circumference * (1 - fillFraction);

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        style={{ filter: `drop-shadow(0 0 16px ${glow})` }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={10}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="ring-draw"
          style={{
            ['--ring-circumference' as string]: circumference.toString(),
            ['--ring-target' as string]: target.toString(),
            transform: `rotate(-90deg)`,
            transformOrigin: '50% 50%',
          }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="font-display text-stadium-text" style={{ fontSize: size * 0.26, lineHeight: 1, fontWeight: 800 }}>
          <AnimatedNumber value={feeBps} decimals={0} />
        </div>
        <div className="text-stadium-text-secondary text-xs tracking-widest mt-1">BPS</div>
        <div className="text-[10px] tracking-[0.18em] uppercase mt-2" style={{ color: stroke }}>
          {tierLabel} · T{tier}
        </div>
      </div>
    </div>
  );
}
