// Donation button + live tally. Reads balances straight from each chain's public RPC;
// nothing is signed or sent from here.
import { DONATION_CHAINS } from './donate-chains.js';

export const DONATE_ADDRESS = '0x7413353216FbFa2dAa76b14fCfD766263Bb83400';
export const COLLECTION_URL = 'https://opensea.io/collection/och-ringbearer';
// Set a USD number to show a progress bar toward the goal, e.g. 1500.
export const GOAL_USD = null;
// After you spend donations (e.g. buy a Ringbearer), add the USD amount here so the total keeps counting it.
export const SPENT_USD = 0;

const CACHE_KEY = 'bl-donations-v2';
const DUST_USD = 0.05; // ignore address-poisoning dust

async function rpc(url, method, params) {
  const r = await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(12000),
  });
  const j = await r.json();
  if (j.error || j.result == null) throw new Error(j.error?.message || 'empty result');
  return j.result;
}

const balanceOfData = '0x70a08231' + DONATE_ADDRESS.slice(2).toLowerCase().padStart(64, '0');
const decimalsData = '0x313ce567';

// One chain: native balance + each token's balance and decimals. Falls back to the next RPC on any error.
async function readChain(ch) {
  let lastErr;
  for (const url of ch.rpc) {
    try {
      const chainId = parseInt(await rpc(url, 'eth_chainId', []), 16);
      if (chainId !== ch.id) throw new Error('wrong chain ' + chainId);
      const [native, ...tok] = await Promise.all([
        rpc(url, 'eth_getBalance', [DONATE_ADDRESS, 'latest']),
        ...ch.tokens.flatMap(([, addr]) => [
          rpc(url, 'eth_call', [{ to: addr, data: balanceOfData }, 'latest']),
          rpc(url, 'eth_call', [{ to: addr, data: decimalsData }, 'latest']),
        ]),
      ]);
      const items = [{ symbol: ch.nativeSymbol, raw: BigInt(native), decimals: 18, price: ch.native }];
      ch.tokens.forEach(([symbol, , price], i) => {
        items.push({ symbol, raw: BigInt(tok[i * 2]), decimals: Number(BigInt(tok[i * 2 + 1])), price });
      });
      return items;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('no rpc');
}

export async function loadTally() {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (c && Date.now() - c.at < 3 * 60 * 1000) return c;
  } catch { /* storage optional */ }

  const keys = [...new Set(DONATION_CHAINS.flatMap((c) => [c.native, ...c.tokens.map((t) => t[2])]).filter((k) => k !== 'usd'))];
  let prices = {};
  try {
    const p = await fetch('https://coins.llama.fi/prices/current/' + keys.join(','), { signal: AbortSignal.timeout(12000) }).then((x) => x.json());
    prices = Object.fromEntries(Object.entries(p.coins || {}).map(([k, v]) => [k, v.price]));
  } catch { /* handled below: unpriced assets are listed without USD */ }
  prices.usd = 1;

  const results = await Promise.allSettled(DONATION_CHAINS.map(readChain));
  const perChain = [], failed = [];
  let balanceUsd = 0, unpriced = false;
  results.forEach((res, i) => {
    const ch = DONATION_CHAINS[i];
    if (res.status !== 'fulfilled') { failed.push(ch.name); return; }
    const items = [];
    for (const it of res.value) {
      if (it.raw === 0n) continue;
      const amount = Number(it.raw) / 10 ** it.decimals;
      const price = prices[it.price];
      const usd = price != null ? amount * price : null;
      if (usd != null && usd < DUST_USD) continue;
      if (usd == null) unpriced = true;
      items.push({ symbol: it.symbol, amount, usd });
      balanceUsd += usd || 0;
    }
    if (items.length) perChain.push({ name: ch.name, items, usd: items.reduce((s, x) => s + (x.usd || 0), 0) });
  });
  perChain.sort((a, b) => b.usd - a.usd);
  const res = {
    at: Date.now(), balanceUsd, spentUsd: SPENT_USD, total: balanceUsd + SPENT_USD,
    perChain, failed, unpriced, checked: DONATION_CHAINS.length - failed.length, chains: DONATION_CHAINS.length,
  };
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(res)); } catch { /* optional */ }
  return res;
}
