import data from './FanBoostHook.json' with { type: 'json' };
export const FanBoostHook = { abi: data.abi as const, contractName: 'FanBoostHook' as const };
export default FanBoostHook;
