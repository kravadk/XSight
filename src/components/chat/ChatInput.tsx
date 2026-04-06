import { useState, type KeyboardEvent } from 'react';
import { useChat } from '../../hooks/useChat';
import { useChatStore } from '../../store/chatStore';

export const ChatInput = () => {
  const [value, setValue] = useState('');
  const { send } = useChat();
  const typing = useChatStore((s) => s.typing);

  const submit = () => {
    if (!value.trim() || typing) return;
    send(value);
    setValue('');
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-[#F0F0F0] bg-white px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask XSight anything..."
          rows={1}
          disabled={typing}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[12px] border border-[#F0F0F0] bg-[#FAFAFA] px-4 py-3 text-[14px] outline-none placeholder:text-[#9CA3AF] focus:border-[#0D0D0D]"
        />
        <button
          onClick={submit}
          disabled={typing || !value.trim()}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-black text-white transition-opacity disabled:opacity-40"
          aria-label="Send"
        >
          {typing ? (
            <span className="flex gap-0.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12L19 12M19 12L12 5M19 12L12 19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
