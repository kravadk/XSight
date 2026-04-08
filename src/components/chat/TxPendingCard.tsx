import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import { tokenMeta } from '../../config/tokens';
import { TokenIcon } from '../common/TokenIcon';
import { cn } from '../../utils/format';

interface Props {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
}

const STEPS = ['Preparing transaction', 'Signing with wallet', 'Broadcasting to X Layer', 'Confirming'] as const;
const STEP_MS = 800;

/**
 * 4-step animated transaction status. Steps walk forward visually so the user
 * sees clear progression — even though the actual swap usually completes in
 * one round trip, this models the standard EVM tx lifecycle (build → sign →
 * broadcast → confirm).
 *
 * The card sits in the chat until the swap resolves, at which point useSwap
 * replaces it with a TxSuccess (or error) card.
 */
export function TxPendingCard({ fromSymbol, toSymbol, fromAmount, toAmount }: Props) {
  const f = tokenMeta(fromSymbol);
  const t = tokenMeta(toSymbol);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= STEPS.length - 1) return;
    const id = window.setTimeout(() => setCurrentStep((s) => s + 1), STEP_MS);
    return () => window.clearTimeout(id);
  }, [currentStep]);

  return (
    <div className="bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 mt-1 w-full max-w-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#F5F5F5]">Processing swap</h3>
        <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
          <span className="tabular">{fromAmount}</span>
          <TokenIcon symbol={f.symbol} size={14} />
          <span>{f.symbol}</span>
          <span className="text-[#666]">→</span>
          <span className="tabular">{toAmount.toFixed(4)}</span>
          <TokenIcon symbol={t.symbol} size={14} />
          <span>{t.symbol}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {STEPS.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div
              key={label}
              className={cn(
                'flex items-center gap-2.5 text-xs transition-colors',
                done ? 'text-[#22C55E]' : active ? 'text-[#BFFF00]' : 'text-[#666]',
              )}
            >
              {done ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : active ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
              <span className={cn('font-semibold', active && 'text-[#F5F5F5]')}>{label}</span>
              {active && <span className="text-[10px] text-[#666] ml-auto">in progress</span>}
              {done && <span className="text-[10px] text-[#22C55E] ml-auto">done</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
