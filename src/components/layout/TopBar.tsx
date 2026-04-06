import { AiBadge } from '../common/AiBadge';
import { useUiStore } from '../../store/uiStore';
import { useWalletStore } from '../../store/walletStore';

const titles: Record<string, string> = {
  chat: 'Chat',
  portfolio: 'Portfolio',
  api: 'API',
  earn: 'Earn',
};

export const TopBar = () => {
  const tab = useUiStore((s) => s.activeTab);
  const okb = useWalletStore((s) => s.okb);
  const usdt = useWalletStore((s) => s.usdt);

  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between border-b border-[#F0F0F0] bg-white px-6 md:px-8">
      <h1 className="text-[20px] font-bold text-[#0D0D0D]">{titles[tab]}</h1>

      <div className="flex items-center gap-2">
        <AiBadge />
        <span className="hidden sm:inline-flex h-8 items-center rounded-full bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#6B7280]">
          {okb.toFixed(2)} OKB
        </span>
        <span className="hidden sm:inline-flex h-8 items-center rounded-full bg-[#F5F5F5] px-3 text-[12px] font-medium text-[#6B7280]">
          {usdt.toFixed(0)} USDT
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-[13px] font-bold text-white"
          style={{ borderColor: '#00C853', background: '#1a1a1a' }}
        >
          X
        </div>
      </div>
    </header>
  );
};
