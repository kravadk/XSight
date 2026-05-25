#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, '..');
const CONTRACTS_ROOT = resolve(PKG_ROOT, '..', '..');
const OUT_DIR = resolve(CONTRACTS_ROOT, 'out');
const GEN_DIR = resolve(PKG_ROOT, 'generated');

const CONTRACTS = [
  'FanFeeHook',
  'FanFeeHookV2',
  'FanScoreRegistry',
  'CupSidePot',
  'CupSidePotV2',
  'FanBoostHook',
];

if (!existsSync(GEN_DIR)) mkdirSync(GEN_DIR, { recursive: true });

const tsExports = [];
for (const name of CONTRACTS) {
  const src = resolve(OUT_DIR, `${name}.sol`, `${name}.json`);
  if (!existsSync(src)) {
    console.error(`[warn] missing artifact for ${name}: ${src}`);
    continue;
  }
  const artifact = JSON.parse(readFileSync(src, 'utf8'));
  const slim = { contractName: name, abi: artifact.abi };
  const jsonOut = resolve(GEN_DIR, `${name}.json`);
  writeFileSync(jsonOut, JSON.stringify(slim, null, 2) + '\n');
  const tsOut = resolve(GEN_DIR, `${name}.ts`);
  writeFileSync(
    tsOut,
    `import data from './${name}.json' with { type: 'json' };\nexport const ${name} = { abi: data.abi as const, contractName: '${name}' as const };\nexport default ${name};\n`,
  );
  tsExports.push(`export { ${name} } from './${name}.js';`);
  console.log(`[ok] ${name}: ${artifact.abi.length} ABI entries`);
}

const indexOut = resolve(GEN_DIR, 'index.ts');
writeFileSync(indexOut, tsExports.join('\n') + '\n');
console.log(`[done] wrote ${tsExports.length} ABI bundles to ${GEN_DIR}`);
