import data from './FanScoreRegistry.json' with { type: 'json' };
export const FanScoreRegistry = { abi: data.abi as const, contractName: 'FanScoreRegistry' as const };
export default FanScoreRegistry;
