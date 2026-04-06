import { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { EmptyChat } from './EmptyChat';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { QuickActions } from './QuickActions';
import { ChatInput } from './ChatInput';

export const ChatWindow = () => {
  const messages = useChatStore((s) => s.messages);
  const typing = useChatStore((s) => s.typing);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col pb-16 md:pb-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <EmptyChat />
        ) : (
          <div className="mx-auto flex max-w-[900px] flex-col gap-4 px-4 py-6 md:px-8">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {typing && (
              <div className="flex gap-3">
                <div className="mt-1 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#F3F0FF] text-[14px] text-[#7C5CFC]">
                  ✦
                </div>
                <TypingIndicator />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mx-auto w-full max-w-[900px]">
        <QuickActions />
        <ChatInput />
      </div>
    </div>
  );
};
