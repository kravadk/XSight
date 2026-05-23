import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-runs `fn`. Awaitable — resolves once the fresh data (or error) is applied. */
  reload: () => Promise<void>;
}

/**
 * Minimal data hook for the X Cup screens — runs `fn`, tracks loading/error, and
 * exposes `reload`. Every screen binds to the real backend through this.
 */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const mounted = useRef(true);
  const callId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (): Promise<void> => {
    // Tag this run; only the latest one is allowed to apply its result, so a
    // slow in-flight request can't overwrite a newer one after deps change.
    const id = ++callId.current;
    setLoading(true);
    setError(null);
    try {
      const d = await run();
      if (mounted.current && id === callId.current) {
        setData(d);
        setLoading(false);
      }
    } catch (e) {
      if (mounted.current && id === callId.current) {
        setError(e instanceof Error ? e.message : 'request failed');
        setLoading(false);
      }
    }
  }, [run]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
