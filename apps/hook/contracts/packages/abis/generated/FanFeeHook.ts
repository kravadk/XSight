import data from './FanFeeHook.json' with { type: 'json' };
export const FanFeeHook = { abi: data.abi as const, contractName: 'FanFeeHook' as const };
export default FanFeeHook;
