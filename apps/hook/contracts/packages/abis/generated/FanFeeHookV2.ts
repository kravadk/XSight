import data from './FanFeeHookV2.json' with { type: 'json' };
export const FanFeeHookV2 = { abi: data.abi as const, contractName: 'FanFeeHookV2' as const };
export default FanFeeHookV2;
