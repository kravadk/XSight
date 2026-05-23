import { useMemo, useState } from 'react';
import { ArrowRight, Copy, Check } from 'lucide-react';
import { TerminalLog, type LogLine } from '@shared/common/TerminalLog';
import { toast } from '@shared/store/toastStore';
import { cn } from '@shared/utils/format';
import { InlineAlert } from '@shared/common/InlineAlert';
import { StatusPill } from '@shared/common/StatusPill';
import { X402PayAndCall } from './X402PayAndCall';

type Lang = 'curl' | 'fetch' | 'python';

interface ParamSpec {
  name: string;
  label: string;
  placeholder: string;
  default: string;
}

interface Props {
  method: 'GET' | 'POST';
  path: string;
  price: number;
  description: string;
  params?: ParamSpec[];
}

const BASE_URL =
  typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : '/api/v1';

function buildQuery(params: ParamSpec[], values: Record<string, string>): string {
  const pairs = params
    .map((p) => [p.name, values[p.name] ?? p.default] as const)
    .filter(([, v]) => v && v.length > 0)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
}

function snippet(lang: Lang, method: string, fullUrl: string): string {
  if (lang === 'curl') {
    return `curl -X ${method} "${fullUrl}" \\\n  -H "X-PAYMENT: <verified-xlayer-payment-proof>"`;
  }
  if (lang === 'fetch') {
    return `const res = await fetch("${fullUrl}", {
  method: "${method}",
  headers: { "X-PAYMENT": paymentProof },
});
const data = await res.json();
console.log(data);`;
  }
  return `import requests

resp = requests.${method.toLowerCase()}(
    "${fullUrl}",
    headers={"X-PAYMENT": payment_proof},
)
print(resp.json())`;
}

export function EndpointCard({ method, path, price, description, params = [] }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(params.map((p) => [p.name, p.default])),
  );
  const [lang, setLang] = useState<Lang>('curl');
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [probing, setProbing] = useState(false);
  const [log, setLog] = useState<LogLine[] | null>(null);

  const fullUrl = useMemo(() => `${BASE_URL}${path}${buildQuery(params, values)}`, [path, params, values]);
  const relativePath = useMemo(() => `${path}${buildQuery(params, values)}`, [path, params, values]);
  const code = useMemo(() => snippet(lang, method, fullUrl), [lang, method, fullUrl]);
  const paymentRequired = log?.some((line) => line.text.includes('< 402')) ?? false;
  const supportsWalletPayment =
    method === 'GET' &&
    ['/cup/ai-edge', '/cup/fair-odds', '/cup/settlement-check', '/cup/fan-score'].includes(path);

  const copy = (txt: string) => {
    void navigator.clipboard.writeText(txt).then(
      () => {
        setCopied(true);
        toast.success('Copied');
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => toast.error('Copy failed'),
    );
  };

  /** Fire without any payment header to demonstrate the 402 gate. */
  const probe402 = async () => {
    setProbing(true);
    const lines: LogLine[] = [
      { ts: Date.now(), prefix: '$', text: `${method} ${path}${buildQuery(params, values)}`, level: 'cmd' },
      { ts: Date.now(), text: '> (no X-PAYMENT header)', level: 'info' },
    ];
    setLog([...lines]);
    try {
      const t0 = performance.now();
      const res = await fetch(`/api/v1${path}${buildQuery(params, values)}`, { method });
      const dt = Math.round(performance.now() - t0);
      const text = await res.text();
      lines.push({
        ts: Date.now(),
        text: `< ${res.status} ${res.statusText} (${dt}ms)`,
        level: res.status === 402 ? 'error' : 'success',
      });
      let pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch { /* */ }
      lines.push({ ts: Date.now(), text: pretty.slice(0, 1000), level: 'info' });
      setLog([...lines]);
    } catch (err) {
      lines.push({ ts: Date.now(), text: `! ${err instanceof Error ? err.message : 'failed'}`, level: 'error' });
      setLog([...lines]);
    } finally {
      setProbing(false);
    }
  };

  const run = async () => {
    setRunning(true);
    const lines: LogLine[] = [
      { ts: Date.now(), prefix: '$', text: `${method} ${path}${buildQuery(params, values)}`, level: 'cmd' },
      { ts: Date.now(), text: '> X-PAYMENT: dev-bypass (development-only)', level: 'info' },
    ];
    setLog([...lines]);
    try {
      const t0 = performance.now();
      const res = await fetch(`/api/v1${path}${buildQuery(params, values)}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-PAYMENT': 'dev-bypass' },
      });
      const dt = Math.round(performance.now() - t0);
      const text = await res.text();
      lines.push({
        ts: Date.now(),
        text: `< ${res.status} ${res.statusText} (${dt}ms)`,
        level: res.ok ? 'success' : 'error',
      });
      // pretty-print JSON if possible
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* */
      }
      lines.push({ ts: Date.now(), text: pretty.slice(0, 1500), level: 'info' });
      setLog([...lines]);
    } catch (err) {
      lines.push({
        ts: Date.now(),
        text: `! ${err instanceof Error ? err.message : 'request failed'}`,
        level: 'error',
      });
      setLog([...lines]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#151515] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(191,255,0,0.18)] md:p-5">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <StatusPill tone={method === 'GET' ? 'blue' : 'green'}>{method}</StatusPill>
          <code className="break-all text-sm font-mono text-[#F5F5F5]">{path}</code>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#BFFF00] font-mono text-xs tabular">${price.toFixed(2)}/call</span>
          <div className="w-1.5 h-1.5 rounded-full bg-[#BFFF00]" />
        </div>
      </div>

      <p className="text-xs leading-relaxed text-[#D1D5DB]">{description}</p>
      <InlineAlert
        tone="info"
        title="Production payment required"
        body="Snippets use a verified X Layer payment proof. The in-card Send request uses dev-bypass only while running this local development build."
      />

      {params.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {params.map((p) => (
            <div key={p.name} className="flex items-center gap-2">
              <label className="text-[10px] uppercase tracking-wider text-[#9CA3AF] w-16 shrink-0">
                {p.label}
              </label>
              <input
                type="text"
                value={values[p.name] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [p.name]: e.target.value }))}
                placeholder={p.placeholder}
                className="flex-1 h-8 px-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-lg text-[11px] font-mono text-[#F5F5F5] focus:outline-none focus:border-[rgba(191,255,0,0.3)]"
              />
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] px-2">
          <div className="flex">
            {(['curl', 'fetch', 'python'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  'px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                  lang === l
                    ? 'text-[#BFFF00] border-b border-[#BFFF00]'
                    : 'text-[#9CA3AF] hover:text-[#D1D5DB]',
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={() => copy(code)}
            title="Copy snippet"
            aria-label="Copy snippet"
            className="flex items-center gap-1 text-[10px] text-[#9CA3AF] hover:text-[#F5F5F5] py-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[#22C55E]" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> Copy
              </>
            )}
          </button>
        </div>
        <pre className="max-h-40 overflow-auto px-3 py-2.5 text-[10px] font-mono text-[#D1D5DB] whitespace-pre leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>

      <div className="flex gap-2">
        <button
          onClick={probe402}
          disabled={probing || running}
          title="Send without payment - shows the 402 Payment Required gate"
          className="h-9 px-3 flex items-center gap-1.5 text-[11px] font-bold text-[#EF4444] bg-[rgba(239,68,68,0.08)] hover:bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.2)] rounded-lg transition-colors disabled:opacity-50 shrink-0"
        >
          {probing ? '...' : '402 gate'}
        </button>
        <button
          onClick={run}
          disabled={running || probing}
          className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-bold text-[#0A0A0A] bg-[#BFFF00] hover:bg-[#D4FF33] rounded-lg transition-colors disabled:opacity-60"
        >
          {running ? 'Calling...' : 'Send request'} <ArrowRight className="w-3 h-3" />
        </button>
        <button
          onClick={() => copy(`curl -X ${method} "${fullUrl}" -H "X-PAYMENT: <verified-xlayer-payment-proof>"`)}
          className="h-9 px-3 flex items-center gap-1 text-xs font-bold text-[#A3A3A3] hover:text-[#F5F5F5] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition-colors"
        >
          <Copy className="w-3 h-3" /> curl
        </button>
      </div>

      {supportsWalletPayment && (
        <X402PayAndCall
          compact
          fullPath={relativePath}
          title="Pay & call with wallet"
          description="Send the USDT payment from your connected wallet, then retry this endpoint with a verified X-PAYMENT header."
        />
      )}

      {log && (
        <div className="space-y-3">
          {paymentRequired && (
            <InlineAlert
              tone="warning"
              title="402 Payment Required"
              body="The endpoint is locked until a valid payment proof is provided. Use a real X Layer tx or facilitator receipt in production."
            />
          )}
          <TerminalLog lines={log} maxHeight={220} />
        </div>
      )}
    </div>
  );
}
