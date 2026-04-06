import { useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { buildResponse } from '../utils/aiResponder';

let counter = 0;
const nextId = () => {
  counter += 1;
  return `${Date.now()}-${counter}`;
};

export const useChat = () => {
  const addMessage = useChatStore((s) => s.addMessage);
  const setTyping = useChatStore((s) => s.setTyping);

  const send = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      addMessage({
        id: nextId(),
        role: 'user',
        cards: [{ kind: 'text', text }],
        createdAt: Date.now(),
      });
      setTyping(true);
      const delay = 900 + Math.random() * 900;
      window.setTimeout(() => {
        addMessage({
          id: nextId(),
          role: 'ai',
          cards: buildResponse(text),
          createdAt: Date.now(),
        });
        setTyping(false);
      }, delay);
    },
    [addMessage, setTyping],
  );

  return { send };
};
