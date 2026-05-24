# Judge & Auditor Walkthrough — verify FanFeeHook in 5 minutes

> Trust nothing in our UI. Every claim below is verifiable on-chain
> using public RPC + `cast` (Foundry) on a clean machine. No private
> keys, no whitelists, no off-chain auth.

**Live deployment — X Layer mainnet (chain 196)**

**v1 (production live, fee-routed):**

| Contract | Address | Verified on OKLink |
|---|---|---|
| FanFeeHook v1 | `0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0` | [view](https://www.okx.com/web3/explorer/xlayer/address/0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0) |
| FanScoreRegistry | `0x9533C6Cf77597095F2eBF3dBC02FC133eDf42820` | [view](https://www.okx.com/web3/explorer/xlayer/address/0x9533C6Cf77597095F2eBF3dBC02FC133eDf42820) |
| CupSidePot v1 | `0x9104C24A5108Ef46CC1aa15117715B3f8Dd5F504` | [view](https://www.okx.com/web3/explorer/xlayer/address/0x9104C24A5108Ef46CC1aa15117715B3f8Dd5F504) |
| DemoSwapRouter | `0x00d1a987beAC42FCB3513b6Fc23429164851694f` | [view](https://www.okx.com/web3/explorer/xlayer/address/0x00d1a987beAC42FCB3513b6Fc23429164851694f) |
| USDT/USDC pool ID | `0x3637650b74a2e05c6a381bb260a1695b004f3a9489362be8ec5aa86fa9df17c2` | — |

**v2 (deployed, awaiting LP migration — Pausable + Merkle + stale-score fallback):**

| Contract | Address | OKLink |
|---|---|---|
| FanFeeHook v2 | `0x956e97658cd3ce67788b01b5f012954f782480c0` | [view](https://www.okx.com/web3/explorer/xlayer/address/0x956e97658cd3ce67788b01b5f012954f782480c0) |
| CupSidePot v2 | `0x8d1de90753889d57c709cbd77c5e5f3c56add4fa` | [view](https://www.okx.com/web3/explorer/xlayer/address/0x8d1de90753889d57c709cbd77c5e5f3c56add4fa) |

> v2 reuses the same `FanScoreRegistry` so tier inheritance is automatic.
> Source: [`apps/hook/contracts/src/FanFeeHookV2.sol`](../contracts/src/FanFeeHookV2.sol),
> [`CupSidePotV2.sol`](../contracts/src/CupSidePotV2.sol). v2 mitigations
> documented in [`SECURITY.md`](../contracts/SECURITY.md).

---

## Step 1 · Verify source code on OKLink

Open each contract link above. The **Contract** tab shows verified Solidity
source — including the `beforeSwap` hook entry point and the
`FeeApplied` event declaration. No need to trust our GitHub mirror.

Expected: green checkmark next to "Source code" on all 3.

---

## Step 2 · Read any wallet's tier on-chain

```bash
export RPC=https://rpc.xlayer.tech
export HOOK=0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0
export REGISTRY=0x9533C6Cf77597095F2eBF3dBC02FC133eDf42820

# Read fee in pip units that a given wallet would be charged
cast call $HOOK "feeOf(address)(uint24)" 0x82736f84Ad234566180F902237e2Fb4c35177bDB --rpc-url $RPC
# → 500    (Oracle-grade = 5 bps; UI divides by 100 for display)

# Read raw score
cast call $REGISTRY "scoreOf(address)(uint256)" 0x82736f84Ad234566180F902237e2Fb4c35177bDB --rpc-url $RPC
# → 90     (high reputation)

# A fresh, unknown wallet returns the default
cast call $HOOK "feeOf(address)(uint24)" 0x0000000000000000000000000000000000000001 --rpc-url $RPC
# → 3000   (Unknown = 30 bps default)
```

This proves the hook reads identity per swap and the multi-tier model
is actually wired, not a UI mock.

---

## Step 3 · Trigger a real swap (two options)

### Option A — through our dashboard (1 click)

Open <https://x-sight.vercel.app/?product=hook>, connect any wallet,
hit "Claim starter score · free" (the operator auto-grants Active tier
to fresh wallets so judges immediately see the 1.5× discount), then
press **Swap USDC → USDT**.

### Option B — raw `cast` (no UI trust)

```bash
# 1. Approve 0.005 USDC to the demo router
cast send 0x74b7F16337b8972027F6196A17a631aC6dE26d22 \
  "approve(address,uint256)" \
  0x00d1a987beAC42FCB3513b6Fc23429164851694f \
  5000 \
  --rpc-url $RPC --private-key $YOUR_KEY

# 2. Submit the swap through DemoSwapRouter
#    (poolKey + SwapParams encoded; see apps/hook/contracts/src/DemoSwapRouter.sol)
cast send 0x00d1a987beAC42FCB3513b6Fc23429164851694f \
  "swap((address,address,uint24,int24,address),(bool,int256,uint160))" \
  "(0x74b7F16337b8972027F6196A17a631aC6dE26d22,0x1E4a5963aBFD975d8c9021ce480b42188849D41d,8388608,60,$HOOK)" \
  "(false,-5000,1461446703485210103287273052203988822378723970341)" \
  --rpc-url $RPC --private-key $YOUR_KEY
```

---

## Step 4 · Verify the `FeeApplied` event

```bash
# FeeApplied(bytes32 indexed poolId, address indexed swapper, uint8 tier, uint24 feeBps)
cast logs --address $HOOK \
  --topic 0xfafba968a35e2906f5d1d9bbfc74d55faab1a3856d10e65eabec2d0f4f35f720 \
  --rpc-url $RPC
```

Every swap through this hook emits one log entry — the `tier` and
`feeBps` fields are decoded from the data payload. Mainnet history is
public; the latest swap entries are in
<https://x-sight.vercel.app/?product=hook&tab=hook-activity>.

---

## Step 5 · Test the cross-chain port

The hook is chain-agnostic. To deploy on a different EVM chain that has
Uniswap V4 PoolManager:

```bash
git clone https://github.com/kravadk/XHook
cd XHook && forge install
cp .env.example .env       # fill POOL_MANAGER, USDC, OPERATOR, etc.
forge script script/DeployFanFeeHook.s.sol --rpc-url <your-rpc> --broadcast
forge script script/InitTestPool.s.sol     --rpc-url <your-rpc> --broadcast
```

Full guide in [`CONTRIBUTING.md`](../CONTRIBUTING.md). Plug-in adapter
examples for BrightID / Gitcoin Passport / Optimism Attestation are in
[`contracts/examples/`](../contracts/examples/) and documented in
[`INTEGRATION-GUIDE.md`](./INTEGRATION-GUIDE.md).

---

## Source code

- Repo: <https://github.com/kravadk/XHook> (mirror) ·
  <https://github.com/kravadk/XSight> (umbrella)
- Foundry tests: `apps/hook/contracts/test/` — 55 tests, 91% line coverage
  on the hook + score registry path.
- Gas snapshot: `apps/hook/contracts/.gas-snapshot`
- Security notes: [`apps/hook/contracts/SECURITY.md`](../contracts/SECURITY.md)
