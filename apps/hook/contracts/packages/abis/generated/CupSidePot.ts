import data from './CupSidePot.json' with { type: 'json' };
export const CupSidePot = { abi: data.abi as const, contractName: 'CupSidePot' as const };
export default CupSidePot;
