/**
 * Read-only ERC-20 helpers that go straight to the X Layer public RPC. We use a
 * direct fetch — not the connected wallet provider — so a wallet sitting on the
 * wrong chain still gives us correct on-chain numbers for a pre-flight check.
 *
 * Used by the stake panel to refuse to open a wallet popup if the user does not
 * have enough USDT, or has not yet approved the pool — so they get a clear toast
 * instead of an "Execution error" from the wallet's simulator.
 */

const X_LAYER_RPC = 'https://rpc.xlayer.tech';

const BALANCE_OF_SELECTOR = '0x70a08231';
const ALLOWANCE_SELECTOR = '0xdd62ed3e';

/** Left-pad a 20-byte address to a 32-byte ABI slot (lowercase, no `0x`). */
function padAddress(address: string): string {
  return address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}

interface JsonRpcResponse {
  result?: string;
  error?: { message: string };
}

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(X_LAYER_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
  });
  const json = (await res.json()) as JsonRpcResponse;
  if (json.error) throw new Error(`eth_call: ${json.error.message}`);
  return json.result ?? '0x0';
}

/** Read `balanceOf(owner)` from an ERC-20 token. Returns base units. */
export async function readErc20Balance(token: string, owner: string): Promise<bigint> {
  const data = BALANCE_OF_SELECTOR + padAddress(owner);
  const hex = await ethCall(token, data);
  return BigInt(hex);
}

/** Read `allowance(owner, spender)` from an ERC-20 token. Returns base units. */
export async function readErc20Allowance(
  token: string,
  owner: string,
  spender: string,
): Promise<bigint> {
  const data = ALLOWANCE_SELECTOR + padAddress(owner) + padAddress(spender);
  const hex = await ethCall(token, data);
  return BigInt(hex);
}
