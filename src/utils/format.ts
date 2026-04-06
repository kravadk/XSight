export const formatUsd = (n: number, digits = 2): string =>
  `$${n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;

export const formatNum = (n: number, digits = 2): string =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const formatCompact = (n: number): string => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

export const shortAddress = (addr: string): string =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export const formatPct = (n: number): string =>
  `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

export const randomTxHash = (): string => {
  const chars = '0123456789abcdef';
  let h = '0x';
  for (let i = 0; i < 64; i += 1) {
    h += chars[Math.floor(Math.random() * 16)];
  }
  return h;
};
