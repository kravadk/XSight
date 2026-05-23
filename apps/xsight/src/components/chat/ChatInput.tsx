import { Send } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useChat } from '@shared/hooks/useChat';
import { useChatStore } from '@shared/store/chatStore';
import { QUICK_ACTIONS } from '@shared/config/uiCopy';

export function ChatInput() {
  const [value, setValue] = useState('');
  const { send } = useChat();
  const typing = useChatStore((s) => s.typing);

  const handleSend = (text?: string) => {
    const msg = (text ?? value).trim();
    if (!msg || typing) return;
    void send(msg);
    if (text === undefined) setValue('');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="sticky bottom-0 bg-[#0F0F0F] pt-4 pb-2">
      <div className="flex gap-2 mb-3 px-2 overflow-x-auto scrollbar-hide">
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa.label}
            onClick={() => handleSend(qa.message)}
            disabled={typing}
            className="shrink-0 px-3 py-1.5 text-xs font-medium text-[#A3A3A3] bg-[rgba(255,255,255,0.04)] rounded-full hover:text-[#BFFF00] hover:border-[#BFFF00] border border-transparent transition-all disabled:opacity-50"
          >
            {qa.label}
          </button>
        ))}
      </div>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask XSight anything..."
          className="w-full h-14 bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] rounded-2xl pl-5 pr-14 text-[#F5F5F5] placeholder-[#666666] focus:outline-none focus:border-[rgba(191,255,0,0.3)] transition-colors"
        />
        <button
          onClick={() => handleSend()}
          disabled={typing || !value.trim()}
          className="absolute right-2 w-10 h-10 rounded-xl bg-[#BFFF00] flex items-center justify-center text-[#0A0A0A] hover:bg-[#D4FF33] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
