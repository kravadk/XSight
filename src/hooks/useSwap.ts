import { useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { api, ApiError } from '../api/client';
import { tokenMeta } from '../config/tokens';
import { toRawAmount, fromRawAmount } from '../services/okxDex';

let counter = 0;
const nextId = () => {
  counter += 1;
  return `swap-${Date.now()}-${counter}`;
};

export const useSwap = () => {
  const addMessage = useChatStore((s) => s.addMessage);

  /**
   * Execute a swap via the backend (which uses okx-dex-sdk internally).
   *
   * @param fromSymbol  Token being sold (e.g. "USDT")
   * @param toSymbol    Token being bought (e.g. "OKB")
   * @param fromAmount  Human-readable sell amount
   * @param toAmount    Expected receive amount — use the real OKX DEX quote value
   *                    from SwapPreviewCard so the pending/success cards show
   *                    accurate figures.
   */
  const execute = useCallback(
    async (fromSymbol: string, toSymbol: string, fromAmount: number, toAmount: number) => {
      addMessage({
        id: nextId(),
        role: 'ai',
        cards: [{ kind: 'txPending', fromSymbol, toSymbol, fromAmount, toAmount }],
        createdAt: Date.now(),
      });

      const fromDecimals = tokenMeta(fromSymbol).decimals;
      const toDecimals   = tokenMeta(toSymbol).decimals;
      const rawAmount    = toRawAmount(fromAmount, fromDecimals);

      try {
        const result = await api.swap(fromSymbol, toSymbol, rawAmount);
        if (!result.txHash) {
          throw new Error('Swap returned no transaction hash');
        }

        // Prefer on-chain confirmed amount; fall back to the quote value
        const confirmedToAmount =
          result.toAmount > 0
            ? fromRawAmount(String(result.toAmount), toDecimals)
            : toAmount;

        addMessage({
          id: nextId(),
          role: 'ai',
          cards: [
            {
              kind: 'txSuccess',
              fromSymbol,
              toSymbol,
              fromAmount,
              toAmount: confirmedToAmount,
              hash: result.txHash,
            },
          ],
          createdAt: Date.now(),
        });
      } catch (err) {
        const detail =
          err instanceof ApiError && err.detail
            ? err.detail
            : err instanceof Error
              ? err.message
              : 'unknown error';
        addMessage({
          id: nextId(),
          role: 'ai',
          cards: [{ kind: 'error', text: `Swap failed: ${detail}` }],
          createdAt: Date.now(),
        });
      }
    },
    [addMessage],
  );

  return { execute };
};
