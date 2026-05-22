import { Briefcase } from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';
import { useChat } from '../../hooks/useChat';
import { TokenIcon } from '../common/TokenIcon';

interface Props {
  advice: string;
}

export function PortfolioCard({ advice }: Props) {
  const tokens = useWalletStore((s) => s.tokens);
  const totalUsd = useWalletStore((s) => s.totalUsd);
  const { send } = useChat();

  return (
    <div className="bg-[#151515] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 mt-1 w-full max-w-[400px]">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="w-4 h-4 text-[#BFFF00]" />
        <h3 className="text-sm font-bold text-[#F5F5F5]">Your Portfolio</h3>
      </div>

      <div className="text-2xl font-bold text-[#F5F5F5] mb-4">
        ${totalUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {tokens.length === 0 && <div className="text-xs text-[#666666]">No holdings</div>}
        {tokens.map((t) => (
          <div key={t.symbol} className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <TokenIcon symbol={t.symbol} size={16} />
              <span className="text-[#A3A3A3]">{t.symbol}</span>
            </div>
            <span className="font-mono text-[#F5F5F5] tabular">${t.usdValue.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {advice && (
        <div className="text-xs text-[#A3A3A3] leading-relaxed mb-4 p-3 bg-[#1A1A1A] rounded-lg">
          {advice}
        </div>
      )}

      <button
        onClick={() => void send('Rebalance my portfolio')}
        className="w-full h-9 bg-[#BFFF00] text-[#0A0A0A] text-xs font-bold rounded-lg hover:bg-[#D4FF33] transition-colors"
      >
        Rebalance
      </button>
    </div>
  );
}
