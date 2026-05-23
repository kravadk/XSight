import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  kind: 'info' | 'success' | 'error';
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, kind?: Toast['kind']) => void;
  dismiss: (id: string) => void;
}

let counter = 0;
const nextId = () => {
  counter += 1;
  return `t-${Date.now()}-${counter}`;
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, kind = 'info') => {
    const id = nextId();
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  info: (msg: string) => useToastStore.getState().push(msg, 'info'),
  success: (msg: string) => useToastStore.getState().push(msg, 'success'),
  error: (msg: string) => useToastStore.getState().push(msg, 'error'),
  comingSoon: (feature?: string) =>
    useToastStore.getState().push(feature ? `${feature} — coming soon` : 'Feature coming soon', 'info'),
};
