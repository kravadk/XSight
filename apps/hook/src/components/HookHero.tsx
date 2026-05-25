import { Anchor } from 'lucide-react';
import { HexGrid } from '@shared/common/HexGrid';

export function HookHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-stadium-line bg-gradient-to-br from-[#141B12] to-[#0F140E] p-7 md:p-9">
      {/* Atmospheric background layers */}
      <HexGrid color="#34C172" opacity={0.05} />
      <div className="halo-gold-radial absolute inset-0 pointer-events-none" />

      {/* 3D anchor decoration — bottom-right */}
      <div className="absolute -right-6 -bottom-6 opacity-90 pointer-events-none">
        <Anchor
          className="w-44 h-44 text-gold"
          strokeWidth={1.2}
          style={{ filter: 'drop-shadow(0 0 24px rgba(231,184,79,0.35))' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] tracking-[0.16em] uppercase font-bold bg-pitch-bg border border-pitch-border text-pitch">
            <span className="w-1.5 h-1.5 rounded-full bg-pitch" style={{ animation: 'pulse-dot 1.6s ease-in-out infinite' }} />
            LIVE on mainnet
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] tracking-[0.16em] uppercase font-bold bg-stadium-elevated border border-stadium-line text-stadium-text-secondary">
            Uniswap V4 · X Layer 196
          </span>
        </div>

        <h1 className="font-display text-stadium-text leading-[1.02]" style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 800, letterSpacing: '0.01em' }}>
          FanFeeHook
        </h1>

        <p className="text-stadium-text-secondary text-base md:text-lg max-w-xl">
          Identity-gated swap fee on Uniswap V4. The longer you've been a
          loyal X Cup fan, the lower your swap fee — automatically.
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] font-bold text-stadium-text max-w-xl">
          <span>Identity, not accounts.</span>
          <span className="text-pitch">·</span>
          <span>Real fans pay 5 bps.</span>
          <span className="text-pitch">·</span>
          <span>Composable rails for any SBT.</span>
        </div>

        <div className="max-w-xl rounded-xl border border-pitch-border bg-pitch-bg/50 px-4 py-3 text-[13px] leading-relaxed text-stadium-text-secondary">
          <span className="block text-pitch text-[10px] tracking-[0.2em] uppercase font-bold mb-1">Why this matters</span>
          DeFi has no native loyalty. FanFeeHook turns on-chain reputation
          into a 6× cheaper swap, then routes the spread into a community
          side-pot — composable rails any reputation system can plug into.
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-stadium-elevated border border-stadium-line text-stadium-text-secondary">
            22–28 May 2026
          </span>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-gold-bg border border-gold-border text-gold font-bold">
            14k USDT prize
          </span>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-stadium-elevated border border-stadium-line text-stadium-text-secondary">
            OKX · Build with Hook
          </span>
        </div>
      </div>
    </div>
  );
}
