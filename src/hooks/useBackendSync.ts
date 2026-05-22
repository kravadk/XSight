import { useEffect, useRef } from 'react';
import { api, ApiError } from '../api/client';
import { useApiStore } from '../store/apiStore';
import { useWalletStore } from '../store/walletStore';
import { useSyncStore } from '../store/syncStore';
import { useUiStore } from '../store/uiStore';
import { notify } from '../store/notificationsStore';

const POLL_MS = 15_000;
const MAX_BACKOFF_MS = 120_000; // 2 minutes max between retries when backend is down

export const useBackendSync = () => {
  const setPortfolio = useWalletStore((s) => s.setPortfolio);
  const setWalletLoading = useWalletStore((s) => s.setLoading);
  const setWalletError = useWalletStore((s) => s.setError);
  const setRecentCalls = useApiStore((s) => s.setRecentCalls);
  const setEconomy = useApiStore((s) => s.setEconomy);
  const setStats = useApiStore((s) => s.setStats);
  const setApiLoading = useApiStore((s) => s.setLoading);
  const setApiError = useApiStore((s) => s.setError);
  const setLastSync = useSyncStore((s) => s.setLastSync);
  const setOnline = useSyncStore((s) => s.setOnline);
  // The agent portfolio belongs to the XSight copilot surface. On X Cup the wallet
  // must reflect the USER's own connection, so we never auto-populate it there.
  const product = useUiStore((s) => s.product);

  const seenCallIds = useRef<Set<string>>(new Set());
  const isFirstRun = useRef(true);
  const tickInProgress = useRef(false);
  const consecutiveFailures = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const syncPortfolio = async () => {
      setWalletLoading(true);
      try {
        const p = await api.portfolio();
        if (cancelled) return;
        setPortfolio({
          address: p.address,
          network: p.network,
          tokens: p.tokens,
          totalUsd: p.totalUsd,
        });
      } catch (err) {
        if (cancelled) return;
        const detail =
          err instanceof ApiError && err.detail
            ? err.detail
            : err instanceof Error
              ? err.message
              : 'unknown error';
        setWalletError(detail);
      }
    };

    const syncApi = async () => {
      setApiLoading(true);
      try {
        const log = await api.x402Log();
        if (cancelled) return;
        setRecentCalls(log.calls);

        // emit notifications for new calls observed since last poll (skip first run)
        if (!isFirstRun.current) {
          for (const c of log.calls) {
            const id = `${c.timestamp}-${c.endpoint}-${c.caller}`;
            if (seenCallIds.current.has(id)) continue;
            seenCallIds.current.add(id);
            if (c.status === 'paid') {
              notify.event(
                'x402 payment received',
                `${c.endpoint} · ${c.amount} ${c.asset}`,
              );
            }
          }
        } else {
          for (const c of log.calls) {
            seenCallIds.current.add(`${c.timestamp}-${c.endpoint}-${c.caller}`);
          }
        }

        const paid = log.calls.filter((c) => c.status === 'paid');
        const totalEarned = paid.reduce((sum, c) => sum + c.amount, 0);
        const dayAgo = Date.now() - 24 * 3600 * 1000;
        const todayCalls = paid.filter((c) => c.timestamp >= dayAgo);
        const todayEarned = todayCalls.reduce((sum, c) => sum + c.amount, 0);
        setStats({ totalEarned, today: todayEarned, callsToday: todayCalls.length });
        setApiLoading(false);
      } catch (err) {
        if (cancelled) return;
        const detail =
          err instanceof ApiError && err.detail
            ? err.detail
            : err instanceof Error
              ? err.message
              : 'unknown error';
        setApiError(detail);
      }
    };

    const syncEconomy = async () => {
      try {
        const e = await api.economy();
        if (cancelled) return;
        setEconomy(e);
      } catch {
        /* */
      }
    };

    const tick = async () => {
      if (tickInProgress.current) return; // prevent parallel ticks
      tickInProgress.current = true;
      try {
        const jobs = product === 'xsight'
          ? [syncPortfolio(), syncApi(), syncEconomy()]
          : [syncApi(), syncEconomy()];
        const results = await Promise.allSettled(jobs);
        if (cancelled) return;
        const anyFulfilled = results.some((r) => r.status === 'fulfilled');
        if (anyFulfilled) {
          consecutiveFailures.current = 0;
          setLastSync(Date.now());
          setOnline(true);
        } else {
          consecutiveFailures.current += 1;
          setOnline(false);
        }
        isFirstRun.current = false;
      } finally {
        tickInProgress.current = false;
      }
    };

    // Exponential backoff: 15s, 30s, 60s, 120s max when backend is down
    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const backoffMs = Math.min(POLL_MS * Math.pow(2, consecutiveFailures.current), MAX_BACKOFF_MS);
      timeoutId = setTimeout(() => {
        if (!cancelled) { void tick().then(schedule); }
      }, backoffMs);
    };

    void tick().then(schedule);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    setPortfolio,
    setWalletLoading,
    setWalletError,
    setRecentCalls,
    setEconomy,
    setStats,
    setApiLoading,
    setApiError,
    setLastSync,
    setOnline,
    product,
  ]);
};
