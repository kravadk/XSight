import { create } from 'zustand';
import { usePrefsStore } from './prefsStore';

export interface Notification {
  id: string;
  kind: 'success' | 'info' | 'error' | 'event';
  title: string;
  body?: string;
  timestamp: number;
  read: boolean;
  link?: string;
}

interface State {
  items: Notification[];
  push: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

let counter = 0;
const nextId = () => `n-${Date.now()}-${++counter}`;

export const useNotificationsStore = create<State>((set) => ({
  items: [],
  push: (n) =>
    set((s) => ({
      items: [
        { id: nextId(), timestamp: Date.now(), read: false, ...n },
        ...s.items,
      ].slice(0, 50),
    })),
  markRead: (id) =>
    set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, read: true } : it)) })),
  markAllRead: () => set((s) => ({ items: s.items.map((it) => ({ ...it, read: true })) })),
  clear: () => set({ items: [] }),
}));

export const notify = {
  success: (title: string, body?: string) =>
    useNotificationsStore.getState().push({ kind: 'success', title, body }),
  info: (title: string, body?: string) =>
    useNotificationsStore.getState().push({ kind: 'info', title, body }),
  error: (title: string, body?: string) =>
    useNotificationsStore.getState().push({ kind: 'error', title, body }),
  event: (title: string, body?: string, link?: string) => {
    // Event notifications are opt-out from Settings — operational toasts
    // (success/error/info) always show, but ambient events can be silenced.
    if (!usePrefsStore.getState().notifyEvents) return;
    useNotificationsStore.getState().push({ kind: 'event', title, body, link });
  },
};
