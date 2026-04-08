import { Sparkles } from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';
import { useUiStore } from '../../store/uiStore';
import { TokenIcon } from '../common/TokenIcon';

export function SidebarPositions() {
  const tokens = useWalletStore((s) => s.tokens);
  const loading = useWalletStore((s) => s.loading);
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  const top = [...tokens].sort((a, b) => b.usdValue - a.usdValue).slice(0, 5);

  return (
    <div className="mt-8 px-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-micro text-[#666]">Active Positions</h3>
      </div>

      <div className="flex flex-col gap-2.5">
        {loading && top.length === 0 && (
          <div className="text-[11px] text-[#666]">Loading...</div>
        )}
        {!loading && top.length === 0 && (
          <div className="text-[11px] text-[#666]">No positions</div>
        )}
        {top.map((pos) => (
          <button
            key={pos.symbol}
            onClick={() => setActiveTab('portfolio')}
            className="flex items-center justify-between text-xs hover:bg-[rgba(255,255,255,0.04)] -mx-2 px-2 py-1.5 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <TokenIcon symbol={pos.symbol} size={18} />
              <span className="text-[#A3A3A3] group-hover:text-[#F5F5F5] transition-colors truncate">
                {pos.symbol}
              </span>
            </div>
            <span className="text-[#A3A3A3] tabular text-[11px]">${pos.usdValue.toFixed(2)}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setActiveTab('earn')}
        className="mt-6 w-full p-4 bg-[#161616] rounded-2xl border border-[rgba(255,255,255,0.06)] relative overflow-hidden group hover:border-[rgba(190,255,0,0.15)] transition-all"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(191,255,0,0.06)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex flex-col items-center text-center gap-1.5 relative z-10">
          <div className="w-8 h-8 rounded-full bg-[rgba(191,255,0,0.08)] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#BFFF00]" />
          </div>
          <h4 className="text-sm font-bold text-[#F5F5F5]">Boost Earnings</h4>
          <p className="text-[10px] text-[#666]">Auto-deploy yield loop</p>
        </div>
      </button>
    </div>
  );
}
