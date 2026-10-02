import { DONATION_CHAINS } from './site/donate-chains.js';
const A = '0x7413353216FbFa2dAa76b14fCfD766263Bb83400';
const call = (to, data) => ({ method: 'eth_call', params: [{ to, data }, 'latest'] });
const dec = (h) => { try { const b = Buffer.from(h.slice(2), 'hex'); const len = parseInt(h.slice(66, 130), 16); return b.slice(64, 64 + len).toString('utf8'); } catch { return '?'; } };
let bad = 0;
for (const ch of DONATION_CHAINS) {
  for (const url of ch.rpc) {
    const reqs = [{ method: 'eth_chainId', params: [] }, { method: 'eth_getBalance', params: [A, 'latest'] },
      ...ch.tokens.flatMap(([, t]) => [call(t, '0x95d89b41'), call(t, '0x313ce567')])].map((r, i) => ({ jsonrpc: '2.0', id: i, ...r }));
    let out;
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(reqs), signal: AbortSignal.timeout(15000) });
      out = await res.json();
    } catch (e) { console.log(`${ch.name.padEnd(16)} ${url}  FAIL ${e.message}`); bad++; continue; }
    if (!Array.isArray(out)) { console.log(`${ch.name.padEnd(16)} ${url}  NO-BATCH ${JSON.stringify(out).slice(0, 80)}`); bad++; continue; }
    out.sort((a, b) => a.id - b.id);
    const cid = parseInt(out[0].result, 16);
    const toks = ch.tokens.map(([sym], i) => { const s = dec(out[2 + i * 2]?.result || '0x'); const d = parseInt(out[3 + i * 2]?.result || '0x', 16); return `${sym}:${s}/${d}${s.replace(/[^A-Za-z0-9.₮]/g, '').toUpperCase().includes(sym.replace('.E', '').toUpperCase().slice(0, 4)) || (sym === 'USDT0' && /USD/.test(s)) || (sym === 'ETH' && /ETH/.test(s)) ? '' : ' <<MISMATCH'}`; });
    const ok = cid === ch.id;
    if (!ok) bad++;
    console.log(`${ch.name.padEnd(16)} ${ok ? 'chain OK' : 'CHAIN MISMATCH ' + cid}  ${url.replace('https://', '').padEnd(42)} ${toks.join('  ')}`);
  }
}
console.log('problems:', bad);
