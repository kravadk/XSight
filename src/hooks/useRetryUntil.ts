import { useEffect, useRef } from 'react';

/**
 * After `trigger` changes, call `reloadFn` at the configured delays until
 * `predicate()` returns true (or the schedule is exhausted, or the component
 * unmounts). Use it to ride out an indexer lag right after a user-initiated
 * on-chain action — e.g. after a stake lands on chain, the backend's indexer
 * may be 5-15s behind, so a single `reload()` returns nothing; this retries
 * for a minute before giving up.
 *
 * Does NOT fire on first mount — only on subsequent `trigger` changes, so
 * mounting the page does not spam the backend.
 */
export function useRetryUntil(
  trigger: unknown,
  reloadFn: () => Promise<void> | void,
  predicate: () => boolean,
  delaysMs: number[] = [10_000, 20_000, 30_000],
): void {
  const reloadRef = useRef(reloadFn);
  const predicateRef = useRef(predicate);
  const firstRender = useRef(true);

  useEffect(() => {
    reloadRef.current = reloadFn;
  }, [reloadFn]);
  useEffect(() => {
    predicateRef.current = predicate;
  }, [predicate]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    let cancelled = false;
    const run = async () => {
      for (const ms of delaysMs) {
        await new Promise((r) => setTimeout(r, ms));
        if (cancelled || predicateRef.current()) return;
        try {
          await reloadRef.current();
        } catch {
          /* swallow — the next scheduled tick will retry */
        }
        if (cancelled || predicateRef.current()) return;
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
}
