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

**v2 (LIVE with own pool + LP — Pausable + Merkle + stale-score fallback):**

| Contract | Address | OKLink |
|---|---|---|
| FanFeeHook v2 | `0x956e97658cd3ce67788b01b5f012954f782480c0` | [view](https://www.okx.com/web3/explorer/xlayer/address/0x956e97658cd3ce67788b01b5f012954f782480c0) |
| CupSidePot v2 | `0x8d1de90753889d57c709cbd77c5e5f3c56add4fa` | [view](https://www.okx.com/web3/explorer/xlayer/address/0x8d1de90753889d57c709cbd77c5e5f3c56add4fa) |
| V2 pool init tx | `0x36a9e2207e86c6a92dd05bac21f0fa4bab8c65bfe7dbff966a24b1b097ad09ab` | [view](https://www.okx.com/web3/explorer/xlayer/tx/0x36a9e2207e86c6a92dd05bac21f0fa4bab8c65bfe7dbff966a24b1b097ad09ab) |

> v2 reuses the same `FanScoreRegistry` so tier inheritance is automatic.
> 0.3 USDT + 0.3 USDC LP funded. Source:
> [`apps/hook/contracts/src/FanFeeHookV2.sol`](../contracts/src/FanFeeHookV2.sol),
> [`CupSidePotV2.sol`](../contracts/src/CupSidePotV2.sol). v2 mitigations
> in [`SECURITY.md`](../contracts/SECURITY.md).

**V2 multi-tier proof (4 real FeeApplied events on the new v2 pool):**

| Tier | Fee | V2 swap tx |
|---|---|---|
| 0 | 30 bps | [view](https://www.okx.com/web3/explorer/xlayer/tx/0xf867e8fbb730fc6f8cad815de41c945a6966681c50bc69e4aacc9683e0653593) |
| 1 | 20 bps | [view](https://www.okx.com/web3/explorer/xlayer/tx/0x87dac94f9dd668dcce41d380e094e260bdfee924a1e35a0a4e08ad6e2b14e927) |
| 2 | 10 bps | [view](https://www.okx.com/web3/explorer/xlayer/tx/0x8131214311289d2aa0e691445ce75519345e319f06b6684e2ac45727a5b992e2) |
| 3 | 5 bps | [view](https://www.okx.com/web3/explorer/xlayer/tx/0x3dc35df3a5e0587d9d734891a3a2426a1d3fa4a3485946e69070143007e51620) |

> Verify on-chain: `cast logs --address 0x956e97658cd3ce67788b01b5f012954f782480c0 --topic 0xfafba968a35e2906f5d1d9bbfc74d55faab1a3856d10e65eabec2d0f4f35f720 --rpc-url https://rpc.xlayer.tech`

**FanBoostHook (companion hook, `afterAddLiquidity`, bit `0x400`):**

| Contract | Address | OKLink |
|---|---|---|
| FanBoostHook | `0x10609f1a4a47dc78ea3cf21535b4edf8b6758400` | [view](https://www.okx.com/web3/explorer/xlayer/address/0x10609f1a4a47dc78ea3cf21535b4edf8b6758400) |

> Verifiable: address ends in `8400` — bit 10 (AFTER_ADD_LIQUIDITY) set.
> Different bit from FanFeeHook (`0xC0`), so both can attach to the same
> pool without collision. Source:
> [`apps/hook/contracts/src/FanBoostHook.sol`](../contracts/src/FanBoostHook.sol).

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
