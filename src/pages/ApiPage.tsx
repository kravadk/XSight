import { Terminal, Copy, ExternalLink } from 'lucide-react';
import { useApiStore } from '../store/apiStore';
import { toast } from '../store/toastStore';
import { RecentCallsTable } from '../components/api/RecentCallsTable';
import { EndpointCard } from '../components/api/EndpointCard';
import { PricingCalculator } from '../components/api/PricingCalculator';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { AppCard, MetricTile } from '../components/common/AppCard';
import { InlineAlert } from '../components/common/InlineAlert';
import { StatusPill } from '../components/common/StatusPill';

const BASE_URL = typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : '/api/v1';

const SAMPLE_TOKEN = '0xe538905cf8410324e03A5A23C1c177a474D59b2b';
const SAMPLE_WALLET = '0x0E437c109A4C1e15172c4dA557E77724D7243F71';

const ENDPOINTS = [
  {
    method: 'GET' as const,
    path: '/market-summary',
    price: 0.01,
    description: 'AI-generated market overview for X Layer tokens — trending list + Claude-written summary.',
  },
  {
    method: 'GET' as const,
    path: '/token-analysis',
    price: 0.05,
    description: 'Deep token analysis with on-chain metrics, risk score and an AI verdict.',
    params: [
      { name: 'token', label: 'token', placeholder: '0x...', default: SAMPLE_TOKEN },
    ],
  },
  {
    method: 'GET' as const,
    path: '/trading-signals',
    price: 0.1,
    description: 'Buy / sell / hold signals across X Layer with confidence scores.',
  },
  {
    method: 'GET' as const,
    path: '/portfolio-advice',
    price: 0.05,
    description: 'AI rebalancing recommendations based on a wallet snapshot.',
    params: [
      { name: 'wallet', label: 'wallet', placeholder: '0x...', default: SAMPLE_WALLET },
    ],
  },
];

export function ApiPage() {
  const totalEarned = useApiStore((s) => s.totalEarned);
  const callsToday = useApiStore((s) => s.callsToday);
  const recentCalls = useApiStore((s) => s.recentCalls);
  const error = useApiStore((s) => s.error);

  const copy = (txt: string, label: string) => {
    void navigator.clipboard.writeText(txt).then(
      () => toast.success(`${label} copied`),
      () => toast.error('Copy failed'),
    );
  };

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto w-full pb-10">
      {/* Compact header — replaces the 4 huge stat cards + ActivityCard */}
      <AppCard>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-lg font-bold text-[#F5F5F5]">x402 API</h1>
              <StatusPill tone="green">USDT paid API</StatusPill>
            </div>
            <div className="flex items-center gap-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-lg px-2.5 py-1.5 w-fit max-w-full">
              <Terminal className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
              <code className="text-[11px] font-mono text-[#D1D5DB] truncate">{BASE_URL}</code>
              <button
                onClick={() => copy(BASE_URL, 'Base URL')}
                className="text-[#9CA3AF] hover:text-[#F5F5F5] shrink-0"
                title="Copy base URL"
              >
                <Copy className="w-3 h-3" />
              </button>
              <a
                href="/api/v1/x402-spec"
                target="_blank"
                rel="noreferrer"
                className="text-[#BFFF00] hover:text-[#D4FF33] shrink-0"
                title="Open x402-spec"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetricTile label="Revenue" value={<AnimatedNumber value={totalEarned} prefix="$" decimals={2} />} tone="lime" />
            <MetricTile label="Calls 24h" value={<AnimatedNumber value={callsToday} decimals={0} />} />
            <MetricTile label="Endpoints" value={ENDPOINTS.length} />
          </div>
        </div>
      </AppCard>

      {error && <InlineAlert tone="error" title="Backend error" body={error} />}

      {/* Endpoint workbench */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-bold text-[#F5F5F5]">Endpoint workbench</h2>
          <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">
            edit params / pick a language / test payment gate
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ENDPOINTS.map((ep) => (
            <EndpointCard key={ep.path} {...ep} />
          ))}
        </div>
      </div>

      <PricingCalculator />

      <RecentCallsTable />

      <div className="text-center text-[10px] text-[#9CA3AF]">
        {recentCalls.length} call(s) in memory / log holds the last 50 events /{' '}
        <a
          href="/api/status/x402-log"
          target="_blank"
          rel="noreferrer"
          className="text-[#BFFF00] hover:text-[#D4FF33]"
        >
          raw JSON
        </a>
      </div>
    </div>
  );
}



