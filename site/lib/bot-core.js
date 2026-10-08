// Shared Telegram bot logic for Blast Leftovers: used by the local long-polling runner (bot/bot.mjs)
// and by the Vercel webhook (api/telegram.js). Read-only: it never asks for keys or signatures.
import { scan, abstractWallets } from '../engine.js';
import { CHAINS } from '../chains.js';
import { resolveProtocol } from '../protocols.js';
import { loadTally, DONATE_ADDRESS, COLLECTION_URL } from '../donate.js';

export const SITE = 'https://blast-leftovers.vercel.app';
export const EXAMPLE = '0x0ee09b204ffebf9a1f14c99e242830a09958ba34';
const MAX_PARALLEL = 2;          // per process: keep explorers happy
const CACHE_MS = 5 * 60 * 1000;
const SHARE_MIN_USD = 20;
// explorer of the chain whose report is being built (report() is synchronous)
let CUR = CHAINS.blast;
let SCAN = CUR.scan;
const daysLeft = (c) => Math.ceil((new Date(c.deadline) - Date.now()) / 86400000);

// Optional hooks the runner can set: stats, owner notifications.
export const hooks = { onUser: () => {}, onScan: () => {}, onShare: () => {}, stats: null };

// ---------- telegram api ----------
export async function tg(method, body) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}),
      });
      const j = await r.json();
      if (j.ok) return j.result;
      if (j.error_code === 429) { await sleep((j.parameters?.retry_after || 2) * 1000); continue; }
      // "message is not modified" is harmless when progress text repeats
      if (/not modified/i.test(j.description || '')) return null;
      throw new Error(`${method}: ${j.description}`);
    } catch (e) {
      if (i === 2) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- texts ----------
const T = {
  en: {
    start: (n) => `👋 Hi${n ? ' ' + n : ''}! Blast closes <b>Oct 26</b> and Abstract closes <b>Dec 15</b>.\n\nJust paste a wallet address here, no command needed. I'll check both chains and find what is still there: lending deposits, LP positions, staking, vaults, locks and bridge withdrawals you never finished. Your Abstract Global Wallet is found automatically from your signer address.\n\n🔒 Read-only. I never ask you to connect a wallet, sign anything or share keys. Only send a public address.\n\nExample: /example · Українська: /lang`,
    send: 'Just paste a wallet address (0x…, 42 characters), no command needed.',
    invalid: 'That does not look like a wallet address. It should start with 0x and have 40 hex characters.',
    queued: (n) => `⏳ You are #${n} in the queue, starting soon…`,
    scanning: '🔎 Scanning Blast and Abstract…',
    busy: 'I am still scanning your previous address. One at a time, please 🙏',
    failed: (m) => `⚠️ Scan failed: ${m}\nPublic APIs sometimes rate-limit. Try again in a minute.`,
    head: (n) => `${n} check`, found: (n) => `Found on ${n}`, inProto: 'in protocols', inWallet: 'in wallet', debt: 'debt', bridge: 'unfinished bridge',
    days: (name, label, d) => d > 0 ? `⏳ ${name} closes ${label} (${d} day${d === 1 ? '' : 's'} left)` : `⏳ ${name}: deadline passed`,
    agw: 'Abstract Global Wallet', signer: 'signer address', agwNote: (sg) => `Found automatically from the signer ${sg} you sent.`,
    agwProbable: 'probably your Global Wallet', agwNoteLinked: (sg) => `Officially linked to ${sg}, the address you sent.`,
    agwNoteProbable: (sg) => `Found from your transfers: ${sg} sent funds here and got funds back, so it is most likely yours. If not, ignore this report.`,
    agwSuggest: 'You also sent funds to these Abstract Global Wallets. If one is yours, send it to me:',
    sBridgeNoteAbs: '"Ready to claim" means the batch is on Ethereum but nobody claimed the funds yet: claim them on the official migration page. "Waiting" means the batch is not on Ethereum yet (about 3 hours).',
    sBridge: '🌉 Unfinished bridge withdrawals', sBridgeNote: 'Started on Blast, never finalized on Ethereum. Finish them on the official bridge or the L1 portal contract.',
    sLend: '🏦 Lending, vaults, collateral', sLp: '💧 Liquidity', sStake: '🔒 Staked, locked, deposited', sWallet: '👛 Tokens in the wallet', sSales: '🎟 Token sales',
    supplied: 'supplied', borrowed: 'borrowed', vault: 'vault', lp: 'LP', lpNft: 'LP NFT', lock: 'lock', stream: 'vesting, withdrawable now', inFarm: 'staked in a farm',
    conf: { high: 'confirmed', medium: 'likely' }, unlocks: 'unlocks', permanent: 'permanent',
    st: { initiated: 'not proven', proven: 'proven, not finalized', waiting: 'waiting for Ethereum', claimable: 'ready to claim', unknown: 'unknown' },
    dead: 'site down → withdraw via contract', contract: 'contract', tx: 'tx', noPrice: 'no price',
    salesLine: (n, c) => `${n} sale${n === 1 ? '' : 's'} found, ${c} already claimed. Not counted as found money.`,
    unclaimed: 'not claimed? check claim/refund',
    more: (n) => `…and ${n} more on the website`,
    extras: (a, b, c, d) => `Also: ${a} probably already moved · ${b} tokens without price · ${c} NFTs · ${d} scam tokens hidden`,
    nothing: (n) => `Nothing found on ${n} for this address.`,
    nothingHint: 'If you used Blast Mobile, AgentFi or a Safe, send that address too.',
    beta: 'Beta: part of this is heuristics and can be wrong. Check the contract on the explorer before you act.',
    full: '📄 Full report', donate: '💍 Donate', share: '📣 Share on X', again: '🔄 Rescan',
    donateText: '🙏 If this saved you some forgotten bags, tip the dev! 💍 Every donation goes toward buying one OCH Ringbearer 🧙‍♂️✨ (not set in stone: if it adds up to 2 or more, I’ll probably grab more 😏)',
    donateAddr: 'EVM address (tap to copy), works on Ethereum, Base, BNB Chain, Arbitrum, Robinhood Chain, Monad, Polygon, Avalanche, Arc, Plasma, OP Mainnet, Blast, Abstract:',
    raised: 'Raised so far', partial: (l) => `some networks did not respond (${l}), the real total may be higher`,
    collection: 'OCH Ringbearer on OpenSea',
    langSet: 'Language: English 🇬🇧',
    sharePrompt: (v, chains) => `🎉 You found <b>${v}</b> on ${chains}. Help others check theirs before the deadline, the button below opens a ready post (your address is not in it).`,
  },
  uk: {
    start: (n) => `👋 Привіт${n ? ', ' + n : ''}! Blast закривається <b>26 жовтня</b>, Abstract — <b>15 грудня</b>.\n\nПросто встав сюди адресу гаманця, команда не потрібна. Я перевірю обидві мережі й знайду, що там ще лежить: депозити в лендінгах, LP-позиції, стейкінг, волти, локи та незавершені виводи через міст. Abstract Global Wallet знайду автоматично за адресою signer.\n\n🔒 Тільки читання. Я ніколи не прошу підключати гаманець, щось підписувати чи давати ключі. Надсилай лише публічну адресу.\n\nПриклад: /example · English: /lang`,
    send: 'Просто встав адресу гаманця (0x…, 42 символи), команда не потрібна.',
    invalid: 'Це не схоже на адресу гаманця. Вона має починатися з 0x і мати 40 hex-символів.',
    queued: (n) => `⏳ Ти #${n} у черзі, зараз почну…`,
    scanning: '🔎 Сканую Blast і Abstract…',
    busy: 'Ще сканую твою попередню адресу. По одній, будь ласка 🙏',
    failed: (m) => `⚠️ Помилка сканування: ${m}\nПублічні API іноді обмежують запити. Спробуй ще раз за хвилину.`,
    head: (n) => `Перевірка ${n}`, found: (n) => `Знайдено на ${n}`, inProto: 'у протоколах', inWallet: 'на гаманці', debt: 'борг', bridge: 'міст, не завершено',
    days: (name, label, d) => d > 0 ? `⏳ ${name} закривається ${label} (лишилось ${d} дн.)` : `⏳ ${name}: дедлайн минув`,
    agw: 'Abstract Global Wallet', signer: 'адреса signer', agwNote: (sg) => `Знайдено автоматично за адресою signer ${sg}, яку ти надіслав.`,
    agwProbable: 'схоже, твій Global Wallet', agwNoteLinked: (sg) => `Офіційно прив’язаний до адреси ${sg}, яку ти надіслав.`,
    agwNoteProbable: (sg) => `Знайдено за переказами: ${sg} надсилав сюди гроші й отримував назад, тож гаманець найімовірніше твій. Якщо ні, ігноруй цей звіт.`,
    agwSuggest: 'Ти також надсилав гроші на ці Abstract Global Wallet. Якщо котрийсь твій, надішли його мені:',
    sBridgeNoteAbs: '«Можна заклеймити» означає, що батч уже в Ethereum, але кошти ніхто не забрав: заклейми їх на офіційній сторінці міграції. «Чекає Ethereum» означає, що батч ще не в Ethereum (близько 3 годин).',
    sBridge: '🌉 Незавершені виводи через міст', sBridgeNote: 'Почато на Blast, але не завершено в Ethereum. Заверши через офіційний міст або L1-контракт порталу.',
    sLend: '🏦 Лендінги, волти, застава', sLp: '💧 Ліквідність', sStake: '🔒 Стейкінг, локи, депозити', sWallet: '👛 Токени на гаманці', sSales: '🎟 Сейли токенів',
    supplied: 'депозит', borrowed: 'борг', vault: 'волт', lp: 'LP', lpNft: 'LP NFT', lock: 'лок', stream: 'вестинг, можна вивести зараз', inFarm: 'застейкано у фармі',
    conf: { high: 'підтверджено', medium: 'ймовірно' }, unlocks: 'розлок', permanent: 'безстроковий',
    st: { initiated: 'не доведено (prove)', proven: 'доведено, не фіналізовано', waiting: 'чекає Ethereum', claimable: 'можна заклеймити', unknown: 'невідомо' },
    dead: 'сайт не працює → вивід через контракт', contract: 'контракт', tx: 'tx', noPrice: 'немає ціни',
    salesLine: (n, c) => `Знайдено сейлів: ${n}, з них заклеймлено: ${c}. У знайдену суму не входять.`,
    unclaimed: 'не заклеймлено? перевір claim/refund',
    more: (n) => `…і ще ${n} на сайті`,
    extras: (a, b, c, d) => `Ще: ${a} ймовірно вже виведено · ${b} токенів без ціни · ${c} NFT · ${d} скам-токенів приховано`,
    nothing: (n) => `Для цієї адреси на ${n} нічого не знайдено.`,
    nothingHint: 'Якщо користувався Blast Mobile, AgentFi чи Safe, надішли і ту адресу.',
    beta: 'Бета: частина результатів — евристика і може помилятися. Перевір контракт в експлорері перед діями.',
    full: '📄 Повний звіт', donate: '💍 Донат', share: '📣 Поділитися в X', again: '🔄 Пересканувати',
    donateText: '🙏 Якщо бот допоміг знайти забуті гроші, підкинь трохи розробнику! 💍 Усі донати підуть на покупку одного OCH Ringbearer 🧙‍♂️✨ (але це не точно: якщо збереться на 2 і більше, мабуть, куплю більше 😏)',
    donateAddr: 'EVM-адреса (натисни, щоб скопіювати), працює в Ethereum, Base, BNB Chain, Arbitrum, Robinhood Chain, Monad, Polygon, Avalanche, Arc, Plasma, OP Mainnet, Blast, Abstract:',
    raised: 'Вже зібрано', partial: (l) => `частина мереж не відповіла (${l}), реальна сума може бути більшою`,
    collection: 'OCH Ringbearer на OpenSea',
    langSet: 'Мова: українська 🇺🇦',
    sharePrompt: (v, chains) => `🎉 Ти знайшов <b>${v}</b> на ${chains}. Допоможи іншим перевірити свої гаманці до дедлайну: кнопка нижче відкриває готовий пост (твоєї адреси в ньому немає).`,
  },
};
const LOG_UK = [
  [/^Loading transaction history…$/, 'Завантажую історію транзакцій…'],
  [/^Token transfers loaded: (\d+)$/, 'Завантажено переказів токенів: $1'],
  [/^History: (\d+) token transfers, (\d+) NFT transfers, (\d+) transactions$/, 'Історія: $1 переказів токенів, $2 NFT, $3 транзакцій'],
  [/^Checking balances of (\d+) tokens…$/, 'Перевіряю баланси $1 токенів…'],
  [/^Decoding (\d+) tokens \(lending \/ LP \/ vaults\)…$/, 'Розпізнаю $1 токенів (лендінг / LP / волти)…'],
  [/^Checking NFTs and LP positions…$/, 'Перевіряю NFT та LP-позиції…'],
  [/^Looking for deposits without receipt tokens \(staking, farms\)…$/, 'Шукаю депозити без receipt-токенів…'],
  [/^Checking unfinished bridge withdrawals on Ethereum…$/, 'Перевіряю незавершені виводи через міст…'],
  [/^Fetching prices…$/, 'Підтягую ціни…'],
  [/^Done$/, 'Готово'],
];
const trLog = (lang, m) => { if (lang !== 'uk') return m; for (const [re, s] of LOG_UK) if (re.test(m)) return m.replace(re, s); return m; };

const langs = new Map(); // chatId -> 'en' | 'uk'
const langOf = (msg) => langs.get(msg.chat.id) || 'en';

// ---------- formatting ----------
const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const short = (a) => (a ? a.slice(0, 6) + '…' + a.slice(-4) : '');
const usd = (v) => v == null ? null : v > 0 && v < 0.01 ? '<$0.01' : '$' + v.toLocaleString('en-US', { maximumFractionDigits: v >= 1000 ? 0 : 2, minimumFractionDigits: v >= 1000 ? 0 : 2 });
function amt(n) {
  if (n == null) return '';
  if (n === 0) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return n.toPrecision(3);
}
const link = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
const notDust = (x) => x.usd == null ? x.amount == null || x.amount >= 1e-6 : x.usd >= 0.01;
const sum = (arr) => arr.reduce((s, x) => s + (x.usd || 0), 0);
export const shareAmount = (r) => Math.max(0, (r.totals.wallet || 0) + (r.totals.positions || 0) + (r.totals.possible || 0) + (r.totals.bridgePending || 0) - (r.totals.debt || 0));

function proto(row, withdrawContract, t) {
  const p = resolveProtocol(row.protocol, row.name, row.receipt, row.collection, row.contractLabel, row.heldByLabel);
  const name = p?.name || row.contractLabel || row.protocol || '';
  const bits = [];
  if (p?.dead && withdrawContract) bits.push(`⚠️ ${link(`${SCAN}/address/${withdrawContract}#writeContract`, t.dead)}`);
  else if (p?.url && !p.dead) bits.push(link(p.url, 'app'));
  return { name, extra: bits.length ? ' · ' + bits.join(' · ') : '' };
}

export function report(r, lang) {
  const t = T[lang];
  CUR = CHAINS[r.chain || 'blast'];
  SCAN = CUR.scan;
  r = { ...r, vaults: r.vaults.filter(notDust), debts: r.debts.filter(notDust), lp: r.lp.filter(notDust), wallet: r.wallet.filter(notDust) };
  const L = [];
  const days = daysLeft(CUR);
  const label = new Date(CUR.deadline).toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const agwKind = ['agw', 'agw-linked', 'agw-probable'].includes(r.kind);
  const title = r.chain === 'abstract' && r.kind === 'agw-probable' ? `${CUR.name} · ${t.agwProbable}` : r.chain === 'abstract' && agwKind ? `${CUR.name} · ${t.agw}` : r.chain === 'abstract' && r.kind === 'eoa' && r.hasAgw ? `${CUR.name} · ${t.signer}` : CUR.name;
  const pendingBridge = r.bridge.filter((b) => b.status !== 'finalized');
  const depsGood = r.deposits.filter((d) => d.confidence !== 'low');
  const found = r.totals.wallet + r.totals.positions + r.totals.possible + r.totals.bridgePending;
  L.push(`🔎 <b>${esc(title)}</b> · <code>${esc(r.address)}</code>`);
  if (agwKind && r.signer) L.push(`<i>${(r.kind === 'agw-probable' ? t.agwNoteProbable : r.kind === 'agw-linked' ? t.agwNoteLinked : t.agwNote)(short(r.signer))}</i>`);
  if ((r.suggest || []).length) L.push(`<i>${t.agwSuggest}</i> ${r.suggest.map((s) => `<code>${s.address}</code>`).join(', ')}`);
  L.push(`💰 ${t.found(CUR.name)}: <b>${usd(found)}</b>`);
  const parts = [`${t.inProto} ${usd(r.totals.positions + r.totals.possible)}`, `${t.inWallet} ${usd(r.totals.wallet)}`];
  if (r.totals.debt > 0) parts.push(`${t.debt} −${usd(r.totals.debt)}`);
  if (pendingBridge.length) parts.push(`${t.bridge} ${usd(r.totals.bridgePending)}`);
  L.push(parts.join(' · '));
  L.push(t.days(CUR.name, label, days));

  const section = (title, rows, max = 8) => {
    if (!rows.length) return;
    L.push('', `<b>${title}</b>`);
    rows.slice(0, max).forEach((x) => L.push(x));
    if (rows.length > max) L.push(`<i>${t.more(rows.length - max)}</i>`);
  };

  section(t.sBridge, pendingBridge.map((b) => `• <b>${amt(b.amount)} ${esc(b.symbol || 'ETH')}</b> (${usd(b.usd) || t.noPrice}) · ${t.st[b.status] || b.status} · ${b.date} · ${link(`${SCAN}/tx/${b.txHash}`, t.tx)}`));
  if (pendingBridge.length) L.push(`<i>${r.chain === 'abstract' ? t.sBridgeNoteAbs : t.sBridgeNote}</i> ${link(CUR.bridgeUrl, CUR.bridgeUrl.replace('https://', ''))}`);

  const lend = [];
  for (const l of r.lending) {
    const p = proto({ protocol: l.protocol }, l.pool, t);
    lend.push(`• <b>${esc(p.name || 'Lending')}</b>: ${usd(l.collateralUsd)} ${t.supplied}, ${usd(l.debtUsd)} ${t.borrowed}${l.healthFactor != null ? ` · HF ${l.healthFactor > 100 ? '∞' : l.healthFactor.toFixed(2)}` : ''}${p.extra}`);
  }
  for (const v of r.vaults) {
    const p = proto(v, v.pool || v.token, t);
    lend.push(`• <b>${esc(p.name || v.name || '')}</b> · ${v.type === 'Vault' ? t.vault : t.supplied} ${amt(v.amount)} ${esc(v.underlyingSymbol || '')} (${usd(v.usd) || t.noPrice})${p.extra}`);
  }
  for (const d of r.debts) {
    const p = proto(d, d.token, t);
    lend.push(`• <b>${esc(p.name || d.name || '')}</b> · ${t.borrowed} ${amt(d.amount)} ${esc(d.underlyingSymbol || '')} (−${usd(d.usd) || '?'})`);
  }
  section(t.sLend, lend);

  const lp = [];
  for (const x of r.lp) {
    const p = proto(x, null, t);
    lp.push(`• <b>${esc(p.name || x.name)}</b> · ${t.lp} ${x.parts.map((q) => `${amt(q.amount)} ${esc(q.symbol)}`).join(' + ')} (${usd(x.usd) || t.noPrice})${p.extra} · ${link(`${SCAN}/address/${x.token}`, t.contract)}`);
  }
  for (const x of r.nftPositions) {
    const p = proto(x, x.heldBy !== 'wallet' ? x.heldBy : x.contract, t);
    const farm = x.heldBy !== 'wallet' ? ` · ${t.inFarm} ${esc(x.heldByLabel || short(x.heldBy))}` : '';
    lp.push(`• <b>${esc(p.name)}</b> · ${t.lpNft} #${esc(x.tokenId)} ${(x.parts || []).map((q) => `${amt(q.amount)} ${esc(q.symbol)}`).join(' + ')} (${usd(x.usd) || t.noPrice})${farm}${p.extra}`);
  }
  section(t.sLp, lp);

  const st = [];
  for (const l of r.locks) {
    const p = proto(l, l.contract, t);
    const when = l.stream ? t.stream : l.unlock === 'permanent' ? t.permanent : `${t.unlocks} ${l.unlock}`;
    st.push(`• <b>${esc(p.name || l.collection)}</b> · ${t.lock} ${amt(l.amount)} ${esc(l.symbol || '')} (${usd(l.usd) || t.noPrice}) · ${when}`);
  }
  for (const d of depsGood) {
    const p = proto(d, d.contract, t);
    const name = d.contractLabel === 'Your Safe (multisig)' ? (lang === 'uk' ? 'Твій Safe' : 'Your Safe') : (p.name || d.contractLabel || short(d.contract));
    st.push(`• <b>${esc(name)}</b> · ${amt(d.amount)} ${esc(d.symbol || '')} (${usd(d.usd) || t.noPrice}) · ${t.conf[d.confidence]}${p.extra} · ${link(`${SCAN}/address/${d.contract}#writeContract`, t.contract)}`);
  }
  section(t.sStake, st);

  section(t.sWallet, r.wallet.map((w) => `• ${esc(w.symbol)}: ${amt(w.amount)} (${usd(w.usd)})`), 6);

  const sales = r.sales || [];
  if (sales.length) {
    const claimed = sales.filter((s) => s.status === 'claimed').length;
    L.push('', `<b>${t.sSales}</b>`, `<i>${t.salesLine(sales.length, claimed)}</i>`);
    sales.filter((s) => s.status === 'unclaimed').forEach((s) => L.push(`• <b>${esc(s.contractLabel || short(s.contract))}</b> · ${t.unclaimed} · ${link(`${SCAN}/address/${s.contract}#readContract`, t.contract)}`));
  }

  const empty = !r.wallet.length && !r.vaults.length && !r.lp.length && !r.nftPositions.length && !r.locks.length && !depsGood.length && !pendingBridge.length && !r.debts.length;
  if (empty) L.push('', t.nothing(CUR.name) + ' ' + t.nothingHint);
  const low = r.deposits.filter((d) => d.confidence === 'low').length;
  L.push('', `<i>${t.extras(low, r.unknown.length, r.nfts.length, r.spam.length)}</i>`);
  L.push(`<i>${t.beta}</i>`);
  return L.join('\n');
}

// Telegram caps a message at 4096 characters: split on line breaks
export function chunks(text, max = 3900) {
  const out = []; let cur = '';
  for (const line of text.split('\n')) {
    if ((cur + '\n' + line).length > max) { out.push(cur); cur = line; } else cur = cur ? cur + '\n' + line : line;
  }
  if (cur) out.push(cur);
  return out;
}

function shareUrl(v, chains = ['blast']) {
  const c = CHAINS[chains[0] || 'blast'];
  const text = chains.length > 1
    ? `just found ${usd(v).replace('<', '')} I forgot on Blast and Abstract before they shut down 😳\n\ncheck yours, just paste your address:\nblast-leftovers.vercel.app\n\nh/t @NotYur`
    : `just found ${usd(v).replace('<', '')} I forgot on ${c.name} before it shuts down 😳\n\ncheck yours before ${c.deadlineLabel}, just paste your address:\nblast-leftovers.vercel.app\n\nh/t @NotYur`;
  return 'https://x.com/intent/post?text=' + encodeURIComponent(text);
}

export function buttons(r, lang, input = r.address) {
  const t = T[lang];
  return { inline_keyboard: [
    [{ text: t.full, url: `${SITE}/?a=${input}` }, { text: t.donate, callback_data: 'donate' }],
    [{ text: t.again, callback_data: 'rescan:' + input }],
  ] };
}

// ---------- scan queue + cache ----------
const cache = new Map();   // address -> { at, result }
const active = new Set();  // chat ids with a scan in progress
const queue = [];
let running = 0;
function enqueue(fn) {
  return new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); pump(); });
}
function pump() {
  while (running < MAX_PARALLEL && queue.length) {
    const { fn, resolve, reject } = queue.shift();
    running++;
    fn().then(resolve, reject).finally(() => { running--; pump(); });
  }
}

async function scanCached(address, chain, onLog) {
  const key = chain + '|' + address.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.result;
  const result = await enqueue(() => scan(address, onLog, { chain }));
  cache.set(key, { at: Date.now(), result });
  return result;
}

async function handleScan(chatId, address, lang) {
  const t = T[lang];
  if (active.has(chatId)) { await tg('sendMessage', { chat_id: chatId, text: t.busy }); return; }
  active.add(chatId);
  const status = await tg('sendMessage', { chat_id: chatId, text: queue.length || running >= MAX_PARALLEL ? t.queued(queue.length + 1) : t.scanning });
  try {
    // Blast: the address itself. Abstract: its Global Wallet (if any) plus the address itself.
    const ws = await abstractWallets(address).catch(() => [{ address, kind: 'eoa' }]);
    const suggest = ws.filter((w) => w.scan === false);
    const jobs = [{ chain: 'blast', address, kind: 'eoa' }, ...ws.filter((w) => w.scan !== false).map((w) => ({ chain: 'abstract', address: w.address, kind: w.kind, signer: w.signer, suggest: w.kind === 'eoa' ? suggest : undefined }))];
    let last = 0, finished = false, inFlight = Promise.resolve();
    const lines = {};
    const results = await Promise.all(jobs.map((j) => {
      const tag = j.chain === 'abstract' && jobs.filter((x) => x.chain === 'abstract').length > 1 ? `Abstract (${j.kind === 'eoa' ? 'signer' : 'AGW'})` : CHAINS[j.chain].name;
      return scanCached(j.address, j.chain, (m) => {
        lines[tag] = trLog(lang, m);
        if (finished || Date.now() - last < 2500) return;
        last = Date.now();
        inFlight = tg('editMessageText', { chat_id: chatId, message_id: status.message_id, text: `${t.scanning}\n${Object.entries(lines).map(([k, v]) => k + ': ' + v).join('\n')}` }).catch(() => {});
      }).then((r) => ({ ...r, kind: j.kind, signer: j.signer, suggest: j.suggest })).catch((e) => ({ error: e, chain: j.chain, address: j.address }));
    }));
    finished = true;
    await inFlight; // a late progress edit would otherwise overwrite the report
    const ok = results.filter((r) => !r.error);
    const agwFound = ok.some((r) => r.chain === 'abstract' && ['agw', 'agw-linked', 'agw-probable'].includes(r.kind));
    ok.forEach((r) => { if (r.chain === 'abstract' && r.kind === 'eoa') r.hasAgw = agwFound; });
    const isEmpty = (r) => !r.wallet.some((w) => (w.usd || 0) >= 0.01) && !r.vaults.length && !r.lp.length && !r.nftPositions.length && !r.locks.length
      && !r.deposits.some((d) => d.confidence !== 'low') && !r.bridge.some((b) => b.status !== 'finalized') && !r.debts.length;
    // the signer of an AGW is reported only when it holds something itself
    const shown = ok.filter((r) => !(r.hasAgw && isEmpty(r) && !(r.suggest || []).length));
    const messages = [];
    for (const r of shown) {
      if (isEmpty(r) && !(r.suggest || []).length) messages.push(`🔎 <b>${esc(CHAINS[r.chain].name)}</b>: ${t.nothing(CHAINS[r.chain].name)}`);
      else messages.push(...chunks(report(r, lang)));
    }
    for (const e of results.filter((r) => r.error)) messages.push(t.failed(`${CHAINS[e.chain].name}: ${e.error.shortMessage || e.error.message}`));
    const kb = buttons({ address }, lang, address);
    for (let i = 0; i < messages.length; i++) {
      const payload = { chat_id: chatId, text: messages[i], parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: i === messages.length - 1 ? kb : undefined };
      if (i === 0) await tg('editMessageText', { ...payload, message_id: status.message_id });
      else await tg('sendMessage', payload);
    }
    const isEx = address.toLowerCase() === EXAMPLE;
    const total = shown.reduce((sum, r) => sum + shareAmount(r), 0);
    const chainsWithFinds = [...new Set(shown.filter((r) => shareAmount(r) >= 1).map((r) => r.chain))];
    if (total >= SHARE_MIN_USD && !isEx) {
      hooks.onShare();
      await tg('sendMessage', { chat_id: chatId, text: t.sharePrompt(usd(total), chainsWithFinds.map((k) => CHAINS[k].name).join(' + ')), parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: t.share, url: shareUrl(total, chainsWithFinds) }]] } });
    }
    hooks.onScan(total, isEx, usd);
  } catch (e) {
    console.error('scan error:', e.shortMessage || e.message);
    await tg('editMessageText', { chat_id: chatId, message_id: status.message_id, text: t.failed(e.shortMessage || e.message) }).catch(() => {});
  } finally {
    active.delete(chatId);
  }
}

async function sendDonate(chatId, lang) {
  const t = T[lang];
  const msg = await tg('sendMessage', { chat_id: chatId, text: `${t.donateText}\n\n${t.donateAddr}\n<code>${DONATE_ADDRESS}</code>`, parse_mode: 'HTML', disable_web_page_preview: true });
  try {
    const tally = await loadTally();
    const extra = tally.failed?.length ? `\n<i>${t.partial(tally.failed.join(', '))}</i>` : '';
    await tg('editMessageText', {
      chat_id: chatId, message_id: msg.message_id, parse_mode: 'HTML', disable_web_page_preview: true,
      text: `${t.donateText}\n\n${t.donateAddr}\n<code>${DONATE_ADDRESS}</code>\n\n${t.raised}: <b>${tally.failed?.length ? '≥ ' : ''}${usd(tally.total) || '$0'}</b>${extra}\n${link(COLLECTION_URL, t.collection)}`,
    });
  } catch { /* the address alone is enough */ }
}

// ---------- updates ----------
async function onMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const lang = langOf(msg);
  const t = T[lang];
  hooks.onUser(msg.from, lang, text);
  if (/^\/stats\b/.test(text)) {
    const owner = Number(process.env.OWNER_ID || 0);
    if (owner && msg.from?.id === owner) return tg('sendMessage', { chat_id: chatId, text: hooks.stats ? hooks.stats() : 'On the server, stats arrive as notifications here and in the Vercel logs.', parse_mode: 'HTML' });
    if (!owner) return tg('sendMessage', { chat_id: chatId, text: `Your Telegram id is ${msg.from?.id}. Set OWNER_ID=${msg.from?.id} to unlock /stats.` });
    return; // not the owner: stay silent
  }
  if (/^\/start\b|^\/help\b/.test(text)) return tg('sendMessage', { chat_id: chatId, text: t.start(msg.from?.first_name ? esc(msg.from.first_name) : ''), parse_mode: 'HTML' });
  if (/^\/example\b/.test(text)) return handleScan(chatId, EXAMPLE, lang);
  if (/^\/donate\b/.test(text)) return sendDonate(chatId, lang);
  if (/^\/lang\b/.test(text)) {
    const next = lang === 'uk' ? 'en' : 'uk';
    langs.set(chatId, next);
    return tg('sendMessage', { chat_id: chatId, text: T[next].langSet });
  }
  const m = text.match(/0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/);
  if (m) return handleScan(chatId, m[0], lang);
  if (/0x[0-9a-fA-F]+/.test(text)) return tg('sendMessage', { chat_id: chatId, text: t.invalid });
  if (msg.chat.type === 'private') return tg('sendMessage', { chat_id: chatId, text: t.send });
}

async function onCallback(q) {
  const chatId = q.message?.chat?.id;
  const lang = langs.get(chatId) || 'en';
  await tg('answerCallbackQuery', { callback_query_id: q.id }).catch(() => {});
  if (!chatId) return;
  if (q.data === 'donate') return sendDonate(chatId, lang);
  if (q.data?.startsWith('rescan:')) {
    const addr = q.data.slice(7);
    for (const k of [...cache.keys()]) if (k.endsWith('|' + addr.toLowerCase())) cache.delete(k);
    return handleScan(chatId, addr, lang);
  }
}

export async function setup() {
  const me = await tg('getMe');
  await tg('setMyCommands', { commands: [
    { command: 'start', description: 'How it works' },
    { command: 'example', description: 'Scan an example wallet' },
    { command: 'donate', description: 'Support the dev' },
    { command: 'lang', description: 'English / Українська' },
  ] });
  await tg('setMyCommands', { language_code: 'uk', commands: [
    { command: 'start', description: 'Як це працює' },
    { command: 'example', description: 'Перевірити приклад гаманця' },
    { command: 'donate', description: 'Підтримати розробника' },
    { command: 'lang', description: 'English / Українська' },
  ] });
  await tg('setMyShortDescription', { short_description: 'Check what you still have on Blast and Abstract before they shut down. Just send an address, no wallet connection.' }).catch(() => {});
  await tg('setMyDescription', { description: 'Blast (closes Oct 26) and Abstract (closes Dec 15) are shutting down. Send any wallet address and I will find lending deposits, LP positions, staking, vaults and unfinished bridge withdrawals still on Blast. Read-only: I never ask to connect a wallet or sign anything. Open source: github.com/Lazaniaaa/blast-leftovers' }).catch(() => {});
  return me;
}


// One entry point for both runners
export async function handleUpdate(u) {
  if (u.message) return onMessage(u.message);
  if (u.callback_query) return onCallback(u.callback_query);
}
