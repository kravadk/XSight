# @xtariff/hook-abis

Typed ABI bundles for the FanFeeHook contracts on **X Layer mainnet
(chain 196)**. Drop-in for `viem`, `wagmi`, `ethers`, or any consumer
that accepts a JSON ABI.

## Install

```bash
npm install @xtariff/hook-abis
# or
pnpm add @xtariff/hook-abis
```

## Use (viem)

```ts
import { createPublicClient, http, getContract } from 'viem';
import { FanFeeHook } from '@xtariff/hook-abis';

const client = createPublicClient({
  transport: http('https://rpc.xlayer.tech'),
});

const hook = getContract({
  address: '0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0', // v1 mainnet
  abi: FanFeeHook.abi,
  client,
});

const tier = await hook.read.tierOf([yourWallet]);
const fee = await hook.read.feeOf([yourWallet]);
console.log({ tier, feePips: fee });
```

## Exported contracts

| Contract | Mainnet address (X Layer 196) |
|---|---|
| `FanFeeHook` (v1) | `0xE667DFeD54E3FdfA514cCE775F4325DeD919C0c0` |
| `FanFeeHookV2` | `0x956e97658cd3ce67788b01b5f012954f782480c0` |
| `FanScoreRegistry` (shared by v1+v2) | `0x9533C6Cf77597095F2eBF3dBC02FC133eDf42820` |
| `CupSidePot` (v1) | `0x9104C24A5108Ef46CC1aa15117715B3f8Dd5F504` |
| `CupSidePotV2` | `0x8d1de90753889d57c709cbd77c5e5f3c56add4fa` |
| `FanBoostHook` (companion) | `0x10609f1a4a47dc78ea3cf21535b4edf8b6758400` |

## Regenerate

```bash
cd apps/hook/contracts && forge build
cd packages/abis && npm run build
```

Reads `out/<Contract>.sol/<Contract>.json` and writes slim bundles
into `generated/`.

## License

MIT
