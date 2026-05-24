import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { AnimatedNumber } from '@shared/common/AnimatedNumber';

interface Props {
  weekId?: number;
  totalLocked: number;
  /** Optional unix-seconds deadline for the next settle */
  settleAt?: number;
}

function fmtCountdown(ms: number): { d: number; h: number; m: number; s: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export function HookPotHero({ weekId, totalLocked, settleAt }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const remainingMs = settleAt ? settleAt * 1000 - now : 0;
  const cd = fmtCountdown(remainingMs);
  const hasCountdown = settleAt && settleAt * 1000 > now;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold-border p-6 md:p-8" style={{ background: 'linear-gradient(180deg, rgba(231,184,79,0.10) 0%, rgba(231,184,79,0.02) 100%)' }}>
      <div className="halo-gold-radial absolute inset-0 pointer-events-none" />

      {/* trophy decoration top-right */}
      <div className="absolute right-4 top-4 md:right-6 md:top-6 opacity-90">
        <Trophy
          className="w-20 h-20 md:w-28 md:h-28 text-gold"
          strokeWidth={1.2}
          style={{ filter: 'drop-shadow(0 0 24px rgba(231,184,79,0.55))' }}
        />
      </div>

      <div className="relative z-10 flex flex-col gap-3 max-w-md">
        <div className="flex items-center gap-2">
          <span className="text-gold text-[10px] tracking-[0.2em] uppercase font-bold">CupSidePot</span>
          {weekId !== undefined && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gold-bg border border-gold-border text-gold font-bold">
              WEEK #{weekId}
            </span>
          )}
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-stadium-text-muted">Total locked</div>
          <div className="font-display text-stadium-text leading-none mt-2" style={{ fontSize: 'clamp(40px, 5.5vw, 64px)', fontWeight: 800 }}>
            <AnimatedNumber value={totalLocked} prefix="$" decimals={4} />
          </div>
        </div>

        {hasCountdown ? (
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-stadium-text-muted mb-1.5">Settles in</div>
            <div className="flex items-end gap-3 font-display text-stadium-text" style={{ fontWeight: 800 }}>
              <div className="flex flex-col items-center">
                <span className="text-2xl tabular">{String(cd.d).padStart(2, '0')}</span>
                <span className="text-[9px] text-stadium-text-muted uppercase tracking-widest">d</span>
              </div>
              <span className="text-xl text-stadium-text-muted">:</span>
              <div className="flex flex-col items-center">
                <span className="text-2xl tabular">{String(cd.h).padStart(2, '0')}</span>
                <span className="text-[9px] text-stadium-text-muted uppercase tracking-widest">h</span>
              </div>
              <span className="text-xl text-stadium-text-muted">:</span>
              <div className="flex flex-col items-center">
                <span className="text-2xl tabular">{String(cd.m).padStart(2, '0')}</span>
                <span className="text-[9px] text-stadium-text-muted uppercase tracking-widest">m</span>
              </div>
              <span className="text-xl text-stadium-text-muted">:</span>
              <div className="flex flex-col items-center">
                <span className="text-2xl tabular text-gold">{String(cd.s).padStart(2, '0')}</span>
                <span className="text-[9px] text-stadium-text-muted uppercase tracking-widest">s</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-stadium-text-secondary mt-1 max-w-sm">
            Half of the extra-spread above 5 bps lands here. Operator settles each week after
            CupOracleV3 finalizes match outcomes; correct BracketNFT pickers split it pro-rata.
          </p>
        )}
      </div>
    </div>
  );
}
