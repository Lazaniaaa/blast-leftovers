// Multi-chain position scanner (Blast, Abstract). Read-only: needs only an address, never a wallet connection.
// Works in the browser (via import map for "viem") and in Node 18+.
import {
  createPublicClient, http, fallback, defineChain, parseAbi,
  encodeFunctionData, decodeFunctionResult, getAddress, isAddress, keccak256,
} from 'viem';
import { labelFor } from './labels.js';
import { CHAINS } from './chains.js';

const mainnet = defineChain({
  id: 1, name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://ethereum-rpc.publicnode.com'] } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
});

const LLAMA = 'https://coins.llama.fi/prices/current/';
// Blast (OP Stack) withdrawals
const PORTAL = '0x0Ec68c5B10F21EFFb74f2A5C61DFe6b08C0Db6Cb';
const MSG_PASSED = '0x02a52367d10742d8032712c1bb8e0144ff1ec5ffda1ed7d70bb05a2744955054';
// ZK Stack: Withdrawal(address,address,uint256) emitted by the ETH base token contract 0x…800a
const ZK_WITHDRAWAL = '0x2717ead6b9200dd235aad468c9809ea400fe33ac69b5bfaa6d3e90fc922b6398';
const ZERO = '0x0000000000000000000000000000000000000000';
export const ETH = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

const A = {
  erc20: parseAbi([
    'function balanceOf(address) view returns (uint256)',
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
  ]),
  probe: parseAbi([
    'function UNDERLYING_ASSET_ADDRESS() view returns (address)',
    'function POOL() view returns (address)',
    'function underlying() view returns (address)',
    'function exchangeRateStored() view returns (uint256)',
    'function comptroller() view returns (address)',
    'function token0() view returns (address)',
    'function token1() view returns (address)',
    'function getReserves() view returns (uint112, uint112, uint32)',
    'function asset() view returns (address)',
    'function convertToAssets(uint256) view returns (uint256)',
    'function underlyingToken() view returns (address)',
    'function toAmt(uint256) view returns (uint256)',
    'function TOKEN() view returns (address)',
    'function token() view returns (address)',
    'function getStERC20ByNrERC20(uint256) view returns (uint256)',
    'function factory() view returns (address)',
  ]),
  ambient: parseAbi(['function querySurplus(address owner, address token) view returns (uint128)']),
  synGate: parseAbi(['function reserveOf(address quote, address trader) view returns (uint256)']),
  stream: parseAbi([
    'function withdrawableAmountOf(uint256) view returns (uint128)',
    'function getAsset(uint256) view returns (address)',
    'function getUnderlyingToken(uint256) view returns (address)',
  ]),
  e1155: parseAbi(['function balanceOf(address, uint256) view returns (uint256)']),
  aavePool: parseAbi(['function getUserAccountData(address) view returns (uint256,uint256,uint256,uint256,uint256,uint256)']),
  comptroller: parseAbi(['function getAssetsIn(address) view returns (address[])']),
  ctoken: parseAbi([
    'function borrowBalanceStored(address) view returns (uint256)',
    'function underlying() view returns (address)',
    'function symbol() view returns (string)',
  ]),
  nft: parseAbi([
    'function ownerOf(uint256) view returns (address)',
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function factory() view returns (address)',
    'function token() view returns (address)',
  ]),
  slipstream: parseAbi(['function getPool(address,address,int24) view returns (address)']),
  v3: parseAbi([
    'function getPool(address,address,uint24) view returns (address)',
    'function poolByPair(address,address) view returns (address)',
    'function customPoolByPair(address,address,address) view returns (address)',
  ]),
  stakeGetters: parseAbi([
    'function balanceOf(address) view returns (uint256)',
    'function balances(address) view returns (uint256)',
    'function staked(address) view returns (uint256)',
    'function stakedBalance(address) view returns (uint256)',
    'function deposits(address) view returns (uint256)',
    'function userInfo(address) view returns (uint256)',
    'function lockedBalanceOf(address) view returns (uint256)',
    'function userTotalStaked(address) view returns (uint256)',
    'function getDepositAmount(address) view returns (uint256)',
  ]),
  claimedFlags: parseAbi([
    'function depositClaimed(address) view returns (bool)',
    'function claimed(address) view returns (bool)',
    'function hasClaimed(address) view returns (bool)',
  ]),
  owned: parseAbi([
    'function owner() view returns (address)',
    'function getOwners() view returns (address[])',
  ]),
  juicePool: parseAbi([
    'function getDepositAmount(address) view returns (uint256)',
    'function getAsset() view returns (address)',
  ]),
  juiceMgr: parseAbi([
    'function getAccount(address) view returns (address)',
    'function balanceOfAssets(address) view returns (uint256)',
    'function getDebtAmount(address) view returns (uint256)',
    'function getLendAsset() view returns (address)',
    'function asset() view returns (address)',
  ]),
  zkNullifier: parseAbi(['function isWithdrawalFinalized(uint256 chainId, uint256 l2BatchNumber, uint256 l2MessageIndex) view returns (bool)']),
  agwRegistry: parseAbi(['function isAGW(address) view returns (bool)']),
  agwFactory: parseAbi(['function getAddressForSalt(bytes32) view returns (address)']),
  portal: parseAbi([
    'function finalizedWithdrawals(bytes32) view returns (bool)',
    'function provenWithdrawals(bytes32) view returns (bytes32 outputRoot, uint128 timestamp, uint128 l2OutputIndex, uint256 requestId)',
  ]),
};
const AGG3 = parseAbi(['function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[])']);

// Every scan gets its own closure, so scans running in parallel (the bot does that) never share state.
function createScanner(chain) {
const client = createPublicClient({
  chain: chain.viemChain,
  transport: fallback(chain.rpc.map((u) => http(u, { batch: { batchSize: 20 }, retryCount: 2 }))),
});
const l1 = createPublicClient({
  chain: mainnet,
  transport: http('https://ethereum-rpc.publicnode.com', { batch: { batchSize: 20 }, retryCount: 2 }),
});
const RS = chain.explorerApi;
const MULTICALL3 = chain.multicall3;
const BRIDGES = new Set(chain.bridges);
const WRAPPERS = new Set(chain.wrappers);
const label = (a) => labelFor(a, chain.key);

// ---------- low-level helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lc = (a) => (a || '').toLowerCase();

async function rawMulti(calls, chunk = 150) {
  // calls: [{target, data}] -> [{ok, data}]
  const out = new Array(calls.length);
  const chunks = [];
  for (let i = 0; i < calls.length; i += chunk) chunks.push([i, calls.slice(i, i + chunk)]);
  const run = async ([start, part]) => {
    const res = await client.readContract({
      address: MULTICALL3, abi: AGG3, functionName: 'aggregate3',
      args: [part.map((c) => ({ target: c.target, allowFailure: true, callData: c.data }))],
    });
    res.forEach((r, j) => { out[start + j] = { ok: r.success && r.returnData !== '0x', data: r.returnData }; });
  };
  // limited parallelism
  const queue = [...chunks];
  await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await run(queue.shift()); }));
  return out;
}

// calls: [{address, abi, functionName, args}] -> decoded result or null
async function multi(calls) {
  if (!calls.length) return [];
  const raws = await rawMulti(calls.map((c) => ({
    target: c.address, data: encodeFunctionData({ abi: c.abi, functionName: c.functionName, args: c.args || [] }),
  })));
  return raws.map((r, i) => {
    if (!r.ok) return null;
    try { return decodeFunctionResult({ abi: calls[i].abi, functionName: calls[i].functionName, data: r.data }); }
    catch { return null; }
  });
}

async function rs(params, tries = 4) {
  const url = RS + '?' + new URLSearchParams(params).toString();
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 429) { await sleep(1200 * (i + 1)); continue; }
      const j = await r.json();
      if (j.status === '1') return j.result;
      if (typeof j.result === 'string' && /rate|limit/i.test(j.result)) { await sleep(1200 * (i + 1)); continue; }
      if (/No transactions found|No records found/i.test(j.message || '') || Array.isArray(j.result)) return j.result || [];
      throw new Error(j.result || j.message);
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(800 * (i + 1));
    }
  }
  return [];
}

// Paginate an account list endpoint by block range.
const truncated = new Set();
async function rsAll(action, address, onProgress) {
  const PAGE = chain.pageMax, MAX = chain.historyMax;
  // newest first: for very active wallets the recent history (bridge withdrawals, last deposits) matters most
  let end = 999999999, all = [], seen = new Set();
  while (all.length < MAX) {
    const res = await rs({ module: 'account', action, address, startblock: 0, endblock: end, page: 1, offset: PAGE, sort: 'desc' });
    let added = 0;
    for (const t of res) {
      const k = t.hash + '|' + (t.logIndex ?? '') + '|' + (t.contractAddress || '') + '|' + (t.tokenID || '') + '|' + t.from + '|' + t.to + '|' + (t.value || '') + '|' + (t.traceId || '');
      if (seen.has(k)) continue;
      seen.add(k); all.push(t); added++;
    }
    onProgress?.(all.length);
    if (res.length < PAGE || added === 0) break;
    end = Number(res[res.length - 1].blockNumber);
  }
  if (all.length >= MAX) truncated.add(action);
  return all.reverse();
}

async function prices(addrs) {
  const keys = [...new Set(addrs.map(lc))].map((a) => (a === ETH ? 'coingecko:ethereum' : chain.llama + ':' + a));
  const out = {};
  for (let i = 0; i < keys.length; i += 60) {
    try {
      const r = await fetch(LLAMA + keys.slice(i, i + 60).join(','));
      const j = await r.json();
      for (const [k, v] of Object.entries(j.coins || {})) {
        const a = k === 'coingecko:ethereum' ? ETH : lc(k.split(':')[1]);
        out[a] = v.price;
      }
    } catch { /* price is optional */ }
  }
  return out;
}

const SPAM = /(https?:|www\.|\.(com|org|io|xyz|app|fi|net|gg|cc|me|vip|top|site|pro|live)\b|claim|visit|reward|airdrop|voucher|t\.me|t\.ly|bit\.ly|giveaway|bonus|\bgift\b|access\b|\bcode\b|\buse\b|redeem|eligible)/i;
// "BIast" with a capital i instead of l is a classic impersonation trick
const HOMOGLYPH = /BIast|8last|B1ast|[\u200b-\u200f\u2060-\u206f\u202a-\u202e\ufeff]|[\u0370-\u03ff\u0400-\u04ff][A-Za-z]|[A-Za-z][\u0370-\u03ff\u0400-\u04ff]/;
const isSpam = (name, symbol) => SPAM.test(name || '') || SPAM.test(symbol || '') || HOMOGLYPH.test((name || '') + (symbol || '')) || /^[!#$]/.test(name || '') || (symbol || '').length > 24;

const fmt = (raw, dec) => {
  // bigint -> float, safe for display
  const d = Number(dec ?? 18);
  const s = raw.toString().padStart(d + 1, '0');
  return Number(s.slice(0, s.length - d) + '.' + s.slice(s.length - d, s.length - d + 8));
};

// ---------- main scan ----------
async function scan(input, log = () => {}) {
  if (!isAddress(input)) throw new Error('Invalid address');
  const user = getAddress(input);
  const u = lc(user);
  const result = {
    address: user, chain: chain.key, scannedAt: new Date().toISOString(),
    wallet: [], lending: [], debts: [], lp: [], vaults: [], nftPositions: [], locks: [],
    deposits: [], sales: [], bridge: [], nfts: [], spam: [], unknown: [], notes: [],
  };

  truncated.clear();
  log('Loading transaction history…');
  const [tokentx, nfttx, txlist, internal, ethBal] = await Promise.all([
    rsAll('tokentx', user, (n) => log(`Token transfers loaded: ${n}`)),
    rsAll('tokennfttx', user),
    rsAll('txlist', user),
    rsAll('txlistinternal', user).catch(() => []),
    client.getBalance({ address: user }),
  ]);
  const tx1155 = await rsAll('token1155tx', user).catch(() => []);
  result.stats = { tokentx: tokentx.length, nfttx: nfttx.length, txlist: txlist.length, internal: internal.length };
  log(`History: ${tokentx.length} token transfers, ${nfttx.length} NFT transfers, ${txlist.length} transactions`);

  // ----- token balances -----
  const tokens = [...new Set(tokentx.map((t) => lc(t.contractAddress)))];
  const meta = {}; // addr -> {name, symbol, decimals}
  for (const t of tokentx) {
    const a = lc(t.contractAddress);
    if (!meta[a]) meta[a] = { name: t.tokenName, symbol: t.tokenSymbol, decimals: Number(t.tokenDecimal || 18) };
  }
  log(`Checking balances of ${tokens.length} tokens…`);
  const bals = await multi(tokens.map((t) => ({ address: t, abi: A.erc20, functionName: 'balanceOf', args: [user] })));
  const held = tokens.map((t, i) => ({ token: t, raw: bals[i] || 0n })).filter((x) => x.raw > 0n);

  // spam filter first (don't probe spam)
  const real = [];
  for (const h of held) {
    const m = meta[h.token];
    if (isSpam(m.name, m.symbol)) result.spam.push({ token: h.token, name: m.name, symbol: m.symbol });
    else real.push(h);
  }

  // ----- probe receipt-token interfaces -----
  log(`Decoding ${real.length} tokens (lending / LP / vaults)…`);
  const P = ['UNDERLYING_ASSET_ADDRESS', 'POOL', 'underlying', 'exchangeRateStored', 'comptroller', 'token0', 'token1', 'getReserves', 'asset', 'underlyingToken', 'TOKEN', 'token', 'factory'];
  const probeCalls = [];
  for (const h of real) {
    for (const fn of P) probeCalls.push({ address: h.token, abi: A.probe, functionName: fn });
    probeCalls.push({ address: h.token, abi: A.erc20, functionName: 'totalSupply' });
    probeCalls.push({ address: h.token, abi: A.probe, functionName: 'convertToAssets', args: [h.raw] });
    probeCalls.push({ address: h.token, abi: A.probe, functionName: 'toAmt', args: [h.raw] });
    probeCalls.push({ address: h.token, abi: A.probe, functionName: 'getStERC20ByNrERC20', args: [h.raw] });
  }
  const pr = await multi(probeCalls);
  const W = P.length + 4;
  const decoded = real.map((h, i) => {
    const r = pr.slice(i * W, i * W + W);
    const g = Object.fromEntries(P.map((fn, k) => [fn, r[k]]));
    g.totalSupply = r[P.length]; g.convertToAssets = r[P.length + 1]; g.toAmt = r[P.length + 2]; g.nrToSt = r[P.length + 3];
    return { ...h, ...meta[h.token], p: g };
  });

  // underlying metadata we may not know
  const needMeta = new Set();
  for (const d of decoded) {
    const p = d.p;
    for (const x of [p.UNDERLYING_ASSET_ADDRESS, p.underlying, p.token0, p.token1, p.asset, p.underlyingToken, p.TOKEN, p.token]) if (x) needMeta.add(lc(x));
  }
  await fillMeta([...needMeta].filter((a) => !meta[a]), meta);

  const priceList = new Set([ETH, ...held.map((h) => h.token), ...needMeta]);
  // positions classification
  const aavePools = new Set(), comptrollers = new Set();
  const pending = [];
  for (const d of decoded) {
    const p = d.p;
    const base = { token: d.token, name: d.name, symbol: d.symbol, decimals: d.decimals, raw: d.raw, amount: fmt(d.raw, d.decimals), protocol: label(d.token) };
    if (p.UNDERLYING_ASSET_ADDRESS) {
      const und = lc(p.UNDERLYING_ASSET_ADDRESS);
      const isDebt = /debt/i.test(d.name + ' ' + d.symbol);
      if (p.POOL) aavePools.add(lc(p.POOL));
      pending.push({ kind: isDebt ? 'debt' : 'lend', ...base, protocolGuess: protoFromName(d.name), pool: p.POOL && lc(p.POOL), underlying: und, undAmountRaw: d.raw });
    } else if (p.exchangeRateStored != null && p.comptroller) {
      const und = p.underlying ? lc(p.underlying) : ETH;
      comptrollers.add(lc(p.comptroller));
      pending.push({ kind: 'lend', ...base, protocolGuess: protoFromName(d.name), comptroller: lc(p.comptroller), underlying: und, undAmountRaw: (d.raw * p.exchangeRateStored) / 10n ** 18n });
    } else if (p.underlyingToken && p.toAmt != null) {
      pending.push({ kind: 'lend', ...base, protocolGuess: 'INIT Capital', underlying: lc(p.underlyingToken), undAmountRaw: p.toAmt });
    } else if (p.token0 && p.token1 && p.getReserves && p.totalSupply) {
      const [r0, r1] = p.getReserves;
      // LP tokens are often all named "Uniswap V2": the factory tells which DEX it really is
      pending.push({ kind: 'lp', ...base, protocol: base.protocol || label(p.factory) || '', token0: lc(p.token0), token1: lc(p.token1), amt0Raw: (r0 * d.raw) / p.totalSupply, amt1Raw: (r1 * d.raw) / p.totalSupply });
    } else if (p.asset && p.convertToAssets != null) {
      pending.push({ kind: 'vault', ...base, underlying: lc(p.asset), undAmountRaw: p.convertToAssets });
    } else if (p.TOKEN && p.nrToSt != null) {
      // Blast NrETH / NrUSDB wrappers: value comes from the unwrap rate, not 1:1
      pending.push({ kind: 'vault', ...base, protocol: base.protocol || 'Blast · Nr wrapper', underlying: lc(p.TOKEN), undAmountRaw: p.nrToSt });
    } else if (p.token && /^fw|few wrapped/i.test((d.symbol || '') + ' ' + (d.name || ''))) {
      // Ring Few wrapped tokens are 1:1 with token()
      pending.push({ kind: 'vault', ...base, protocol: 'Ring Few', underlying: lc(p.token), undAmountRaw: d.raw });
    } else {
      pending.push({ kind: 'wallet', ...base });
    }
  }

  // ----- Compound-style borrows -----
  const ctokenMarkets = [];
  if (comptrollers.size) {
    const cs = [...comptrollers];
    const ins = await multi(cs.map((c) => ({ address: c, abi: A.comptroller, functionName: 'getAssetsIn', args: [user] })));
    cs.forEach((c, i) => (ins[i] || []).forEach((m) => ctokenMarkets.push({ comptroller: c, market: lc(m) })));
    const bb = await multi(ctokenMarkets.flatMap((m) => [
      { address: m.market, abi: A.ctoken, functionName: 'borrowBalanceStored', args: [user] },
      { address: m.market, abi: A.ctoken, functionName: 'underlying' },
      { address: m.market, abi: A.ctoken, functionName: 'symbol' },
    ]));
    const extra = [];
    ctokenMarkets.forEach((m, i) => {
      const b = bb[i * 3], und = bb[i * 3 + 1] ? lc(bb[i * 3 + 1]) : ETH;
      if (b && b > 0n) { extra.push(und); pending.push({ kind: 'debt', token: m.market, symbol: bb[i * 3 + 2], comptroller: m.comptroller, underlying: und, undAmountRaw: b, protocolGuess: protoFromName(bb[i * 3 + 2] || '') }); }
    });
    await fillMeta(extra.filter((a) => a !== ETH && !meta[a]), meta);
    extra.forEach((a) => priceList.add(a));
  }

  // ----- Aave-style account summaries -----
  if (aavePools.size) {
    const ps = [...aavePools];
    const acc = await multi(ps.map((p) => ({ address: p, abi: A.aavePool, functionName: 'getUserAccountData', args: [user] })));
    ps.forEach((p, i) => {
      if (!acc[i]) return;
      const [col, debt, , , , hf] = acc[i];
      if (col === 0n && debt === 0n) return;
      result.lending.push({
        pool: p, protocol: label(p) || pending.find((x) => x.pool === p)?.protocolGuess || 'Aave-fork',
        collateralUsd: Number(col) / 1e8, debtUsd: Number(debt) / 1e8,
        healthFactor: debt > 0n ? Number(hf) / 1e18 : null,
      });
    });
  }

  if (chain.key === 'blast') {
    // ----- Juice Finance (positions live in per-user account contracts) -----
    try { await juice(user, pending, meta, priceList); } catch (e) { result.notes.push('Juice Finance: ' + e.message); }
    // ----- internal balances: Ambient surplus, SynFutures margin -----
    try { await internalBalances(user, u, tokentx, meta, priceList, pending); } catch (e) { result.notes.push('Ambient / SynFutures check failed: ' + e.message); }
  }

  // ----- NFTs: held + deposited in contracts -----
  log('Checking NFTs and LP positions…');
  const nftState = new Map(); // contract|id -> last transfer
  for (const t of nfttx) nftState.set(lc(t.contractAddress) + '|' + t.tokenID, t);
  const nftCands = [...nftState.values()].filter((t) => lc(t.to) === u || lc(t.from) === u);
  const owners = await multi(nftCands.map((t) => ({ address: t.contractAddress, abi: A.nft, functionName: 'ownerOf', args: [BigInt(t.tokenID)] })));
  const heldNfts = [], depositedNfts = [];
  const codeCheck = new Set();
  nftCands.forEach((t, i) => {
    const o = owners[i] && lc(owners[i]);
    if (!o) return;
    if (o === u) heldNfts.push({ t, owner: o });
    else if (lc(t.from) === u && o === lc(t.to) && o !== ZERO) { depositedNfts.push({ t, owner: o }); codeCheck.add(o); }
  });
  const codes = await getCodes([...codeCheck]);
  const allNft = [...heldNfts, ...depositedNfts.filter((d) => codes[d.owner])];
  await decodeNfts(allNft, u, meta, result, priceList);
  try { await erc1155(u, tx1155, txlist, result); } catch { /* optional */ }

  // ----- "went in and never came back" heuristic -----
  log('Looking for deposits without receipt tokens (staking, farms)…');
  let deps = depositHeuristic(u, tokentx, nfttx, txlist, internal);
  // rank candidates by value so very active wallets stay fast
  if (deps.length > 40) {
    const dp = await prices(deps.map((d) => d.token));
    await fillMeta(deps.map((d) => d.token).filter((a) => a !== ETH && !meta[a] && dp[a] != null), meta);
    const val = (d) => (dp[d.token] != null ? fmt(d.raw, d.token === ETH ? 18 : meta[d.token]?.decimals ?? 18) * dp[d.token] : -1);
    deps.forEach((d) => { d._v = val(d); });
    const priced = deps.filter((d) => d._v >= 1).sort((a, b) => b._v - a._v).slice(0, 50);
    const unpriced = deps.filter((d) => d._v < 0).sort((a, b) => b.last - a.last).slice(0, 15);
    deps = [...priced, ...unpriced];
    result.notes.push('Very active wallet: the deposit search was limited to the largest candidates.');
  }
  deps.forEach((d) => { d.cluster = d.cluster.slice(0, 6); });
  const depAddrs = new Set();
  deps.forEach((d) => d.cluster.forEach((a) => depAddrs.add(a)));
  const depCodes = await getCodes([...depAddrs].filter((a) => !(a in codes)));
  Object.assign(codes, depCodes);
  const depFiltered = deps.filter((d) => d.cluster.some((a) => codes[a]));
  await fillMeta(depFiltered.map((d) => d.token).filter((a) => a !== ETH && !meta[a]), meta);
  depFiltered.forEach((d) => priceList.add(d.token));

  // ----- bridge withdrawals -----
  log('Checking unfinished bridge withdrawals on Ethereum…');
  try {
    result.bridge = chain.withdrawals === 'zk' ? await zkWithdrawals(u, txlist, tokentx) : await bridgeWithdrawals(u, txlist, tokentx, meta);
  } catch (e) { result.notes.push('Bridge check failed: ' + e.message); }
  result.bridge.forEach((b) => b.token && priceList.add(b.token));

  // ----- prices -----
  log('Fetching prices…');
  const px = await prices([...priceList]);
  if (px[BLUR_POOL] == null && px[ETH] != null) px[BLUR_POOL] = px[ETH]; // Blur Pool is ETH 1:1
  if (meta[BLUR_POOL] && !meta[BLUR_POOL].symbol) meta[BLUR_POOL].symbol = 'Blur Pool ETH';
  await priceLps(depFiltered.map((d) => d.token).filter((t) => t !== ETH && px[t] == null), px, meta);
  result.prices = px;
  const usd = (addr, raw) => {
    const a = lc(addr);
    const dec = a === ETH ? 18 : meta[a]?.decimals ?? 18;
    const amt = fmt(raw, dec);
    return { amount: amt, usd: px[a] != null ? amt * px[a] : null, symbol: a === ETH ? 'ETH' : meta[a]?.symbol };
  };

  // native ETH
  if (ethBal > 0n) result.wallet.push({ token: ETH, symbol: 'ETH', name: 'Ether', ...usd(ETH, ethBal), protocol: 'Native' });

  for (const x of pending) {
    if (x.kind === 'wallet' && x.amount === 0) continue; // dust
    if (x.kind === 'wallet') {
      const v = usd(x.token, x.raw);
      const row = { token: x.token, symbol: x.symbol || v.symbol, name: x.name, amount: v.amount, usd: v.usd, protocol: x.protocol };
      if (v.usd == null) result.unknown.push(row); else result.wallet.push(row);
    } else if (x.kind === 'lend' || x.kind === 'debt') {
      const v = usd(x.underlying, x.undAmountRaw);
      if (v.amount === 0) continue;
      (x.kind === 'lend' ? result.vaults : result.debts).push({
        type: x.kind === 'lend' ? 'Supplied / lending' : 'Debt', token: x.token, receipt: x.symbol, name: x.name,
        protocol: x.protocol || x.protocolGuess || '', underlying: x.underlying, underlyingSymbol: v.symbol, account: x.account, pool: x.pool, comptroller: x.comptroller,
        amount: v.amount, usd: v.usd ?? (px[x.token] != null && x.amount ? x.amount * px[x.token] : null),
      });
    } else if (x.kind === 'vault') {
      const v = usd(x.underlying, x.undAmountRaw);
      result.vaults.push({ type: 'Vault', token: x.token, receipt: x.symbol, name: x.name, protocol: x.protocol || protoFromName(x.name) || '', underlying: x.underlying, underlyingSymbol: v.symbol, amount: v.amount, usd: v.usd ?? (px[x.token] != null ? x.amount * px[x.token] : null) });
    } else if (x.kind === 'lp') {
      const a = usd(x.token0, x.amt0Raw), b = usd(x.token1, x.amt1Raw);
      const known = [a.usd, b.usd].filter((v) => v != null);
      result.lp.push({
        type: 'LP token (V2)', token: x.token, receipt: x.symbol, name: x.name, protocol: x.protocol || protoFromName(x.name) || '',
        parts: [{ symbol: a.symbol, amount: a.amount, usd: a.usd }, { symbol: b.symbol, amount: b.amount, usd: b.usd }],
        usd: known.length ? known.reduce((s, v) => s + v, 0) * (known.length === 1 ? 2 : 1) : null,
      });
    }
  }

  // nft positions valuation
  for (const p of result.nftPositions) {
    if (p.amt0Raw == null) continue;
    const a = usd(p.token0, p.amt0Raw), b = usd(p.token1, p.amt1Raw);
    const o0 = usd(p.token0, p.owed0Raw || 0n), o1 = usd(p.token1, p.owed1Raw || 0n);
    p.parts = [{ symbol: a.symbol, amount: a.amount + o0.amount, usd: a.usd != null ? a.usd + (o0.usd || 0) : null }, { symbol: b.symbol, amount: b.amount + o1.amount, usd: b.usd != null ? b.usd + (o1.usd || 0) : null }];
    const known = p.parts.map((x) => x.usd).filter((v) => v != null);
    p.usd = known.length ? known.reduce((s, v) => s + v, 0) : null;
    delete p.amt0Raw; delete p.amt1Raw; delete p.owed0Raw; delete p.owed1Raw;
  }
  for (const l of result.locks) {
    if (l.raw == null) continue;
    const v = usd(l.lockToken, l.raw); l.amount = v.amount; l.usd = v.usd; l.symbol = v.symbol; delete l.raw;
  }

  // deposits: verify with getters + contract holdings
  await verifyDeposits(depFiltered, u, codes, result, usd, meta);

  for (const b of result.bridge) {
    if (b.token && b.raw != null) { const v = usd(b.token, b.raw); b.amount = v.amount; b.usd = v.usd; b.symbol = v.symbol; delete b.raw; }
  }

  // totals
  const sum = (arr) => arr.reduce((s, x) => s + (x.usd || 0), 0);
  result.totals = {
    wallet: sum(result.wallet),
    positions: sum(result.vaults) + sum(result.lp) + sum(result.nftPositions) + sum(result.locks),
    debt: sum(result.debts),
    possible: sum(result.deposits.filter((d) => d.confidence === 'high')),
    likely: sum(result.deposits.filter((d) => d.confidence === 'medium')),
    bridgePending: sum(result.bridge.filter((b) => b.status !== 'finalized')),
    bridgeClaimable: sum(result.bridge.filter((b) => b.status === 'claimable' || b.status === 'proven')),
  };
  result.totals.net = result.totals.wallet + result.totals.positions - result.totals.debt;
  for (const k of ['wallet', 'vaults', 'lp', 'nftPositions', 'debts', 'deposits', 'locks', 'sales']) result[k].sort((a, b) => (b.usd || 0) - (a.usd || 0));
  if (truncated.size) result.notes.push(`Very active wallet: only the most recent ${chain.historyMax.toLocaleString('en-US')} records of history were scanned.`);
  log('Done');
  return result;
}

const JUICE_POOLS = ['0x4a1d9220e11a47d8ab22ccd82da616740cf0920a', '0x44f33bc796f7d3df55040cd3c631628b560715c2', '0x788654040d7e9a8bb583d7d8ccea1ebf1ae4ac06', '0x60ed5493b35f833189406dfec0b631a6b5b57f66'];
const JUICE_MGRS = ['0x6301795aa55b90427cf74c18c8636e0443f2100b', '0x105e285f1a2370d325046fed1424d4e73f6fa2b0', '0x23eba06981b5c2a6f1a985bdce41bd64d18e6dfa', '0xc81a630806d1af3fd7509187e1afc501fd46e818', '0x32b6c6322939263029a5cf37f14a59ab0a9e277c', '0xc877b52c628dba77fc55f1ddb140747155c9b39d', '0xace661bf726bd8afe6f6594c559a5136489e64f9', '0x4dee8034019f03f1a025dbfb4bbc159d7baa7a0a'];

async function juice(user, pending, meta, priceList) {
  const pr = await multi(JUICE_POOLS.flatMap((p) => [
    { address: p, abi: A.juicePool, functionName: 'getDepositAmount', args: [user] },
    { address: p, abi: A.juicePool, functionName: 'getAsset' },
  ]));
  const mg = await multi(JUICE_MGRS.flatMap((m) => [
    { address: m, abi: A.juiceMgr, functionName: 'getAccount', args: [user] },
    { address: m, abi: A.juiceMgr, functionName: 'balanceOfAssets', args: [user] },
    { address: m, abi: A.juiceMgr, functionName: 'getLendAsset' },
  ]));
  const found = [];
  JUICE_POOLS.forEach((p, i) => {
    const amt = pr[i * 2], asset = pr[i * 2 + 1] && lc(pr[i * 2 + 1]);
    if (amt > 1000n && asset) found.push({ kind: 'lend', token: p, symbol: 'Juice lending', name: label(p), protocol: label(p), underlying: asset, undAmountRaw: amt });
  });
  const accts = JUICE_MGRS.map((m, i) => ({ m, acct: mg[i * 3], col: mg[i * 3 + 1] || 0n, lend: mg[i * 3 + 2] && lc(mg[i * 3 + 2]) }))
    .filter((x) => x.acct && x.acct !== ZERO);
  if (accts.length) {
    const r = await multi(accts.flatMap((x) => [
      { address: x.m, abi: A.juiceMgr, functionName: 'getDebtAmount', args: [x.acct] },
      { address: x.acct, abi: A.juiceMgr, functionName: 'asset' },
    ]));
    accts.forEach((x, i) => {
      const debt = r[i * 2] || 0n, colAsset = r[i * 2 + 1] && lc(r[i * 2 + 1]);
      const name = 'Juice Finance · account ' + x.acct.slice(0, 8) + '…';
      if (x.col > 1000n && colAsset) found.push({ kind: 'lend', token: x.m, symbol: 'collateral', name, protocol: 'Juice Finance', underlying: colAsset, undAmountRaw: x.col, account: lc(x.acct) });
      if (debt > 1000n && debt < 10n ** 30n && x.lend) found.push({ kind: 'debt', token: x.m, symbol: 'debt', name, protocol: 'Juice Finance', underlying: x.lend, undAmountRaw: debt, account: lc(x.acct) });
    });
  }
  if (!found.length) return;
  await fillMeta(found.map((f) => f.underlying).filter((a) => !meta[a]), meta);
  found.forEach((f) => priceList.add(f.underlying));
  // Juice receipt tokens are now represented by the adapter rows
  for (let i = pending.length - 1; i >= 0; i--) if (pending[i].kind === 'wallet' && /^Juice /.test(pending[i].name || '')) pending.splice(i, 1);
  pending.push(...found);
}

const BLUR_POOL = '0xb772d5c5f4a2eef67dfbc89aa658d2711341b8e5';
const AMBIENT_QUERY = '0xA3BD3bE19012De72190c885FB270beb93e36a8A7';
const AMBIENT_DEX = '0xaaaaaaaaffe404ee9433eef0094b6382d81fb958';
const SYN_GATE = '0x6a372dbc1968f4a07cf2ce352f410962a972c257';
const USDB = '0x4300000000000000000000000000000000000003', WETH = '0x4300000000000000000000000000000000000004';

async function internalBalances(user, u, tokentx, meta, priceList, pending) {
  // tokens this wallet ever moved, most frequent first
  const freq = {};
  for (const t of tokentx) freq[lc(t.contractAddress)] = (freq[lc(t.contractAddress)] || 0) + 1;
  const touched = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).filter((a) => !isSpam(meta[a]?.name, meta[a]?.symbol)).slice(0, 40);
  const ambTokens = [ZERO, ...new Set([USDB, WETH, ...touched])];
  const sentToGate = new Set(tokentx.filter((t) => lc(t.from) === u && lc(t.to) === SYN_GATE).map((t) => lc(t.contractAddress)));
  const synQuotes = [...new Set([USDB, WETH, ...sentToGate])];
  const r = await multi([
    ...ambTokens.map((t) => ({ address: AMBIENT_QUERY, abi: A.ambient, functionName: 'querySurplus', args: [user, t] })),
    ...synQuotes.map((q) => ({ address: SYN_GATE, abi: A.synGate, functionName: 'reserveOf', args: [q, user] })),
  ]);
  const found = [];
  ambTokens.forEach((t, i) => {
    const v = r[i];
    if (v && v > 1000n) found.push({ kind: 'lend', token: AMBIENT_DEX, symbol: 'surplus', name: 'Ambient · surplus balance inside the DEX', protocol: 'Ambient', underlying: t === ZERO ? ETH : t, undAmountRaw: v });
  });
  synQuotes.forEach((q, i) => {
    const v = r[ambTokens.length + i];
    if (v && v > 1000n) found.push({ kind: 'lend', token: SYN_GATE, symbol: 'margin', name: 'SynFutures V3 · margin in Gate (open positions not included)', protocol: 'SynFutures', underlying: q, undAmountRaw: v });
  });
  if (!found.length) return;
  await fillMeta(found.map((f) => f.underlying).filter((a) => a !== ETH && !meta[a]), meta);
  found.forEach((f) => priceList.add(f.underlying));
  pending.push(...found);
}

// ERC-1155 received in the user's own transactions (unsolicited airdrops are ignored)
async function erc1155(u, tx1155, txlist, result) {
  const mine = new Set(txlist.filter((t) => lc(t.from) === u).map((t) => t.hash));
  const cands = new Map();
  for (const t of tx1155) if (lc(t.to) === u && mine.has(t.hash)) cands.set(lc(t.contractAddress) + '|' + t.tokenID, t);
  const list = [...cands.values()].slice(0, 60);
  if (!list.length) return;
  const b = await multi(list.map((t) => ({ address: t.contractAddress, abi: A.e1155, functionName: 'balanceOf', args: [u, BigInt(t.tokenID)] })));
  list.forEach((t, i) => {
    if (!b[i] || b[i] === 0n) return;
    result.nfts.push({ collection: t.tokenName || label(t.contractAddress) || 'ERC-1155', contract: lc(t.contractAddress), tokenId: t.tokenID, heldBy: 'wallet', heldByLabel: null, erc1155: true, count: b[i].toString() });
  });
}

// value V2 LP tokens that have no market price (e.g. LP staked in farms)
async function priceLps(tokens, px, meta) {
  tokens = [...new Set(tokens)];
  if (!tokens.length) return;
  const r = await multi(tokens.flatMap((t) => [
    { address: t, abi: A.probe, functionName: 'token0' }, { address: t, abi: A.probe, functionName: 'token1' },
    { address: t, abi: A.probe, functionName: 'getReserves' }, { address: t, abi: A.erc20, functionName: 'totalSupply' },
  ]));
  const lps = tokens.map((t, i) => ({ t, t0: r[i * 4] && lc(r[i * 4]), t1: r[i * 4 + 1] && lc(r[i * 4 + 1]), res: r[i * 4 + 2], ts: r[i * 4 + 3] }))
    .filter((x) => x.t0 && x.t1 && x.res && x.ts);
  if (!lps.length) return;
  await fillMeta(lps.flatMap((x) => [x.t0, x.t1]).filter((a) => !meta[a]), meta);
  Object.assign(px, await prices(lps.flatMap((x) => [x.t0, x.t1]).filter((a) => px[a] == null)));
  for (const x of lps) {
    const v0 = px[x.t0] != null ? fmt(x.res[0], meta[x.t0]?.decimals ?? 18) * px[x.t0] : null;
    const v1 = px[x.t1] != null ? fmt(x.res[1], meta[x.t1]?.decimals ?? 18) * px[x.t1] : null;
    const tvl = v0 != null && v1 != null ? v0 + v1 : v0 != null ? 2 * v0 : v1 != null ? 2 * v1 : null;
    if (tvl != null) px[x.t] = tvl / fmt(x.ts, meta[x.t]?.decimals ?? 18);
  }
}

function protoFromName(n = '') {
  const s = n.toLowerCase();
  const map = [['pac finance', 'Pac Finance'], ['pac ', 'Pac Finance'], ['parallel', 'Parallel'], ['wasabi', 'Wasabi'], ['hyper', 'Hyperlock'], ['zerolend', 'ZeroLend'], ['z0', 'ZeroLend'], ['orbit', 'Orbit Protocol'], ['init', 'INIT Capital'], ['juice', 'Juice Finance'],
    ['thruster', 'Thruster'], ['blaster', 'Blasterswap'], ['ring', 'Ring'], ['monoswap', 'MonoSwap'], ['fenix', 'Fenix'], ['blade', 'BladeSwap'], ['hyper', 'Hyperlock'],
    ['particle', 'Particle'], ['wasabi', 'Wasabi'], ['cybro', 'Cybro'], ['kalax', 'Kalax'], ['seismic', 'Seismic'], ['aso', 'Aso Finance'], ['duo', 'Particle DUO'], ['uniswap', 'Uniswap'], ['sushi', 'SushiSwap'], ['dyor', 'DyorSwap']];
  for (const [k, v] of map) if (s.includes(k)) return v;
  return '';
}

async function fillMeta(addrs, meta) {
  addrs = [...new Set(addrs)].filter((a) => a && a !== ETH);
  if (!addrs.length) return;
  const r = await multi(addrs.flatMap((a) => [
    { address: a, abi: A.erc20, functionName: 'symbol' },
    { address: a, abi: A.erc20, functionName: 'decimals' },
    { address: a, abi: A.erc20, functionName: 'name' },
  ]));
  addrs.forEach((a, i) => { meta[a] = { symbol: r[i * 3] || '?', decimals: r[i * 3 + 1] ?? 18, name: r[i * 3 + 2] || '' }; });
}

async function getCodes(addrs) {
  const out = {};
  const q = [...addrs];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (q.length) {
      const a = q.shift();
      try { const c = await client.getCode({ address: a }); out[a] = !!(c && c !== '0x'); } catch { out[a] = false; }
    }
  }));
  return out;
}

// ---- Uniswap V3 / Algebra LP NFTs, veNFT locks, other NFTs ----
const W = (hex, i) => BigInt('0x' + hex.slice(2 + i * 64, 2 + (i + 1) * 64));
const addrW = (hex, i) => '0x' + hex.slice(2 + i * 64 + 24, 2 + (i + 1) * 64);
const i24 = (x) => { const v = Number(x & 0xffffffn); return v >= 0x800000 ? v - 0x1000000 : v; };
const i128 = (x) => { const v = x & ((1n << 128n) - 1n); return v >= 1n << 127n ? v - (1n << 128n) : v; };

async function decodeNfts(list, u, meta, result, priceList) {
  if (!list.length) return;
  const contracts = [...new Set(list.map((x) => lc(x.t.contractAddress)))];
  const posData = await rawMulti(list.map((x) => ({ target: x.t.contractAddress, data: '0x99fbab88' + BigInt(x.t.tokenID).toString(16).padStart(64, '0') }))); // positions(uint256)
  const lockData = await rawMulti(list.map((x) => ({ target: x.t.contractAddress, data: '0xb45a3c0e' + BigInt(x.t.tokenID).toString(16).padStart(64, '0') }))); // locked(uint256)
  const streamData = await multi(list.flatMap((x) => [
    { address: x.t.contractAddress, abi: A.stream, functionName: 'withdrawableAmountOf', args: [BigInt(x.t.tokenID)] },
    { address: x.t.contractAddress, abi: A.stream, functionName: 'getAsset', args: [BigInt(x.t.tokenID)] },
    { address: x.t.contractAddress, abi: A.stream, functionName: 'getUnderlyingToken', args: [BigInt(x.t.tokenID)] },
  ]));
  const cinfo = await multi(contracts.flatMap((c) => [
    { address: c, abi: A.nft, functionName: 'name' },
    { address: c, abi: A.nft, functionName: 'factory' },
    { address: c, abi: A.nft, functionName: 'token' },
  ]));
  const C = {};
  contracts.forEach((c, i) => { C[c] = { name: cinfo[i * 3], factory: cinfo[i * 3 + 1] && lc(cinfo[i * 3 + 1]), token: cinfo[i * 3 + 2] && lc(cinfo[i * 3 + 2]) }; });

  const positions = [];
  list.forEach((x, i) => {
    const c = lc(x.t.contractAddress);
    const where = x.owner === u ? 'wallet' : x.owner;
    const base = { collection: C[c].name || x.t.tokenName, contract: c, tokenId: x.t.tokenID, heldBy: where, heldByLabel: where === 'wallet' ? null : label(where) };
    const pd = posData[i];
    if (pd.ok && (pd.data.length - 2) / 64 >= 11) {
      const n = (pd.data.length - 2) / 64;
      let p;
      const w4 = W(pd.data, 4);
      if (n >= 12 && w4 > 0n && w4 < 1n << 24n) {
        p = { kind: 'uni', fee: Number(w4), tl: i24(W(pd.data, 5)), tu: i24(W(pd.data, 6)), L: W(pd.data, 7), o0: W(pd.data, 10), o1: W(pd.data, 11) };
      } else if (n >= 12) {
        p = { kind: 'algebraIntegral', deployer: addrW(pd.data, 4), tl: i24(W(pd.data, 5)), tu: i24(W(pd.data, 6)), L: W(pd.data, 7), o0: W(pd.data, 10), o1: W(pd.data, 11) };
      } else {
        p = { kind: 'algebra', tl: i24(W(pd.data, 4)), tu: i24(W(pd.data, 5)), L: W(pd.data, 6), o0: W(pd.data, 9), o1: W(pd.data, 10) };
      }
      p.t0 = lc(addrW(pd.data, 2)); p.t1 = lc(addrW(pd.data, 3));
      if (p.L === 0n && p.o0 === 0n && p.o1 === 0n) return; // empty, closed position
      positions.push({ base, p, c });
      return;
    }
    const ld = lockData[i];
    if (ld.ok && (ld.data.length - 2) / 64 >= 2 && C[c].token) {
      const amt = i128(W(ld.data, 0)), end = Number(W(ld.data, 1));
      const perm = (ld.data.length - 2) / 64 >= 3 && W(ld.data, 2) === 1n;
      if (amt > 0n) {
        priceList.add(C[c].token);
        result.locks.push({ ...base, type: 'Vote-escrow lock', lockToken: C[c].token, raw: amt, unlock: perm ? 'permanent' : end ? new Date(end * 1000).toISOString().slice(0, 10) : '?', unlocked: !perm && end * 1000 < Date.now() });
        return;
      }
    }
    // vesting streams (Sablier-style): withdrawable right now
    const sw = streamData[i * 3], sa = streamData[i * 3 + 1] || streamData[i * 3 + 2];
    if (sa && sw != null) {
      if (sw > 0n) { priceList.add(lc(sa)); result.locks.push({ ...base, type: 'Vesting stream', stream: true, lockToken: lc(sa), raw: sw, unlock: 'now', unlocked: true }); }
      return;
    }
    if (isSpam(base.collection, '') || /chance|winner|congrat|voucher|ticket/i.test(base.collection || '')) { result.spam.push({ token: c, name: base.collection, symbol: 'NFT' }); return; }
    result.nfts.push({ ...base });
  });
  if (!positions.length) return;

  // pool lookup
  const lookups = positions.map(({ p, c }) => {
    const f = C[c].factory;
    if (!f) return null;
    if (p.kind === 'uni') return { address: f, abi: A.v3, functionName: 'getPool', args: [p.t0, p.t1, p.fee] };
    if (p.kind === 'algebraIntegral' && p.deployer !== ZERO) return { address: f, abi: A.v3, functionName: 'customPoolByPair', args: [p.deployer, p.t0, p.t1] };
    return { address: f, abi: A.v3, functionName: 'poolByPair', args: [p.t0, p.t1] };
  });
  const pools = await multi(lookups.map((l) => l || { address: ZERO, abi: A.v3, functionName: 'poolByPair', args: [ZERO, ZERO] }));
  const retry = positions.map(({ p, c }, i) => (p.kind === 'uni' && !pools[i] && C[c].factory && p.fee < 2 ** 23 ? i : -1)).filter((i) => i >= 0);
  if (retry.length) {
    const alt = await multi(retry.map((i) => ({ address: C[positions[i].c].factory, abi: A.slipstream, functionName: 'getPool', args: [positions[i].p.t0, positions[i].p.t1, positions[i].p.fee] })));
    retry.forEach((i, k) => { if (alt[k] && alt[k] !== ZERO) pools[i] = alt[k]; });
  }
  // slot0() 0x3850c7bd / globalState() 0xe76c01e4 — first word is sqrtPriceX96 in both
  const st = await rawMulti(positions.map(({ p }, i) => ({ target: pools[i] || ZERO, data: p.kind === 'uni' ? '0x3850c7bd' : '0xe76c01e4' })));
  await fillMeta(positions.flatMap(({ p }) => [p.t0, p.t1]).filter((a) => !meta[a]), meta);

  positions.forEach(({ base, p, c }, i) => {
    priceList.add(p.t0); priceList.add(p.t1);
    const row = { ...base, type: p.kind === 'uni' ? 'Concentrated LP (V3)' : 'Concentrated LP (Algebra)', protocol: label(base.contract) || label(C[c].factory) || protoFromName(base.collection) || base.collection, token0: p.t0, token1: p.t1, owed0Raw: p.o0, owed1Raw: p.o1 };
    if (st[i].ok && pools[i]) {
      const sqrtP = Number(W(st[i].data, 0)) / 2 ** 96;
      const sa = Math.pow(1.0001, p.tl / 2), sb = Math.pow(1.0001, p.tu / 2), L = Number(p.L);
      let a0 = 0, a1 = 0;
      if (sqrtP <= sa) a0 = (L * (sb - sa)) / (sa * sb);
      else if (sqrtP < sb) { a0 = (L * (sb - sqrtP)) / (sqrtP * sb); a1 = L * (sqrtP - sa); }
      else a1 = L * (sb - sa);
      row.amt0Raw = BigInt(Math.floor(a0)); row.amt1Raw = BigInt(Math.floor(a1));
      row.inRange = sqrtP > sa && sqrtP < sb;
    } else {
      row.amt0Raw = 0n; row.amt1Raw = 0n; row.note = 'Pool not found, check manually';
    }
    result.nftPositions.push(row);
  });
}

// ---- deposit heuristic ----
// fees and games: money was spent, not deposited and not a token sale
const FEE_FN = /^(join|register|subscribe|donate|tip|pay)\b/i;
const GAME_FN = /^(bet|play|spin|roll|guess|enter|createGame|placeBet|flip|draw)\b/i;
// calls that usually buy a token or an allocation
const SALE_FN = /^(buy|purchase|contribute|commit|participate|presale|mint|bid|invest|swapExactETH|purchaseTokens|joinSale)/i;
const SALE_NAME = /sale|presale|launch|ido\b|ico\b|fair|crowd|seed|vesting|allocation|contribution|whitelist|pad\b|starter/i;
const GENERIC_NAME = /^(proxy|transparentupgradeableproxy|erc1967proxy|beaconproxy|uupsproxy|adminupgradeabilityproxy|contract)$/i;

function depositHeuristic(u, tokentx, nfttx, txlist, internal) {
  const byHash = new Map();
  const g = (h) => { if (!byHash.has(h)) byHash.set(h, { outs: [], ins: [], nftIn: 0 }); return byHash.get(h); };
  for (const t of tokentx) {
    const v = BigInt(t.value || 0);
    if (v === 0n) continue;
    if (lc(t.from) === u) g(t.hash).outs.push({ token: lc(t.contractAddress), cp: lc(t.to), v });
    if (lc(t.to) === u) g(t.hash).ins.push({ token: lc(t.contractAddress), cp: lc(t.from), v });
  }
  for (const t of nfttx) if (lc(t.to) === u) g(t.hash).nftIn++;
  for (const t of internal) {
    const v = BigInt(t.value || 0);
    if (v > 0n && lc(t.to) === u && t.isError !== '1') g(t.hash).ins.push({ token: ETH, cp: lc(t.from), v });
  }
  // union-find over contracts touched in the same deposit/withdraw tx
  const parent = {};
  const find = (a) => { parent[a] ??= a; return parent[a] === a ? a : (parent[a] = find(parent[a])); };
  const union = (a, b) => { parent[find(a)] = find(b); };
  const events = [];
  for (const tx of txlist) {
    if (lc(tx.from) !== u || tx.isError === '1' || !tx.to) continue;
    const to = lc(tx.to);
    if (BRIDGES.has(to) || WRAPPERS.has(to)) continue;
    const fn = tx.functionName || '';
    if (FEE_FN.test(fn) || GAME_FN.test(fn)) continue;
    const e = byHash.get(tx.hash) || { outs: [], ins: [], nftIn: 0 };
    const outs = [...e.outs];
    const val = BigInt(tx.value || 0);
    if (val > 0n) outs.push({ token: ETH, cp: to, v: val });
    if (outs.length && !e.ins.length && !e.nftIn) {
      for (const o of outs) {
        if (o.token === to) continue; // plain ERC20 transfer
        if (o.cp === u) continue;
        union(to, o.cp);
        events.push({ dir: 1, token: o.token, keys: [to, o.cp], v: o.v, hash: tx.hash, ts: Number(tx.timeStamp), sale: SALE_FN.test(fn), fn: fn.split('(')[0] });
      }
    } else if (e.ins.length && !outs.length) {
      for (const i of e.ins) {
        if (i.cp !== ZERO) union(to, i.cp);
        events.push({ dir: -1, token: i.token, keys: [to, i.cp], v: i.v, hash: tx.hash, ts: Number(tx.timeStamp) });
      }
    }
  }
  const net = new Map();
  const paidBack = {}; // root -> Map(token -> amount received from this cluster)
  for (const ev of events) {
    const root = find(ev.keys[0]);
    const k = root + '|' + ev.token;
    if (!net.has(k)) net.set(k, { root, token: ev.token, in: 0n, out: 0n, txs: [], last: 0, first: 0, sale: false, fns: new Set() });
    const n = net.get(k);
    if (ev.dir === 1) {
      n.in += ev.v; n.txs.push(ev.hash); n.last = Math.max(n.last, ev.ts); n.first = n.first ? Math.min(n.first, ev.ts) : ev.ts;
      if (ev.sale) n.sale = true;
      if (ev.fn) n.fns.add(ev.fn);
    } else {
      n.out += ev.v;
      const m = (paidBack[root] ??= new Map());
      m.set(ev.token, (m.get(ev.token) || 0n) + ev.v);
    }
  }
  const clusters = {};
  for (const a of Object.keys(parent)) (clusters[find(a)] ??= new Set()).add(a);
  const res = [];
  for (const n of net.values()) {
    if (n.in <= n.out) continue;
    // other tokens the contract paid out: the remainder was most likely the price of them (fair launch, mint, sale)
    const received = [...(paidBack[n.root] || new Map())].filter(([t]) => t !== n.token).map(([token, raw]) => ({ token, raw }));
    res.push({
      settled: received.length > 0, received, saleFn: n.sale, fns: [...n.fns],
      token: n.token, raw: n.in - n.out, deposited: n.in, withdrawn: n.out,
      cluster: [...clusters[n.root]].filter((a) => a !== ZERO && a !== u), txs: n.txs.slice(-3), last: n.last, first: n.first,
    });
  }
  return res;
}

// Human name for a contract: our label, the token it is, or the verified source name (looking through proxies)
async function contractNames(addrs) {
  const out = {};
  if (!addrs.length) return out;
  const r = await multi(addrs.flatMap((c) => [
    { address: c, abi: A.erc20, functionName: 'name' },
    { address: c, abi: A.erc20, functionName: 'symbol' },
    { address: c, abi: A.erc20, functionName: 'totalSupply' },
  ]));
  addrs.forEach((c, i) => { out[c] = { tokenName: r[i * 3] || null, tokenSymbol: r[i * 3 + 1] || null, isToken: r[i * 3 + 2] != null && !!r[i * 3 + 1] }; });
  const need = addrs.filter((c) => !label(c)).slice(0, 24);
  const q = [...need];
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (q.length) {
      const c = q.shift();
      try {
        const res = await rs({ module: 'contract', action: 'getsourcecode', address: c }, 2);
        let name = (res?.[0]?.ContractName || '').split(':').pop() || null;
        const impl = res?.[0]?.Implementation;
        if ((!name || GENERIC_NAME.test(name)) && impl && isAddress(impl)) {
          const r2 = await rs({ module: 'contract', action: 'getsourcecode', address: impl }, 2);
          if (r2?.[0]?.ContractName) name = r2[0].ContractName.split(':').pop();
        }
        out[c].sourceName = name && !GENERIC_NAME.test(name) ? name : null;
      } catch { /* optional */ }
    }
  }));
  return out;
}

async function verifyDeposits(deps, u, codes, result, usd, meta) {
  if (!deps.length) return;
  const fnames = ['balanceOf', 'balances', 'staked', 'stakedBalance', 'deposits', 'userInfo', 'lockedBalanceOf', 'userTotalStaked', 'getDepositAmount'];
  const calls = [], idx = [];
  deps.forEach((d, di) => {
    for (const c of d.cluster.filter((a) => codes[a])) {
      for (const fn of fnames) { calls.push({ address: c, abi: A.stakeGetters, functionName: fn, args: [u] }); idx.push([di, c, fn]); }
      for (const fn of ['depositClaimed', 'claimed', 'hasClaimed']) { calls.push({ address: c, abi: A.claimedFlags, functionName: fn, args: [u] }); idx.push([di, c, '__claimed']); }
      // does the contract still hold that token?
      if (d.token !== ETH) { calls.push({ address: d.token, abi: A.erc20, functionName: 'balanceOf', args: [c] }); idx.push([di, c, '__holds']); }
    }
  });
  const r = await multi(calls);
  const ethHold = {};
  const ethContracts = [...new Set(deps.filter((d) => d.token === ETH).flatMap((d) => d.cluster.filter((a) => codes[a])))];
  await Promise.all(ethContracts.map(async (c) => { try { ethHold[c] = await client.getBalance({ address: c }); } catch { ethHold[c] = null; } }));
  const allC = [...new Set(deps.flatMap((d) => d.cluster))].filter((c) => codes[c]);
  const own = await multi(allC.flatMap((c) => [
    { address: c, abi: A.owned, functionName: 'owner' },
    { address: c, abi: A.owned, functionName: 'getOwners' },
  ]));
  const ownedBy = {};
  allC.forEach((c, i) => {
    const o = lc(own[i * 2]), owners = (own[i * 2 + 1] || []).map(lc);
    if (o === u || owners.includes(u)) ownedBy[c] = owners.length ? 'Safe' : 'owner';
  });
  const names = await contractNames(allC);
  // on Abstract, ask the AGW registry which of these contracts are personal smart wallets
  const agwSet = new Set();
  if (chain.agw && allC.length) {
    const isAgw = await multi(allC.map((c) => ({ address: chain.agw.registry, abi: A.agwRegistry, functionName: 'isAGW', args: [c] })));
    allC.forEach((c, i) => { if (isAgw[i] === true) agwSet.add(c); });
  }
  await fillMeta(deps.flatMap((d) => d.received.map((x) => x.token)).filter((a) => a !== ETH && !meta[a]), meta);
  const decOf = (t) => (t === ETH ? 18 : meta[t]?.decimals ?? 18);

  deps.forEach((d, di) => {
    const hits = [];
    let holds = 0n, claimFlag;
    idx.forEach(([j, c, fn], k) => {
      if (j !== di || r[k] == null) return;
      if (fn === '__holds') holds += r[k];
      else if (fn === '__claimed') { if (r[k] === true) { claimFlag = true; d.settled = true; } else if (claimFlag === undefined) claimFlag = false; }
      else if (r[k] > 0n && !(fn === 'balanceOf' && meta[c])) hits.push({ contract: c, fn, value: r[k] });
    });
    if (d.token === ETH) d.cluster.forEach((c) => { if (ethHold[c]) holds += ethHold[c]; });
    const main = d.cluster.find((c) => ownedBy[c]) || d.cluster.find((c) => label(c)) || d.cluster.find((c) => names[c]?.sourceName || names[c]?.tokenName) || d.cluster.find((c) => codes[c]) || d.cluster[0];
    const nm = names[main] || {};
    const firstReceived = d.received[0] && meta[d.received[0].token];
    const project = label(main) || (ownedBy[main] === 'Safe' ? 'Your Safe (multisig)' : null)
      || (nm.tokenName ? `${nm.tokenName}${nm.tokenSymbol && nm.tokenSymbol !== nm.tokenName ? ` (${nm.tokenSymbol})` : ''}` : null)
      || nm.sourceName || (firstReceived ? firstReceived.name || firstReceived.symbol : null) || null;
    // Juice accounts are already covered by the Juice adapter
    if (/^Juice/.test(project || '') || result.vaults.some((x) => x.account && d.cluster.includes(x.account))) return;
    // bridges / aggregators / routers: funds left Blast or were swapped, nothing to recover here
    if (!ownedBy[main] && !hits.length && /multicall|disperse|socket|lifi|relay|bridge|orbiter|across|stargate|spoke|depository|router|gateway|aggregat|1inch|odos|kyber|paraswap|rango|rhino|owlto|layerswap|meson|symbiosis|squid|wormhole|okx|openocean|messenger|dvf|deposit ?contract/i.test(project || '')) return;
    // somebody else's wallet (Safe, Abstract Global Wallet, other smart accounts) = a plain payment to a person
    const isWallet = agwSet.has(main) || /safe|accountproxy|smart ?account|smart ?wallet|kernel|lightaccount|modular ?account/i.test(project || '');
    if (!ownedBy[main] && isWallet && !hits.length) return;

    const deposited = fmt(d.deposited, decOf(d.token)), withdrawn = fmt(d.withdrawn, decOf(d.token));
    const received = d.received.map((x) => ({ token: x.token, symbol: meta[x.token]?.symbol || '?', amount: fmt(x.raw, decOf(x.token)) }));
    const base = {
      token: d.token, contract: main, contracts: d.cluster, contractLabel: project, ownedByYou: !!ownedBy[main],
      deposited, withdrawn, firstDeposit: d.first ? new Date(d.first * 1000).toISOString().slice(0, 10) : null,
      lastDeposit: d.last ? new Date(d.last * 1000).toISOString().slice(0, 10) : null, txs: d.txs, fns: d.fns,
    };

    // ----- potential token sale / launch -----
    const contractIsToken = nm.isToken && [ETH, '0x4300000000000000000000000000000000000003', '0x4300000000000000000000000000000000000004'].includes(d.token);
    const saleish = !ownedBy[main] && (d.settled || d.saleFn || contractIsToken || SALE_NAME.test((nm.sourceName || '') + ' ' + (nm.tokenName || '')));
    if (saleish) {
      const unclaimed = claimFlag === false && hits.some((h) => ['deposits', 'balances', 'userInfo', 'getDepositAmount'].includes(h.fn));
      const paid = usd(d.token, d.deposited), refunded = usd(d.token, d.withdrawn), net = usd(d.token, d.raw);
      result.sales.push({
        ...base, symbol: paid.symbol, paid: paid.amount, paidUsd: paid.usd, refunded: refunded.amount, netSpent: net.amount, usd: net.usd,
        received, status: unclaimed ? 'unclaimed' : claimFlag === true || d.settled ? 'claimed' : 'unknown',
        evidence: hits.map((h) => `${h.fn}() = ${h.value}`),
      });
      return;
    }

    // the contract cannot owe you more than it holds
    if (!hits.length && holds > 0n && holds < d.raw) d.raw = holds;
    const v = usd(d.token, d.raw);
    if (v.usd != null && v.usd < 1) return;
    let confidence = 'medium';
    const strong = hits.filter((h) => !d.settled || !['deposits', 'getDepositAmount', 'balances', 'userInfo'].includes(h.fn));
    if (strong.length || (ownedBy[main] && holds > 0n)) confidence = 'high';
    else if (holds === 0n || truncated.size) confidence = 'low';
    result.deposits.push({
      ...base, symbol: v.symbol, amount: v.amount, usd: v.usd,
      confidence, evidence: hits.map((h) => `${h.fn}() = ${h.value}`), contractHoldsToken: holds > 0n,
    });
  });
}

// ---- L2 -> L1 withdrawals ----
async function bridgeWithdrawals(u, txlist, tokentx, meta) {
  const txs = txlist.filter((t) => lc(t.from) === u && t.isError !== '1' && t.to && BRIDGES.has(lc(t.to)));
  if (!txs.length) return [];
  const receipts = await Promise.all(txs.map((t) => client.getTransactionReceipt({ hash: t.hash }).catch(() => null)));
  const items = [];
  txs.forEach((t, i) => {
    const rc = receipts[i];
    if (!rc) return;
    for (const l of rc.logs) {
      if (lc(l.address) !== '0x4200000000000000000000000000000000000016' || l.topics[0] !== MSG_PASSED) continue;
      const wh = '0x' + l.data.slice(2 + 64 * 3, 2 + 64 * 4);
      const out = tokentx.find((x) => x.hash === t.hash && lc(x.from) === u);
      items.push({
        txHash: t.hash, date: new Date(Number(t.timeStamp) * 1000).toISOString().slice(0, 10), ts: Number(t.timeStamp), withdrawalHash: wh,
        token: out ? lc(out.contractAddress) : ETH, raw: out ? BigInt(out.value) : BigInt(t.value || 0),
      });
    }
  });
  if (!items.length) return [];
  const st = await l1.multicall({
    allowFailure: true,
    contracts: items.flatMap((it) => [
      { address: PORTAL, abi: A.portal, functionName: 'finalizedWithdrawals', args: [it.withdrawalHash] },
      { address: PORTAL, abi: A.portal, functionName: 'provenWithdrawals', args: [it.withdrawalHash] },
    ]),
  });
  items.forEach((it, i) => {
    const fin = st[i * 2].result, prov = st[i * 2 + 1].result;
    if (fin) it.status = 'finalized';
    else if (prov && prov[1] > 0n) { it.status = 'proven'; it.provenAt = new Date(Number(prov[1]) * 1000).toISOString().slice(0, 10); }
    else if (st[i * 2].status === 'failure') it.status = 'unknown';
    else it.status = 'initiated';
  });
  return items.sort((a, b) => b.ts - a.ts);
}

// ---- ZK Stack (Abstract) L2 -> L1 withdrawals ----
// A withdrawal is final only after someone calls finalizeWithdrawal on Ethereum. We read each withdrawal's
// batch and message index from the L2 and ask the L1 nullifier whether it was claimed.
async function zkWithdrawals(u, txlist, tokentx) {
  const zrpc = async (method, params) => {
    const r = await fetch(chain.rpc[0], { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    return j.result;
  };
  const txs = txlist
    .filter((t) => lc(t.from) === u && t.isError !== '1' && t.to && (BRIDGES.has(lc(t.to)) || /withdraw/i.test(t.functionName || '')))
    .slice(-40);
  if (!txs.length) return [];
  const items = [];
  await Promise.all(txs.map(async (t) => {
    const rc = await zrpc('eth_getTransactionReceipt', [t.hash]).catch(() => null);
    if (!rc?.l2ToL1Logs?.length) return;
    for (let i = 0; i < rc.l2ToL1Logs.length; i++) {
      const lg = rc.l2ToL1Logs[i];
      const from = '0x' + (lg.key || '').slice(-40).toLowerCase();
      if (!BRIDGES.has(from)) continue; // only bridge messages (ETH base token, asset router, legacy bridge)
      const ethLog = rc.logs.find((l) => lc(l.address) === '0x000000000000000000000000000000000000800a' && l.topics[0] === ZK_WITHDRAWAL);
      const out = tokentx.find((x) => x.hash === t.hash && lc(x.from) === u);
      items.push({
        txHash: t.hash, date: new Date(Number(t.timeStamp) * 1000).toISOString().slice(0, 10), ts: Number(t.timeStamp),
        batch: parseInt(rc.l1BatchNumber, 16), logIndex: i,
        token: from.endsWith('800a') ? ETH : out ? lc(out.contractAddress) : ETH,
        raw: from.endsWith('800a') ? (ethLog ? BigInt(ethLog.data.slice(0, 66)) : BigInt(t.value || 0)) : out ? BigInt(out.value) : 0n,
        withdrawalHash: t.hash,
      });
    }
  }));
  if (!items.length) return [];
  await Promise.all(items.map(async (it) => {
    try {
      const det = await zrpc('zks_getL1BatchDetails', [it.batch]);
      if (!det?.executedAt) { it.status = 'waiting'; return; } // batch not on Ethereum yet (about 3 hours)
      const proof = await zrpc('zks_getL2ToL1LogProof', [it.txHash, it.logIndex]);
      it.msgIndex = proof?.id;
    } catch { it.status = 'unknown'; }
  }));
  const ready = items.filter((it) => !it.status && it.msgIndex != null);
  if (ready.length) {
    const st = await l1.multicall({
      allowFailure: true,
      contracts: ready.map((it) => ({ address: chain.zk.l1Nullifier, abi: A.zkNullifier, functionName: 'isWithdrawalFinalized', args: [chain.zk.chainId, BigInt(it.batch), BigInt(it.msgIndex)] })),
    });
    ready.forEach((it, i) => { it.status = st[i].status === 'success' ? (st[i].result ? 'finalized' : 'claimable') : 'unknown'; });
  }
  items.forEach((it) => { if (!it.status) it.status = 'unknown'; });
  return items.sort((a, b) => b.ts - a.ts);
}

return { scan };
}

// Public API: scan(address, log, { chain: 'blast' | 'abstract' })
export async function scan(input, log = () => {}, opts = {}) {
  const chain = CHAINS[opts.chain || 'blast'];
  if (!chain) throw new Error('Unknown chain: ' + opts.chain);
  return createScanner(chain).scan(input, log);
}

// Abstract users mostly hold funds in an Abstract Global Wallet (a smart account derived from their signer).
// Given any address, return the addresses worth scanning on Abstract.
export async function abstractWallets(input) {
  if (!isAddress(input)) throw new Error('Invalid address');
  const chain = CHAINS.abstract;
  const c = createPublicClient({ chain: chain.viemChain, transport: http(chain.rpc[0]) });
  const addr = getAddress(input);
  const code = await c.getCode({ address: addr }).catch(() => null);
  const isContract = !!(code && code !== '0x');
  if (isContract) {
    const isAgw = await c.readContract({ address: chain.agw.registry, abi: A.agwRegistry, functionName: 'isAGW', args: [addr] }).catch(() => false);
    return [{ address: addr, kind: isAgw ? 'agw' : 'contract' }];
  }
  const agw = await c.readContract({ address: chain.agw.factory, abi: A.agwFactory, functionName: 'getAddressForSalt', args: [keccak256(addr)] }).catch(() => null);
  const agwCode = agw ? await c.getCode({ address: agw }).catch(() => null) : null;
  const out = [];
  if (agw && agwCode && agwCode !== '0x') out.push({ address: getAddress(agw), kind: 'agw', signer: addr });
  out.push({ address: addr, kind: 'eoa' });
  return out;
}
