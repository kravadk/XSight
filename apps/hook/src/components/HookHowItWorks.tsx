import { Wallet, Anchor, TrendingDown, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    icon: Wallet,
    title: 'Hold FanPass',
    body: 'Earn reputation by participating in X Cup brackets — your score lives on-chain.',
    color: '#4AA8E0',
  },
  {
    icon: Anchor,
    title: 'Hook reads it',
    body: 'On every swap, FanFeeHook fetches your tier from FanScoreRegistry in beforeSwap.',
    color: '#34C172',
  },
  {
    icon: TrendingDown,
    title: 'Pay less',
    body: 'Dynamic fee flag overrides the pool fee — top tier swaps 6× cheaper than unknown.',
    color: '#E7B84F',
  },
];

export function HookHowItWorks() {
  return (
    <div className="stadium-card p-5 md:p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-pitch text-[10px] tracking-[0.2em] uppercase font-bold">How it works</span>
        <span className="text-[11px] text-stadium-text-muted font-mono">3 steps</span>
      </div>

      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative">
              <div
                className="flex gap-3 p-3 rounded-xl border"
                style={{
                  background: `linear-gradient(180deg, ${step.color}14 0%, ${step.color}06 100%)`,
                  borderColor: `${step.color}40`,
                }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: `${step.color}22`,
                    boxShadow: `0 0 16px ${step.color}33`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: step.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-stadium-text-muted">0{i + 1}</span>
                    <h4 className="font-display text-sm md:text-base text-stadium-text" style={{ fontWeight: 700 }}>
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-xs text-stadium-text-secondary leading-snug mt-1">{step.body}</p>
                </div>
              </div>

              {i < STEPS.length - 1 && (
                <div className="flex justify-center my-1">
                  <ArrowRight className="w-3.5 h-3.5 text-stadium-text-muted rotate-90" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
