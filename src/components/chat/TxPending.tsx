import { useEffect, useState } from 'react';

const STEPS = [
  'Preparing transaction',
  'Signing with wallet',
  'Broadcasting to X Layer',
  'Confirming',
];

interface Props {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
}

export const TxPending = ({ fromSymbol, toSymbol, fromAmount, toAmount }: Props) => {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timers: number[] = [];
    for (let i = 1; i < STEPS.length; i += 1) {
      timers.push(window.setTimeout(() => setStepIdx(i), i * 800));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <div className="card w-full max-w-[360px] p-5">
      <div className="mb-1 text-[13px] font-medium text-[#6B7280]">
        Processing swap
      </div>
      <div className="mb-4 text-[14px] font-semibold">
        {fromAmount} {fromSymbol} → {toAmount} {toSymbol}
      </div>
      <ul className="space-y-3">
        {STEPS.map((s, i) => {
          const done = i < stepIdx;
          const current = i === stepIdx;
          return (
            <li key={s} className="flex items-center gap-3 text-[13px]">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  done
                    ? 'bg-[#00C853] text-white'
                    : current
                      ? 'border-2 border-[#7C5CFC] text-[#7C5CFC]'
                      : 'border border-[#E5E7EB] text-[#9CA3AF]'
                }`}
              >
                {done ? '✓' : current ? <span className="h-2 w-2 animate-pulse rounded-full bg-[#7C5CFC]" /> : ''}
              </span>
              <span className={done || current ? 'text-[#0D0D0D]' : 'text-[#9CA3AF]'}>
                {s}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
