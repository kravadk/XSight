import { useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { randomTxHash } from '../utils/format';

let counter = 0;
const nextId = () => {
  counter += 1;
  return `swap-${Date.now()}-${counter}`;
};

export const useMockSwap = () => {
  const addMessage = useChatStore((s) => s.addMessage);

  const execute = useCallback(
    (fromSymbol: string, toSymbol: string, fromAmount: number, toAmount: number) => {
      const pendingId = nextId();
      addMessage({
        id: pendingId,
        role: 'ai',
        cards: [
          { kind: 'txPending', fromSymbol, toSymbol, fromAmount, toAmount },
        ],
        createdAt: Date.now(),
      });
      window.setTimeout(() => {
        addMessage({
          id: nextId(),
          role: 'ai',
          cards: [
            {
              kind: 'txSuccess',
              fromSymbol,
              toSymbol,
              fromAmount,
              toAmount,
              hash: randomTxHash(),
            },
          ],
          createdAt: Date.now(),
        });
      }, 3400);
    },
    [addMessage],
  );

  return { execute };
};
