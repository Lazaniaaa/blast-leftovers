import { scan } from './site/engine.js';
const a = process.argv[2];
const t0 = Date.now();
const r = await scan(a, (m) => console.error('  ·', m));
const j = JSON.stringify(r, (k, v) => typeof v === 'bigint' ? v.toString() : v, 1);
console.log(JSON.stringify(r.totals), 'sec', (Date.now()-t0)/1000);
for (const k of ['wallet','vaults','debts','lending','lp','nftPositions','locks','deposits','bridge','nfts','unknown','spam','notes']) {
  if (!r[k].length) continue;
  console.log('## '+k+' ('+r[k].length+')');
  for (const x of r[k].slice(0,12)) console.log('  ', JSON.stringify(x,(k,v)=>typeof v==='bigint'?v.toString():v).slice(0,330));
}
