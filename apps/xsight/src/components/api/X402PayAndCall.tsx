import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Wallet, Zap } from 'lucide-react';
import { api, ApiError, type X402SpecDto } from '@shared/api/client';
import { ActionButton } from '@shared/common/ActionButton';
import { CodeBlock } from '@shared/common/CodeBlock';
import { CopyableHash, ScanLink } from '@shared/common/CopyableHash';
import { InlineAlert } from '@shared/common/InlineAlert';
import { StatusPill } from '@shared/common/StatusPill';
import { useWalletStore } from '@shared/store/walletStore';
import { toast } from '@shared/store/toastStore';
import { cn } from '@shared/utils/format';

type PayState = 'idle' | 'loading-spec' | 'switching-network' | 'checking-balance' | 'awaiting-signature' | 'waiting-confirmation' | 'calling-api' | 'success' | 'error';

interface Props {
  fullPath: string;
  method?: 'GET';
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
}

interface WalletProvider {
  request: (req: { method: string; params?: unknown[] }) => Promise<unknown>;
}

const X_LAYER_CHAIN_ID = 196;
const X_LAYER_CHAIN_ID_HEX = '0xc4';
const X_LAYER_EXPLORER = 'https://www.okx.com/web3/explorer/xlayer';

function getWalletProvider(): WalletProvider | null {
  const w = window as unknown as { ethereum?: WalletProvider; okxwallet?: WalletProvider };
  return w.okxwallet ?? w.ethereum ?? null;
}

function endpointBase(fullPath: string) {
  return fullPath.split('?')[0];
}

function hasPlaceholder(value: string) {
  return value.includes('<') || value.includes('>');
}

function parseUnits(value: string, decimals: number): bigint {
  const [wholeRaw, fractionRaw = ''] = value.split('.');
  const whole = wholeRaw || '0';
  const fraction = fractionRaw.padEnd(decimals, '0').slice(0, decimals);
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fractionRaw) || fractionRaw.length > decimals) {
    throw new Error(`Invalid ${decimals}-decimal amount: ${value}`);
  }
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction || '0');
}

function encodeErc20Transfer(to: string, amount: bigint) {
  const cleanTo = to.toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{40}$/.test(cleanTo)) throw new Error('Invalid payment recipient address');
  const toArg = cleanTo.padStart(64, '0');
  const amountArg = amount.toString(16).padStart(64, '0');
  return `0xa9059cbb${toArg}${amountArg}`;
}

function encodeErc20BalanceOf(owner: string) {
  const cleanOwner = owner.toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{40}$/.test(cleanOwner)) throw new Error('Invalid wallet address for balance check');
  return `0x70a08231${cleanOwner.padStart(64, '0')}`;
}

function parseHexQuantity(value: unknown): bigint {
  const raw = String(value ?? '0x0');
  if (!/^0x[0-9a-fA-F]*$/.test(raw)) return 0n;
  return BigInt(raw || '0x0');
}

function formatUnits(value: bigint, decimals: number, precision = 6) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  const fractionText = fraction.toString().padStart(decimals, '0').slice(0, precision).replace(/0+$/, '');
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

function buildPaymentHeader(input: { payTo: string; amount: string; asset: string; network: string; txHash: string; payer: string }) {
  return btoa(JSON.stringify(input));
}

async function currentChainId(provider: WalletProvider): Promise<number> {
  const chainId = await provider.request({ method: 'eth_chainId' });
  return Number.parseInt(String(chainId), 16);
}

async function switchToXLayer(provider: WalletProvider) {
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: X_LAYER_CHAIN_ID_HEX }] });
  } catch {
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: X_LAYER_CHAIN_ID_HEX,
        chainName: 'X Layer Mainnet',
        nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
        rpcUrls: ['https://rpc.xlayer.tech', 'https://xlayerrpc.okx.com'],
        blockExplorerUrls: [X_LAYER_EXPLORER],
      }],
    });
  }
}

async function waitForReceipt(provider: WalletProvider, txHash: string) {
  const started = Date.now();
  while (Date.now() - started < 45_000) {
    const receipt = await provider.request({ method: 'eth_getTransactionReceipt', params: [txHash] });
    if (receipt && typeof receipt === 'object') return receipt;
    await new Promise((resolve) => window.setTimeout(resolve, 2500));
  }
  throw new Error('Payment transaction was submitted, but confirmation timed out. Retry the API call after the tx confirms.');
}

async function preflightPayment({
  provider,
  payer,
  assetAddress,
  amountUnits,
  decimals,
  data,
}: {
  provider: WalletProvider;
  payer: string;
  assetAddress: string;
  amountUnits: bigint;
  decimals: number;
  data: string;
}) {
  const [nativeBalanceRaw, tokenBalanceRaw] = await Promise.all([
    provider.request({ method: 'eth_getBalance', params: [payer, 'latest'] }),
    provider.request({
      method: 'eth_call',
      params: [{
        to: assetAddress,
        data: encodeErc20BalanceOf(payer),
      }, 'latest'],
    }),
  ]);
  const nativeBalance = parseHexQuantity(nativeBalanceRaw);
  const tokenBalance = parseHexQuantity(tokenBalanceRaw);

  if (tokenBalance < amountUnits) {
    throw new Error(`Insufficient USDT on X Layer. Required ${formatUnits(amountUnits, decimals)} USDT, wallet has ${formatUnits(tokenBalance, decimals)} USDT.`);
  }
  if (nativeBalance <= 0n) {
    throw new Error('Insufficient OKB on X Layer for network fee. Add a small OKB balance to the connected wallet, then retry Pay & Call.');
  }

  try {
    await provider.request({
      method: 'eth_estimateGas',
      params: [{
        from: payer,
        to: assetAddress,
        data,
        value: '0x0',
      }],
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Wallet cannot fund this USDT transfer yet. Check OKB gas and USDT balance on X Layer. Provider detail: ${detail}`);
  }
}

export function X402PayAndCall({
  fullPath,
  method = 'GET',
  title = 'Live x402 Pay & Call',
  description = 'Builders and agents pay per verified intelligence call. Fan users do not pay for every screen; this proves infrastructure monetization.',
  className,
  compact = false,
}: Props) {
  const connected = useWalletStore((s) => s.connected);
  const walletAddress = useWalletStore((s) => s.address);
  const [spec, setSpec] = useState<X402SpecDto | null>(null);
  const [state, setState] = useState<PayState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [response, setResponse] = useState<unknown>(null);

  const endpoint = useMemo(() => {
    const base = endpointBase(fullPath);
    return spec?.endpoints.find((item) => item.method === method && item.path === `/api/v1${base}`);
  }, [fullPath, method, spec]);

  const invalidInput = hasPlaceholder(fullPath);
  const amount = endpoint?.priceUsdt ?? null;
  const canPay = connected && !invalidInput && state !== 'loading-spec' && state !== 'switching-network' && state !== 'awaiting-signature' && state !== 'waiting-confirmation' && state !== 'calling-api';
  const busy = state !== 'idle' && state !== 'success' && state !== 'error';

  useEffect(() => {
    let alive = true;
    api.x402Spec()
      .then((next) => {
        if (alive) setSpec(next);
      })
      .catch(() => {
        /* Pay click will surface the actionable error. */
      });
    return () => { alive = false; };
  }, []);

  async function ensureSpec() {
    if (spec) return spec;
    setState('loading-spec');
    const next = await api.x402Spec();
    setSpec(next);
    return next;
  }

  async function payAndCall() {
    setError(null);
    setResponse(null);
    setTxHash(null);

    try {
      if (method !== 'GET') throw new Error('Pay & Call supports GET endpoints in this pass.');
      if (invalidInput) throw new Error('Replace placeholder params with a real matchId or wallet before paying.');
      const provider = getWalletProvider();
      if (!provider || !connected) {
        window.dispatchEvent(new CustomEvent('xsight:open-wallet'));
        throw new Error('Connect OKX Wallet or MetaMask before paying.');
      }

      const currentSpec = await ensureSpec();
      const base = endpointBase(fullPath);
      const currentEndpoint = currentSpec.endpoints.find((item) => item.method === method && item.path === `/api/v1${base}`);
      if (!currentEndpoint) throw new Error(`Endpoint ${base} is not listed in x402 discovery.`);
      if (!/^0x[0-9a-fA-F]{40}$/.test(currentSpec.assetAddress)) throw new Error('x402 asset address is not configured.');
      if (!/^0x[0-9a-fA-F]{40}$/.test(currentSpec.payTo)) throw new Error('x402 payout address is not configured.');

      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
      const payer = accounts?.[0] ?? walletAddress;
      if (!/^0x[0-9a-fA-F]{40}$/.test(payer)) throw new Error('Wallet did not return a valid payer address.');

      if (await currentChainId(provider) !== X_LAYER_CHAIN_ID) {
        setState('switching-network');
        await switchToXLayer(provider);
      }
      if (await currentChainId(provider) !== X_LAYER_CHAIN_ID) {
        throw new Error('Wallet is not on X Layer Mainnet.');
      }

      const amountUnits = parseUnits(currentEndpoint.priceUsdt, currentSpec.decimals);
      const data = encodeErc20Transfer(currentSpec.payTo, amountUnits);

      setState('checking-balance');
      await preflightPayment({
        provider,
        payer,
        assetAddress: currentSpec.assetAddress,
        amountUnits,
        decimals: currentSpec.decimals,
        data,
      });

      setState('awaiting-signature');
      const sentHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: payer,
          to: currentSpec.assetAddress,
          data,
          value: '0x0',
        }],
      }) as string;
      if (!/^0x[0-9a-fA-F]{64}$/.test(sentHash)) throw new Error('Wallet did not return a valid tx hash.');
      setTxHash(sentHash);

      setState('waiting-confirmation');
      await waitForReceipt(provider, sentHash);

      setState('calling-api');
      const paymentHeader = buildPaymentHeader({
        payTo: currentSpec.payTo,
        amount: currentEndpoint.priceUsdt,
        asset: currentSpec.asset,
        network: currentSpec.network,
        txHash: sentHash,
        payer,
      });
      const res = await fetch(`/api/v1${fullPath}`, {
        method,
        headers: { 'X-PAYMENT': paymentHeader },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const detail = body?.detail ?? body?.error ?? `Paid API returned ${res.status}`;
        throw new Error(detail);
      }
      setResponse(body);
      setState('success');
      toast.success('Paid Cup intelligence returned');
    } catch (err) {
      const message = err instanceof ApiError && err.detail ? err.detail : err instanceof Error ? err.message : 'Pay & Call failed';
      setError(message);
      setState('error');
      toast.error(message);
    }
  }

  const stateLabel =
    state === 'loading-spec' ? 'loading spec'
      : state === 'switching-network' ? 'switching network'
        : state === 'checking-balance' ? 'checking balances'
        : state === 'awaiting-signature' ? 'confirm in wallet'
          : state === 'waiting-confirmation' ? 'waiting tx'
            : state === 'calling-api' ? 'verifying payment'
              : state === 'success' ? 'paid'
                : state === 'error' ? 'blocked'
                  : 'ready';

  return (
    <section className={cn('rounded-2xl border border-[rgba(191,255,0,0.18)] bg-[#101409] p-4', className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#BFFF00]" />
            <h3 className="text-sm font-extrabold text-[#F5F5F5]">{title}</h3>
          </div>
          <p className="text-[11px] leading-relaxed text-[#D1D5DB]">{description}</p>
        </div>
        <StatusPill tone={state === 'success' ? 'green' : state === 'error' ? 'red' : 'lime'}>{stateLabel}</StatusPill>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0B0B0B] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">Endpoint</div>
          <div className="mt-1 break-all font-mono text-[11px] text-[#F5F5F5]">GET /api/v1{fullPath}</div>
        </div>
        <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0B0B0B] p-3">
          <div className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">Payment</div>
          <div className="mt-1 text-xs font-bold text-[#BFFF00]">
            {amount ?? 'spec required'} {spec?.asset ?? 'USDT'} on {spec?.chainName ?? 'X Layer'}
          </div>
        </div>
      </div>

      {spec && (
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <CopyableHash value={spec.payTo} label="x402 payTo" className="w-full" />
          <CopyableHash value={spec.assetAddress} label={`${spec.asset} contract`} className="w-full" />
        </div>
      )}

      {invalidInput && (
        <InlineAlert
          className="mt-3"
          tone="warning"
          title="Real input required"
          body="This endpoint still contains a placeholder. Select a real CupHub match or enter a real wallet before paying."
        />
      )}
      {!connected && (
        <InlineAlert
          className="mt-3"
          tone="info"
          title="Wallet required"
          body="The payer is an external builder, app, or agent wallet. Connect OKX Wallet or MetaMask to send the USDT transfer."
        />
      )}
      {connected && spec && amount && (
        <InlineAlert
          className="mt-3"
          tone="info"
          title="Before wallet confirmation"
          body={`This sends ${amount} ${spec.asset} on X Layer and also requires a small OKB balance for network gas in the connected wallet. XSight does not fund this payment; the external caller pays for the verified API call.`}
        />
      )}
      {error && <InlineAlert className="mt-3" tone="error" title="Pay & Call blocked" body={error} />}
      {txHash && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ScanLink href={`${X_LAYER_EXPLORER}/tx/${txHash}`}>Open payment tx</ScanLink>
          <CopyableHash value={txHash} label="payment tx" className="min-w-[220px] flex-1" />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ActionButton
          tone="primary"
          icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          disabled={!canPay}
          onClick={payAndCall}
        >
          {busy ? stateLabel : 'Pay & call with wallet'}
        </ActionButton>
        <span className="text-[11px] leading-relaxed text-[#D1D5DB]">
          Explicit click only. Backend verifies the tx and rejects replayed payment hashes.
        </span>
      </div>

      {response !== null && (
        <div className="mt-3 space-y-2">
          <InlineAlert tone="success" title="Paid response unlocked" body="XSight verified the X Layer payment and returned machine-readable Cup intelligence." />
          {!compact && (
            <CodeBlock
              language="json"
              code={JSON.stringify(response, null, 2).slice(0, 2200)}
            />
          )}
          {compact && (
            <div className="rounded-xl border border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.06)] p-3 text-[11px] leading-relaxed text-[#D1D5DB]">
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-[#4ADE80]" />
              JSON response received. Open the payment tx to verify the on-chain transfer.
            </div>
          )}
        </div>
      )}

      {spec && (
        <a
          href="/api/v1/x402-spec"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#7DD3FC] hover:text-[#BAE6FD]"
        >
          Open x402 discovery <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </section>
  );
}
