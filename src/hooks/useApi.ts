import { useCallback, useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
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

  const load = useCallback(() => {
    let live = true;
    setLoading(true);
    setError(null);
    run()
      .then((d) => {
        if (live) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (live) {
          setError(e instanceof Error ? e.message : 'request failed');
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [run]);

  useEffect(() => load(), [load]);

  return { data, loading, error, reload: load };
}
