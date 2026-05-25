# Review policy — adapter contributions

How proposals to add or promote a `FanScoreRegistry` adapter get
reviewed. Mirrors `openclaude-skills/REVIEW_POLICY.md`.

## Tiers

| Tier | Meaning | Bar |
|---|---|---|
| `community` | Anyone can open a PR adding an adapter that compiles and matches the interface. | Compiles · interface conforms · ADAPTER.md frontmatter valid. |
| `verified` | Reviewed by a maintainer + at least one independent test of the adapter against a real attestation source on testnet. | All `community` requirements + matching `.t.sol` mainnet-fork integration test + an issue link documenting the testnet verification. |
| `official` | Endorsed by the FanFeeHook maintainers — recommended for production pools. | All `verified` requirements + reproducible testnet deployment + external review (security pass on the adapter source). |
| `deprecated` | No longer recommended (broken interface, dropped by upstream, security advisory). | Set by maintainers; ADAPTER.md keeps a `## Deprecated` note explaining why. |

Tier label is **authority-controlled in [`.maintainers/trust.json`](.maintainers/trust.json)**,
not self-declared in ADAPTER.md frontmatter. Frontmatter `trust_tier:`
field must match what trust.json says.

## What a community PR must include

1. **Solidity source** under
   [`contracts/examples/<Name>Adapter.sol`](contracts/examples/) that
   implements `{ tierOf(address) view returns (uint8); updatedAt(address) view returns (uint64); }`
   (or the score-based `{ scoreOf(address), updatedAt(address) }` minimal
   contract — the hook adapts either).
2. **ADAPTER.md** under `adapters/<name>/ADAPTER.md` with full
   frontmatter (see other adapters for the schema) plus a Score-mapping
   table and a Wiring snippet.
3. **registry.json patch** — add a new entry to
   [`adapters/registry.json`](adapters/registry.json) with `name`,
   `title`, `category`, `trust_tier: "community"`, `version: "0.1.0"`,
   `source`, `doc`.
4. **trust.json patch** — append the adapter `name` to the `community`
   array in [`.maintainers/trust.json`](.maintainers/trust.json).
5. **No revoked-version conflict** — verify the new (name, version)
   pair does not appear in
   [`adapters/revocations.json`](adapters/revocations.json).

## Promotion path

`community` → `verified` → `official`

Each promotion requires:
- Open a separate PR moving the adapter `name` from one tier array to
  the next in `.maintainers/trust.json` AND updating `trust_tier:` in
  the ADAPTER.md frontmatter.
- Link to evidence in the PR description:
  - **For `verified`:** testnet integration test passing on Sepolia (or
    chain of choice); reproducible via `DeployTestnet.s.sol` + a swap.
  - **For `official`:** external security review summary attached.

Maintainers approve promotions; the original author cannot self-promote.

## Revocation

If an adapter version develops a security flaw or upstream changes
break it:

1. Append `{ name, version, reason, revokedAt }` to
   [`adapters/revocations.json`](adapters/revocations.json).
2. Move the adapter `name` to the `deprecated` array in `trust.json`.
3. Add a `## Deprecated` note at the top of ADAPTER.md.
4. Bump the adapter's `version:` in frontmatter so a fixed v0.2.0 can
   re-enter the registry at `community` tier.

## Security checklist (mandatory for all tiers)

- [ ] Adapter contract has no `selfdestruct` / `delegatecall` / inline
      assembly that could redirect calls.
- [ ] No external state mutations during `tierOf` / `scoreOf` /
      `updatedAt` (must be `view` / `pure`).
- [ ] Reads from the underlying attestation source are bounded — no
      unbounded loops that could grief the pool.
- [ ] Returns sensible defaults for unknown wallets (typically 0
      score / tier 0, not a revert).
- [ ] Foundry-fmt clean.

## Disclaimer

`community` tier adapters are user-contributed; the FanFeeHook
maintainers do not guarantee their correctness. Pools that attach a
non-`official` adapter accept that risk.
