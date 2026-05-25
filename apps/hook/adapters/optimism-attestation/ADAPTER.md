---
name: optimism-attestation
title: Optimism Attestation Station Adapter
description: Reads a single attester/key endorsement → 80 (trusted) or 0 (unknown).
category: attestation
tags: [optimism, eas, attestation-station, endorsement]
trust_tier: community
version: 0.1.0
license: MIT
requires:
  - FanScoreRegistry
  - IAttestationStation (Optimism Attestation Station)
min_hook_version: 1.0.0
source: apps/hook/contracts/examples/OptimismAttestationAdapter.sol
maintainer: kravadk
---

# Optimism Attestation Station Adapter

## What it does

Reads a single attestation key from a fixed attester EOA on the
Optimism Attestation Station. Any non-empty payload is treated as
"endorsed" and lands the wallet at score 80 — Trusted tier (10 bps).

## Score mapping

| Attestation state | FanScore | FanFeeHook tier |
|---|---|---|
| Endorsed (val length > 0) | 80 | tier 2 — trusted (10 bps) |
| No endorsement | 0 | tier 0 — unknown (30 bps) |

## Wiring

```solidity
OptimismAttestationAdapter adapter = new OptimismAttestationAdapter(
    station,
    attester,            // your DAO's signer EOA
    keccak256("fan.endorsed.v1") // your custom attestation key
);
FanFeeHook hook = new FanFeeHook(poolManager, fanPassSbt, address(adapter));
```

## Limitations

- Single attester / single key — for committee-weighted endorsements,
  fork the adapter to aggregate across N attesters.
- `updatedAt(wallet)` returns 0; same v2 stale-check caveat as the
  BrightID adapter.

## Reference implementation

[apps/hook/contracts/examples/OptimismAttestationAdapter.sol](../../contracts/examples/OptimismAttestationAdapter.sol)
