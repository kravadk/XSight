import { useMemo, useState, useEffect } from 'react';
import { tokenMeta, tokenLogoSources } from '../../config/tokens';
import { cn } from '../../utils/format';

interface Props {
  symbol: string;
  size?: number;
  className?: string;
}

/**
 * Renders a real token logo, trying multiple CDN sources in order:
 *   1. spothq/cryptocurrency-icons via jsDelivr (primary, SVG color icons)
 *   2. CoinGecko CDN (fallback for tokens missing in spothq, e.g. OKB)
 *   3. Colored letter circle (final fallback if all sources fail)
 */
export function TokenIcon({ symbol, size = 24, className }: Props) {
  const meta = useMemo(() => tokenMeta(symbol), [symbol]);
  const sources = useMemo(() => tokenLogoSources(meta), [meta]);
  const [idx, setIdx] = useState(0);

  // Reset to first source whenever symbol changes
  useEffect(() => {
    setIdx(0);
  }, [symbol]);

  const dimensions = { width: size, height: size };
  const fontSize = Math.max(8, Math.round(size * 0.42));

  if (sources.length === 0 || idx >= sources.length) {
    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none',
          className,
        )}
        style={{ ...dimensions, background: meta.color, fontSize }}
      >
        {meta.letter}
      </div>
    );
  }

  return (
    <img
      key={`${symbol}-${idx}`}
      src={sources[idx]}
      alt={meta.symbol}
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setIdx((i) => i + 1)}
      className={cn('rounded-full shrink-0 select-none object-cover bg-[#1A1A1A]', className)}
      style={dimensions}
    />
  );
}
