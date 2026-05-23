import { Sparkles, Flame, Briefcase, ShieldAlert } from 'lucide-react';
import { useChat } from '@shared/hooks/useChat';
import { HexGrid } from '@shared/common/HexGrid';

export function EmptyChat() {
  const { send } = useChat();
  const pills = [
    { icon: <Flame className="w-4 h-4" />, text: "What's trending?" },
    { icon: <Briefcase className="w-4 h-4" />, text: 'Analyze my portfolio' },
    { icon: <ShieldAlert className="w-4 h-4" />, text: 'Is OKB safe?' },
  ];

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center h-full">
      <HexGrid opacity={0.06} />
      <div className="relative w-16 h-16 rounded-full bg-[rgba(167,139,250,0.08)] flex items-center justify-center mb-6 z-10">
        <Sparkles className="w-8 h-8 text-[#A78BFA]" />
      </div>
      <h1 className="text-3xl font-extrabold text-[#F5F5F5] mb-2 tracking-tight">XSight AI Copilot</h1>
      <p className="text-[#A3A3A3] text-sm mb-2 text-center max-w-md leading-relaxed">
        I analyze X Layer markets, manage your portfolio, and execute trades.
      </p>
      <div className="flex items-center gap-2 mb-8 text-[10px] text-[#666] uppercase tracking-wider">
        <span className="w-1 h-1 rounded-full bg-[#BFFF00]" />
        Connected to backend
        <span>·</span>
        <kbd className="font-mono bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded">⌘K</kbd>
        for command palette
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {pills.map((pill, i) => (
          <button
            key={i}
            onClick={() => void send(pill.text)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[rgba(255,255,255,0.06)] border border-transparent hover:border-[#BFFF00] rounded-full text-sm text-[#F5F5F5] transition-all"
          >
            <span className="text-[#A3A3A3]">{pill.icon}</span>
            {pill.text}
          </button>
        ))}
      </div>
    </div>
  );
}
