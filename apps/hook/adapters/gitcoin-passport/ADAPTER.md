---
name: gitcoin-passport
title: Gitcoin Passport Adapter
description: Normalizes on-chain Passport score (1e4-scaled) into 0..100 FanScore.
category: reputation
tags: [sybil-resistance, passport, gitcoin, stamp-aggregate]
trust_tier: community
version: 0.1.0
license: MIT
requires:
  - FanScoreRegistry
  - IPassportDecoder (Gitcoin Passport on-chain decoder)
min_hook_version: 1.0.0
source: apps/hook/contracts/examples/GitcoinPassportAdapter.sol
maintainer: kravadk
---

# Gitcoin Passport Adapter

## What it does

Reads the on-chain Gitcoin Passport score (stored at 4 decimals) and
linearly normalizes it into the 0..100 FanScore band. Scores at or
above 50 (Passport's commonly-used trust threshold) cap at 100; the
band 0..50 maps proportionally onto 0..100.

## Score mapping

| Passport (raw / 1e4) | FanScore | FanFeeHook tier |
|---|---|---|
| 0–13 | 0–26 | tier 0 — unknown (30 bps) |
| 14–31 | 28–62 | tier 1 — active (20 bps) |
| 32–40 | 64–80 | tier 2 — trusted (10 bps) |
| 41+ | 82–100 | tier 3 — oracle-grade (5 bps) |

(Approximate; computed as `score * 100 / 50`, capped.)

## Wiring

```solidity
GitcoinPassportAdapter adapter = new GitcoinPassportAdapter(decoder);
FanFeeHook hook = new FanFeeHook(poolManager, fanPassSbt, address(adapter));
```

## Limitations

- `getScore` reverts when the user has no Passport — wrap calls in
  try/catch off-chain or use a registry shim that defaults to 0.
- `updatedAt` proxies the Passport expiration time, so the v2 hook's
  30-day stale guard is honored automatically.

## Reference implementation

[apps/hook/contracts/examples/GitcoinPassportAdapter.sol](../../contracts/examples/GitcoinPassportAdapter.sol)
