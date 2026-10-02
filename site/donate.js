// Donation button + live tally. Reads public explorers only; nothing is signed or sent from here.
export const DONATE_ADDRESS = '0x7413353216FbFa2dAa76b14fCfD766263Bb83400';
export const COLLECTION_URL = 'https://opensea.io/collection/och-ringbearer';
// Set a USD number to show a progress bar toward the goal, e.g. 1500.
export const GOAL_USD = null;

// Only native ETH and these exact token contracts count, so fake "USDC" airdrops cannot inflate the total.
const CHAINS = [
  { name: 'Ethereum', api: 'https://eth.blockscout.com/api', tokens: {
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USD', '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USD',
    '0x6b175474e89094c44da98b954eedeac495271d0f': 'USD', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'ETH' } },
  { name: 'Arbitrum', api: 'https://arbitrum.blockscout.com/api', tokens: {
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'USD', '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 'USD',
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 'USD', '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'ETH' } },
  { name: 'Base', api: 'https://base.blockscout.com/api', tokens: {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USD', '0x4200000000000000000000000000000000000006': 'ETH' } },
  { name: 'Optimism', api: 'https://explorer.optimism.io/api', tokens: {
    '0x0b2c639c533813f4aa9d7837caf62653d097ff85': 'USD', '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': 'USD',
    '0x4200000000000000000000000000000000000006': 'ETH' } },
  { name: 'Blast', api: 'https://api.routescan.io/v2/network/mainnet/evm/81457/etherscan/api', tokens: {
    '0x4300000000000000000000000000000000000003': 'USD', '0x4300000000000000000000000000000000000004': 'ETH' } },
];

const me = DONATE_ADDRESS.toLowerCase();
const CACHE_KEY = 'bl-donations';

async function list(api, action) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(`${api}?module=account&action=${action}&address=${DONATE_ADDRESS}&sort=asc`, { signal: AbortSignal.timeout(20000) }).catch(() => null);
    if (r && r.ok) {
      const j = await r.json();
      if (Array.isArray(j.result)) return j.result;
      if (!/rate|limit/i.test(String(j.result || j.message))) return [];
    }
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  throw new Error('explorer unavailable');
}

export async function loadTally() {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (c && Date.now() - c.at < 5 * 60 * 1000) return c;
  } catch { /* storage optional */ }
  let ethPrice = null;
  try {
    const p = await fetch('https://coins.llama.fi/prices/current/coingecko:ethereum').then((x) => x.json());
    ethPrice = p.coins['coingecko:ethereum'].price;
  } catch { /* price optional */ }
  let eth = 0, usd = 0, count = 0, failed = 0;
  await Promise.all(CHAINS.map(async (ch) => {
    try {
      const [txs, internal, tokens] = await Promise.all([list(ch.api, 'txlist'), list(ch.api, 'txlistinternal'), list(ch.api, 'tokentx')]);
      for (const t of [...txs, ...internal]) {
        if ((t.to || '').toLowerCase() !== me || t.isError === '1') continue;
        const v = Number(t.value) / 1e18;
        if (v > 0) { eth += v; count++; }
      }
      for (const t of tokens) {
        if ((t.to || '').toLowerCase() !== me) continue;
        const kind = ch.tokens[(t.contractAddress || '').toLowerCase()];
        if (!kind) continue;
        const v = Number(t.value) / 10 ** Number(t.tokenDecimal || 18);
        if (v <= 0) continue;
        if (kind === 'ETH') eth += v; else usd += v;
        count++;
      }
    } catch { failed++; }
  }));
  const total = usd + (ethPrice ? eth * ethPrice : 0);
  const res = { at: Date.now(), eth, usd, total, count, failed, priced: ethPrice != null };
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(res)); } catch { /* optional */ }
  return res;
}
