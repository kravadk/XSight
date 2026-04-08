import { create } from 'zustand';
import type { CardPayload } from '../types/cards';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  cards: CardPayload[];
  createdAt: number;
}

interface ChatState {
  messages: ChatMessage[];
  typing: boolean;
  addMessage: (m: ChatMessage) => void;
  setTyping: (t: boolean) => void;
  replaceMessage: (id: string, m: ChatMessage) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  typing: false,
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setTyping: (t) => set({ typing: t }),
  replaceMessage: (id, m) =>
    set((s) => ({
      messages: s.messages.map((x) => (x.id === id ? m : x)),
    })),
  clear: () => set({ messages: [] }),
}));
