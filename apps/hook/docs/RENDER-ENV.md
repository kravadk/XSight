# Render env vars — activate v2 + FanBoost in the live UI

> 1-minute action: paste 3 env vars into Render, redeploy, v2/FanBoost
> rows + activity badge appear automatically. No code change required.

## What this unlocks

After these vars are set on the Render dashboard (and the service
auto-redeploys):

1. **Contracts tab** on `/?product=hook` shows three new cards:
   - "Our v2 stack" with FanFeeHook v2 + CupSidePot v2
   - "Companion hook · proves multi-hook composability" with FanBoostHook
2. **Activity tab** shows a small gold `v2` badge next to events that
   came from the v2 hook (the 4 multi-tier swaps).
3. `GET /api/hook/state` response includes `hookV2`, `cupSidePotV2`,
   `fanBoost` fields (otherwise `null`).
4. `GET /api/hook/discounts` queries **both** v1 and v2 hooks and
   returns combined event stream tagged with `version: 'v1' | 'v2'`.

## Vars to add

Open <https://dashboard.render.com> → your service (`xsight-lpov`) →
**Environment** tab → **Add Environment Variable** for each:

```
HOOK_FAN_FEE_HOOK_V2 = 0x956e97658cd3ce67788b01b5f012954f782480c0
HOOK_CUP_SIDE_POT_V2 = 0x8d1de90753889d57c709cbd77c5e5f3c56add4fa
HOOK_FAN_BOOST       = 0x10609f1a4a47dc78ea3cf21535b4edf8b6758400
```

Click **Save Changes** → Render auto-redeploys (~2 min).

## Verify after redeploy

```bash
# Should now show hookV2 + cupSidePotV2 + fanBoost (non-null)
curl -s https://xsight-lpov.onrender.com/api/hook/state | jq

# Should include events with version: 'v2' alongside v1
curl -s https://xsight-lpov.onrender.com/api/hook/discounts | jq '.events[] | {version, tier, feeBps, txHash}'
```

## v1 stays as primary

These env vars are **purely additive** — they extend the UI/API with
v2 visibility. The v1 hook + pool remains the canonical fee-routed
path; SwapWidget continues to use v1's DemoSwapRouter. No risk of
breaking the existing demo.

## To switch SwapWidget to v2 (optional, future)

If/when you want the in-page swap to route through v2 instead:
1. Run `forge script script/InitTestPool.s.sol` with
   `HOOK_FAN_FEE_HOOK=0x956e…80c0` (already done — pool live).
2. Update `HOOK_FAN_FEE_HOOK` env on Render to v2 address (replaces v1
   in the encode-swap endpoint).
3. UI starts emitting swaps against v2 pool.

Reverting is a single env edit back to v1 address — both pools stay
on chain.
