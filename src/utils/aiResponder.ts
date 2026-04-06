import { HOLDINGS, POOLS, TOKENS, WALLET } from './mockData';

export type CardPayload =
  | { kind: 'text'; text: string }
  | { kind: 'tokens'; symbols: string[]; intro: string }
  | {
      kind: 'swap';
      fromSymbol: string;
      toSymbol: string;
      fromAmount: number;
      toAmount: number;
    }
  | { kind: 'portfolio'; advice: string }
  | { kind: 'risk'; symbol: string }
  | { kind: 'yield'; names: string[]; intro: string }
  | { kind: 'txPending'; fromSymbol: string; toSymbol: string; fromAmount: number; toAmount: number }
  | { kind: 'txSuccess'; fromSymbol: string; toSymbol: string; fromAmount: number; toAmount: number; hash: string };

const parseSwap = (
  msg: string,
): { from: string; to: string; amount: number } | null => {
  const m = msg.match(/(?:swap|buy|trade)\s*([\d.]+)?\s*([a-z]{3,5})?\s*(?:to|for|into)?\s*([a-z]{3,5})?/i);
  if (!m) return null;
  const amount = m[1] ? parseFloat(m[1]) : 50;
  const from = (m[2] || 'USDT').toUpperCase();
  const to = (m[3] || (from === 'USDT' ? 'OKB' : 'USDT')).toUpperCase();
  if (!TOKENS[from] || !TOKENS[to]) return null;
  return { from, to, amount };
};

export const buildResponse = (userMessage: string): CardPayload[] => {
  const msg = userMessage.toLowerCase().trim();

  if (/trend|hot|pump|happen|top tokens?/.test(msg)) {
    return [
      {
        kind: 'text',
        text: "Here's what's hot on X Layer right now — OKB leads the day with strong volume.",
      },
      { kind: 'tokens', symbols: ['OKB', 'WETH', 'USDC'], intro: '' },
    ];
  }

  if (/portfolio|wallet|balance|holdings/.test(msg)) {
    return [
      {
        kind: 'text',
        text: `Here's your current snapshot on ${WALLET.network}.`,
      },
      {
        kind: 'portfolio',
        advice:
          'Heavy on stablecoins (52%). Consider moving ~20% of USDT into ETH for growth exposure.',
      },
    ];
  }

  const swap = parseSwap(msg);
  if (swap && /swap|buy|trade/.test(msg)) {
    const fromPrice = TOKENS[swap.from]!.price;
    const toPrice = TOKENS[swap.to]!.price;
    const toAmount = +((swap.amount * fromPrice) / toPrice).toFixed(4);
    return [
      {
        kind: 'text',
        text: `Here's the best route I found for ${swap.amount} ${swap.from} → ${swap.to}.`,
      },
      {
        kind: 'swap',
        fromSymbol: swap.from,
        toSymbol: swap.to,
        fromAmount: swap.amount,
        toAmount,
      },
    ];
  }

  if (/safe|risk|scan|honeypot|audit/.test(msg)) {
    const symbol =
      ['OKB', 'USDT', 'WETH', 'USDC'].find((s) => msg.includes(s.toLowerCase())) ||
      'OKB';
    return [
      { kind: 'text', text: `Running a security scan on ${symbol}...` },
      { kind: 'risk', symbol },
    ];
  }

  if (/yield|farm|apy|apr|pool|earn|liquid/.test(msg)) {
    return [
      {
        kind: 'text',
        text: 'I found 3 solid yield pools on X Layer. Ranked by APR:',
      },
      {
        kind: 'yield',
        names: POOLS.map((p) => p.name),
        intro: '',
      },
    ];
  }

  if (/rebalance|suggest|improve|optim/.test(msg)) {
    return [
      { kind: 'text', text: 'Analyzing your allocation and suggesting a rebalance.' },
      {
        kind: 'portfolio',
        advice:
          'Your portfolio is ~52% stablecoins. I recommend converting 70 USDT into WETH to capture ETH upside.',
      },
    ];
  }

  if (/gas/.test(msg)) {
    return [
      {
        kind: 'text',
        text: 'Gas on X Layer is negligible right now — ~0.000042 OKB per swap (< $0.001). Perfect time to trade.',
      },
    ];
  }

  if (/hello|hi |hey|what can/.test(msg)) {
    return [
      {
        kind: 'text',
        text: "Hi! I'm XSight. I can analyze tokens, scan risks, recommend yields, and execute swaps on X Layer. Try asking: \"What's trending?\" or \"Swap 50 USDT to OKB\".",
      },
    ];
  }

  return [
    {
      kind: 'text',
      text: "I can help with trending tokens, portfolio analysis, risk scans, yield farming, and swaps. What would you like to explore?",
    },
  ];
};

export const holdingsSummary = () => HOLDINGS;
