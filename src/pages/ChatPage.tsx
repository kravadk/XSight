import { useEffect, useRef, useState } from 'react';
import { ScrollText, Trash2 } from 'lucide-react';
import { MessageBubble } from '../components/chat/MessageBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { EmptyChat } from '../components/chat/EmptyChat';
import { ChatCard } from '../components/chat/ChatCard';
import { AuditModal } from '../components/chat/AuditModal';
import { useChatStore } from '../store/chatStore';
import { api } from '../api/client';
import { motion } from 'motion/react';

export function ChatPage() {
  const messages = useChatStore((s) => s.messages);
  const typing = useChatStore((s) => s.typing);
  const clear = useChatStore((s) => s.clear);
  const loadMessages = useChatStore((s) => s.loadMessages);

  // Load server-side history on first mount
  useEffect(() => {
    api.chatHistory()
      .then(({ messages: saved }) => { if (saved.length) loadMessages(saved); })
      .catch(() => {});
  }, [loadMessages]);

  const handleClear = () => {
    clear();
    api.clearChatHistory().catch(() => {});
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, typing]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-110px)] max-w-4xl mx-auto w-full">
      {hasMessages && (
        <div className="flex items-center justify-end gap-1 mb-2 px-1">
          <button
            onClick={() => setAuditOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[#A3A3A3] hover:text-[#F5F5F5] text-[10px] font-bold uppercase tracking-wider"
          >
            <ScrollText className="w-3 h-3" /> Audit
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(239,68,68,0.1)] text-[#A3A3A3] hover:text-[#EF4444] text-[10px] font-bold uppercase tracking-wider"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-4 flex flex-col gap-6 px-1">
        {!hasMessages ? (
          <EmptyChat />
        ) : (
          <>
            {messages.map((m) => (
              <MessageBubble key={m.id} isAi={m.role === 'ai'}>
                <div className="flex flex-col gap-3">
                  {m.cards.map((c, i) => (
                    <ChatCard key={i} card={c} />
                  ))}
                </div>
              </MessageBubble>
            ))}
            {typing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-[#A3A3A3] text-xs ml-11"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-pulse [animation-delay:120ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-pulse [animation-delay:240ms]" />
                <span>XSight is thinking...</span>
              </motion.div>
            )}
          </>
        )}
      </div>
      <ChatInput />
      <AuditModal open={auditOpen} onClose={() => setAuditOpen(false)} />
    </div>
  );
}
