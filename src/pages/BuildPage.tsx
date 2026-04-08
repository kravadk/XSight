import { Terminal, Globe, Shield, Database, ExternalLink, Copy } from 'lucide-react';
import { CodeBlock } from '../components/common/CodeBlock';
import { X402_ENDPOINTS } from '../config/endpoints';
import { toast } from '../store/toastStore';

const BASE_URL = typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : '/api/v1';

const SNIPPETS: { id: string; title: string; lang: string; code: string }[] = [
  {
    id: 'curl',
    title: '1. Quick test (curl + dev bypass)',
    lang: 'bash',
    code: `curl -X GET "${BASE_URL}/market-summary" \\
  -H "Content-Type: application/json" \\
  -H "X-PAYMENT: dev-bypass"`,
  },
  {
    id: 'fetch',
    title: '2. Browser / Node fetch',
    lang: 'typescript',
    code: `const res = await fetch("${BASE_URL}/token-analysis?token=OKB", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "X-PAYMENT": "dev-bypass", // dev only — remove in prod, send signed receipt instead
  },
});
const data = await res.json();
console.log(data.summary, data.risk);`,
  },
  {
    id: 'viem',
    title: '3. Pay-per-call with viem (production)',
    lang: 'typescript',
    code: `import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { xLayer } from "viem/chains";

// 1. First request returns 402 with payment receipt schema
const probe = await fetch("${BASE_URL}/trading-signals");
const { receipt } = await probe.json();

// 2. Sign the receipt with your wallet
const account = privateKeyToAccount(process.env.PRIVATE_KEY as \`0x\${string}\`);
const client = createWalletClient({ account, chain: xLayer, transport: http() });
const signature = await client.signTypedData(receipt.eip712);

// 3. Retry with X-Payment header
const res = await fetch("${BASE_URL}/trading-signals", {
  headers: { "X-Payment": signature },
});
const signals = await res.json();`,
  },
  {
    id: 'python',
    title: '4. Python (requests)',
    lang: 'python',
    code: `import requests

resp = requests.get(
    "${BASE_URL}/portfolio-advice",
    params={"address": "0xYOUR_ADDRESS"},
    headers={"X-PAYMENT": "dev-bypass"},
)
print(resp.json()["advice"])`,
  },
  {
    id: 'webhook',
    title: '5. Webhook handler (Express)',
    lang: 'typescript',
    code: `import express from "express";
const app = express();

app.post("/xsight-webhook", express.json(), (req, res) => {
  const { event, payload } = req.body;
  if (event === "swap.confirmed") {
    console.log("tx:", payload.txHash);
  }
  res.json({ ok: true });
});`,
  },
];

const CONTRACTS: { name: string; address: string; description: string }[] = [
  {
    name: 'OnchainOS Router',
    address: '0x000000000000000000000000000000000000DEAD',
    description: 'Aggregator contract used by the swap service',
  },
  {
    name: 'OKB',
    address: '0xe538905cf8410324e03A5A23C1c177a474D59b2b',
    description: 'X Layer native OKB token',
  },
  {
    name: 'USDT',
    address: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d',
    description: 'Tether USD on X Layer',
  },
];

export function BuildPage() {
  const copyAddr = (addr: string) => {
    void navigator.clipboard.writeText(addr).then(
      () => toast.success('Address copied'),
      () => toast.error('Copy failed'),
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-10">
      {/* Hero */}
      <div className="bg-[rgba(191,255,0,0.04)] rounded-2xl border border-[rgba(191,255,0,0.15)] p-6 border-l-[3px] border-l-[#BFFF00]">
        <h1 className="text-2xl font-bold text-[#F5F5F5] mb-2">Build with XSight</h1>
        <p className="text-[#A3A3A3] text-sm mb-4 max-w-2xl">
          Integrate XSight's AI trading primitives into your app via the x402 paid API. Below are
          drop-in code examples and the live endpoint reference.
        </p>
        <div className="flex items-center gap-2 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 w-fit">
          <Terminal className="w-4 h-4 text-[#666]" />
          <code className="text-xs font-mono text-[#A3A3A3]">{BASE_URL}</code>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Endpoint reference table */}
        <div>
          <h2 className="text-base font-bold text-[#F5F5F5] mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#BFFF00]" />
            Endpoint Reference
          </h2>
          <div className="bg-[#161616] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-[#0A0A0A]">
                <tr className="text-left text-[#666]">
                  <th className="px-4 py-2 text-micro">Method</th>
                  <th className="px-4 py-2 text-micro">Path</th>
                  <th className="px-4 py-2 text-micro">Price</th>
                </tr>
              </thead>
              <tbody>
                {X402_ENDPOINTS.map((ep) => (
                  <tr
                    key={ep.path}
                    className="border-t border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ep.method === 'GET' ? 'bg-[rgba(59,130,246,0.1)] text-blue-400' : 'bg-[rgba(34,197,94,0.1)] text-green-400'}`}
                      >
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#F5F5F5]">{ep.path}</td>
                    <td className="px-4 py-3 font-mono text-[#BFFF00] tabular">
                      ${ep.price.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Contracts */}
          <h2 className="text-base font-bold text-[#F5F5F5] mb-3 mt-6 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#BFFF00]" />
            On-chain Contracts
          </h2>
          <div className="flex flex-col gap-2">
            {CONTRACTS.map((c) => (
              <div
                key={c.address}
                className="bg-[#161616] border border-[rgba(255,255,255,0.06)] rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#F5F5F5]">{c.name}</div>
                  <div className="text-[10px] text-[#666]">{c.description}</div>
                  <div className="text-[10px] font-mono text-[#A3A3A3] truncate mt-0.5">
                    {c.address}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyAddr(c.address)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-[#666] hover:text-[#F5F5F5]"
                    title="Copy address"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <a
                    href={`https://www.oklink.com/xlayer/address/${c.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-[#666] hover:text-[#F5F5F5]"
                    title="Open explorer"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Code snippets */}
        <div>
          <h2 className="text-base font-bold text-[#F5F5F5] mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#BFFF00]" />
            Code Examples
          </h2>
          <div className="flex flex-col gap-4">
            {SNIPPETS.map((snippet) => (
              <div key={snippet.id}>
                <div className="text-[11px] text-[#A3A3A3] mb-1.5 font-semibold">{snippet.title}</div>
                <CodeBlock code={snippet.code} language={snippet.lang} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
