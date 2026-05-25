---
name: brightid
title: BrightID Reputation Adapter
description: Reads BrightID "verified human" status → 100 (oracle-grade) or 0 (unknown).
category: identity
tags: [sybil-resistance, did, attestation, verified-human]
trust_tier: community
version: 0.1.0
license: MIT
requires:
  - FanScoreRegistry
  - IBrightID (external context contract)
min_hook_version: 1.0.0
source: apps/hook/contracts/examples/BrightIDAdapter.sol
maintainer: kravadk
---

# BrightID Reputation Adapter

## What it does

Wraps a BrightID context contract so FanFeeHook can read "verified
human?" status as a 0-100 score. Binary today (100 if verified, 0
otherwise); extend with sponsor count or time-active for finer tiers.

## Score mapping

| BrightID state | FanScore | FanFeeHook tier |
|---|---|---|
| Verified | 100 | tier 3 — oracle-grade (5 bps) |
| Not verified | 0 | tier 0 — unknown (30 bps) |

## Wiring

Deploy `BrightIDAdapter(brightIdContext)`, then pass the adapter
address as the `_fanScoreRegistry` constructor arg of `FanFeeHook` on
a fork. FanFeeHook calls `scoreOf(wallet)` from `_beforeSwap`.

## Limitations

- Binary signal — no gradient between tiers 1 and 2.
- `updatedAt(wallet)` returns 0; v2 hook's 30-day stale check will
  always demote the wallet. Use the v1 hook (without stale-check) or
  proxy `updatedAt` to a meaningful timestamp.

## Reference implementation

[apps/hook/contracts/examples/BrightIDAdapter.sol](../../contracts/examples/BrightIDAdapter.sol)
