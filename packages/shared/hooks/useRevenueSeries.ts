import { useMemo } from 'react';
import { useApiStore } from '@shared/store/apiStore';

/**
 * Bucket the x402-log paid calls into the last N hours and return revenue
 * (USDT) per hour as a numeric series suitable for a sparkline / area chart.
 */
export function useRevenueSeries(hours = 24): number[] {
  const calls = useApiStore((s) => s.recentCalls);
  return useMemo(() => {
    const buckets = new Array(hours).fill(0);
    const now = Date.now();
    const bucketMs = 3600 * 1000;
    for (const c of calls) {
      if (c.status !== 'paid') continue;
      const ageH = Math.floor((now - c.timestamp) / bucketMs);
      if (ageH < 0 || ageH >= hours) continue;
      buckets[hours - 1 - ageH] += c.amount;
    }
    return buckets;
  }, [calls, hours]);
}

/**
 * Cumulative revenue series (for "growing" sparklines).
 */
export function useRevenueCumulative(hours = 24): number[] {
  const series = useRevenueSeries(hours);
  let acc = 0;
  return series.map((v) => (acc += v));
}
