import { scan, ETH } from './engine.js';
import { resolveProtocol } from './protocols.js';
import { DONATE_ADDRESS, GOAL_USD, loadTally } from './donate.js';

const DEADLINE = new Date('2026-10-26T23:59:59Z');
const EXAMPLE = '0x0ee09b204ffebf9a1f14c99e242830a09958ba34';
const SCAN = 'https://blastscan.io';

// ---------- i18n ----------
const T = {
  en: {
    h1: 'What did you <em>leave on Blast?</em>',
    lede: 'Blast is shutting down. Paste an address to find everything still there: lending deposits, LP positions, staking, vaults, locks and bridge withdrawals you never finished.',
    scan: 'Scan address',
    hintNoConnect: '<b>No wallet connection.</b> Read-only, runs in your browser.',
    example: 'Try an example address',
    deadline: (d) => d > 0 ? `UI withdrawals close Oct 26 · ${d} day${d === 1 ? '' : 's'} left` : 'UI deadline passed · use the L1 contract',
    invalid: 'That is not a valid EVM address. It should start with 0x and have 40 hex characters.',
    failed: 'Scan failed: ',
    retry: 'Public APIs sometimes rate-limit. Wait a few seconds and scan again.',
    found: 'Found on Blast', wallet: 'In wallet', positions: 'In protocols', debt: 'Debt', possible: 'Probably still deposited', bridge: 'Bridge, unfinished',
    openDebank: 'DeBank', openScan: 'Blastscan', share: 'Copy link', copied: 'Copied',
    gBridge: 'Unfinished bridge withdrawals', gBridgeNote: 'You started these withdrawals to Ethereum but they were never finalized. The ETH is waiting in the Blast portal on L1. Finish them with the official bridge, or through the L1 contract after Oct 26.',
    gLend: 'Lending, vaults and collateral', gLendNote: 'Values come from the receipt tokens you hold, converted to the underlying asset. Repay debt before you withdraw collateral.',
    gLp: 'Liquidity positions', gLpNote: 'LP tokens and concentrated-liquidity NFTs, including NFTs you staked in farms.',
    gStake: 'Staked, locked or deposited', gStakeNote: 'Deposits that gave you no receipt token. Detected from your transaction history: money went into a contract and never came back. Check each one.',
    gWallet: 'Tokens in the wallet', gWalletNote: 'Plain balances. Bridge or swap them out before liquidity disappears.',
    gGone: 'Probably already moved', gGoneNote: 'Your history shows a deposit here, but the contract no longer holds that token. Usually it was bridged, swapped or spent. Low confidence.',
    gUnknown: 'Tokens without a price', gNft: 'NFTs', gSpam: 'Scam tokens hidden',
    gSpamNote: 'These tokens were airdropped to bait you into phishing sites. Do not visit their links and do not approve anything.',
    lending: 'Lending account', hf: 'health factor', collateral: 'collateral',
    supplied: 'Supplied', borrowed: 'Borrowed', vault: 'Vault', lpv2: 'LP token', lpv3: 'LP NFT', lock: 'Lock', deposit: 'Deposit',
    inRange: 'in range', outRange: 'out of range', inFarm: 'staked in', unlocks: 'unlocks', unlocked: 'unlocked', permanent: 'permanent lock',
    siteDown: 'site down', openApp: 'Open app', viaContract: 'Withdraw via contract', defillama: 'DefiLlama', xacc: 'Announcements',
    tx: 'Transaction', explorer: 'Explorer', noPrice: 'no price', yours: 'your contract',
    conf: { high: 'confirmed', medium: 'likely', low: 'unlikely' },
    deposited: 'deposited', withdrawn: 'withdrawn', last: 'last deposit',
    st: { initiated: 'not proven', proven: 'proven, not finalized', finalized: 'done', unknown: 'unknown' },
    initiated: 'started', provenAt: 'proven',
    finishBridge: 'Official bridge', portal: 'L1 portal contract',
    nothing: 'Nothing found on Blast for this address. If you used a smart wallet or a Safe, scan that address too.',
    debankT: 'Cross-check with DeBank',
    debankNote: 'DeBank lists protocol positions it knows about. Its API needs your own DeBank Cloud AccessKey. The key is saved only in this browser and sent only to DeBank.',
    debankBtn: 'Load from DeBank', debankKey: 'DeBank Cloud AccessKey', debankNone: 'DeBank shows no Blast protocol positions for this address.',
    debankErr: 'DeBank request failed: ',
    how1t: 'Receipt tokens', how1: 'Every token you ever received is checked. aTokens, cTokens, LP tokens and ERC-4626 shares are converted to the assets behind them.',
    how2t: 'Money that never came back', how2: 'Transactions where tokens or ETH went into a contract and nothing came back are grouped by contract, then checked against what the contract still holds.',
    how3t: 'LP NFTs and locks', how3: 'Thruster, Blasterswap, Fenix and other concentrated positions are valued from the pool price, including NFTs sitting in farms. Vote-escrow locks are read too.',
    how5t: 'Separate wallets', how5: 'Blast Mobile, AgentFi agents and Safe multisigs use their own addresses. Positions there do not show up on your main wallet, so scan those addresses too.',
    how4t: 'Bridge withdrawals', how4: 'Every withdrawal you started on Blast is looked up in the Blast portal on Ethereum to see whether it was proven and finalized.',
    phish: 'Blast is full of fake "claim" sites right now. This page never asks you to connect a wallet or sign anything. Only use protocol links you can verify.',
    disclaimer: 'Unofficial community tool, not affiliated with Blast or any protocol listed. Data: Blast RPC, Routescan, DefiLlama, Ethereum RPC. Heuristic results can be wrong; verify on the explorer before acting.',
    stream: 'Vesting stream', streamNow: 'withdrawable now',
    themeAuto: 'Auto', themeLight: 'Light', themeDark: 'Dark',
    limT: 'Known limitations (beta)',
    lim1: 'Open positions in SynFutures, Particle LAMM, INIT (position NFTs) and Mangrove are not decoded yet. Margin in SynFutures is shown.',
    lim2: 'Blast Mobile and AgentFi smart wallets have their own addresses. Paste them separately.',
    lim3: 'Very active wallets take about a minute, and only the latest 20,000 records of history are checked.',
    lim4: 'The page relies on free public APIs (Routescan, public RPCs, DefiLlama). If Blast RPCs go offline early, scans will stop working.',
    lim5: 'Results come partly from heuristics and can be wrong. Check the contract on the explorer before you act.',
    donateBtn: '💍 Donate', donateFooter: '💍 Support this tool',
    donateT: 'Found something? 🎉',
    donateText: '🙏 If this saved you some forgotten bags, tip the dev! 💍 Every donation goes toward buying one OCH Ringbearer 🧙‍♂️✨ (not set in stone: if it adds up to 2 or more, I’ll probably grab more 😏)',
    evmNote: 'This is an EVM address. Send ETH, USDC or USDT on Ethereum, Base, BNB Chain, Arbitrum, Robinhood Chain, Monad, Polygon, Avalanche, Arc, Plasma, OP Mainnet or Blast. Double-check the address after pasting.',
    copyAddr: 'Copy address', seeCollection: 'OCH Ringbearer on OpenSea ↗', close: 'Close',
    raised: 'Raised for the Ringbearer', tallyLoading: 'Checking 12 networks…', tallyFail: 'Could not load the total right now.', goal: 'goal',
    spentOn: 'Already spent on the Ringbearer:',
    shareTitle: (v) => `You found ${v} on Blast 🎉`,
    shareText: 'Help others check theirs before Oct 26. Here is a ready post, edit it if you like. Your address is not in it.',
    sharePost: 'Post on X ↗', shareCopy: 'Copy text', shareLater: 'Not now', shareBtn: 'Share on X',
    tallyChecked: (n) => `Live balance of the donation wallet across ${n} networks.`,
    tallyPartial: (ok, n, list) => `Checked ${ok} of ${n} networks. Not responding: ${list}. The real total may be higher.`,
    gSales: 'Token sales and launches', gSalesNote: 'Looks like you bought tokens or an allocation here: money went in and tokens came back (or were supposed to). This is not a deposit, so usually nothing can be withdrawn. If the status is "not claimed", check the contract for claim or refund.',
    saleChip: 'potential sale', paid: 'paid', refunded: 'refunded', got: 'received', nothingBack: 'no tokens received yet',
    saleSt: { claimed: 'claimed', unclaimed: 'not claimed?', unknown: 'status unknown' },
    spent: 'spent', unnamed: 'Unknown contract', via: 'via',
    other: 'Other', yourSafe: 'Your Safe (multisig)', scanThis: 'Scan this address',
  },
  uk: {
    h1: 'Що ти <em>залишив на Blast?</em>',
    lede: 'Blast закривається. Встав адресу й побачиш усе, що там лишилось: депозити в лендінгах, LP-позиції, стейкінг, волти, локи та незавершені виводи через міст.',
    scan: 'Перевірити',
    hintNoConnect: '<b>Без підключення гаманця.</b> Лише читання, все працює у твоєму браузері.',
    example: 'Спробувати на прикладі',
    deadline: (d) => d > 0 ? `Вивід через UI до 26 жовтня · лишилось ${d} дн.` : 'Дедлайн UI минув · вивід через L1-контракт',
    invalid: 'Це не схоже на EVM-адресу. Вона має починатися з 0x і мати 40 hex-символів.',
    failed: 'Помилка сканування: ',
    retry: 'Публічні API іноді обмежують запити. Зачекай кілька секунд і спробуй ще раз.',
    found: 'Знайдено на Blast', wallet: 'На гаманці', positions: 'У протоколах', debt: 'Борг', possible: 'Ймовірно ще в депозитах', bridge: 'Міст, не завершено',
    openDebank: 'DeBank', openScan: 'Blastscan', share: 'Скопіювати посилання', copied: 'Скопійовано',
    gBridge: 'Незавершені виводи через міст', gBridgeNote: 'Ти почав ці виводи в Ethereum, але не завершив їх. ETH чекає в порталі Blast на L1. Заверши через офіційний міст або напряму через L1-контракт після 26 жовтня.',
    gLend: 'Лендінги, волти та застава', gLendNote: 'Суми рахуються з receipt-токенів на гаманці й переводяться в базовий актив. Спершу поверни борг, потім виводь заставу.',
    gLp: 'Позиції ліквідності', gLpNote: 'LP-токени та NFT концентрованої ліквідності, включно з NFT, застейканими у фармах.',
    gStake: 'Стейкінг, локи та депозити', gStakeNote: 'Депозити, за які ти не отримав receipt-токен. Знайдено по історії: гроші пішли в контракт і не повернулися. Перевір кожен.',
    gWallet: 'Токени на гаманці', gWalletNote: 'Звичайні баланси. Виведи або обміняй їх, поки є ліквідність.',
    gGone: 'Ймовірно вже виведено', gGoneNote: 'В історії є депозит, але контракт уже не тримає цей токен. Зазвичай його забриджили, обміняли або витратили. Низька впевненість.',
    gUnknown: 'Токени без ціни', gNft: 'NFT', gSpam: 'Приховані скам-токени',
    gSpamNote: 'Ці токени розсилають, щоб заманити на фішингові сайти. Не переходь за їхніми посиланнями і нічого не підписуй.',
    lending: 'Лендінг-акаунт', hf: 'health factor', collateral: 'застава',
    supplied: 'Депозит', borrowed: 'Борг', vault: 'Волт', lpv2: 'LP-токен', lpv3: 'LP NFT', lock: 'Лок', deposit: 'Депозит',
    inRange: 'в діапазоні', outRange: 'поза діапазоном', inFarm: 'застейкано в', unlocks: 'розлок', unlocked: 'розлоковано', permanent: 'безстроковий лок',
    siteDown: 'сайт не працює', openApp: 'Відкрити застосунок', viaContract: 'Вивести через контракт', defillama: 'DefiLlama', xacc: 'Анонси',
    tx: 'Транзакція', explorer: 'Експлорер', noPrice: 'немає ціни', yours: 'твій контракт',
    conf: { high: 'підтверджено', medium: 'ймовірно', low: 'малоймовірно' },
    deposited: 'внесено', withdrawn: 'виведено', last: 'останній депозит',
    st: { initiated: 'не доведено (prove)', proven: 'доведено, не фіналізовано', finalized: 'завершено', unknown: 'невідомо' },
    initiated: 'почато', provenAt: 'prove',
    finishBridge: 'Офіційний міст', portal: 'L1-контракт порталу',
    nothing: 'Для цієї адреси на Blast нічого не знайдено. Якщо ти користувався смарт-гаманцем або Safe, перевір і ту адресу.',
    debankT: 'Звірити з DeBank',
    debankNote: 'DeBank показує позиції в протоколах, які він знає. Його API потребує твого власного AccessKey з DeBank Cloud. Ключ зберігається лише в цьому браузері й надсилається лише в DeBank.',
    debankBtn: 'Завантажити з DeBank', debankKey: 'AccessKey DeBank Cloud', debankNone: 'DeBank не бачить позицій у протоколах Blast для цієї адреси.',
    debankErr: 'Помилка запиту до DeBank: ',
    how1t: 'Receipt-токени', how1: 'Перевіряється кожен токен, який ти коли-небудь отримував. aTokens, cTokens, LP-токени та ERC-4626 частки переводяться в активи, що за ними стоять.',
    how2t: 'Гроші, що не повернулися', how2: 'Транзакції, де токени чи ETH пішли в контракт і нічого не повернулося, групуються по контракту і звіряються з тим, що контракт досі тримає.',
    how3t: 'LP NFT та локи', how3: 'Позиції Thruster, Blasterswap, Fenix та інших рахуються за ціною пулу, включно з NFT у фармах. Також читаються vote-escrow локи.',
    how5t: 'Окремі гаманці', how5: 'Blast Mobile, агенти AgentFi та Safe-мультисиги мають власні адреси. Позиції там не видно на основному гаманці, тому перевір і ці адреси.',
    how4t: 'Виводи через міст', how4: 'Кожен вивід, який ти почав на Blast, перевіряється в порталі Blast на Ethereum: чи був prove і finalize.',
    phish: 'Зараз на Blast повно фейкових «claim»-сайтів. Ця сторінка ніколи не просить підключити гаманець чи щось підписати. Користуйся лише посиланнями, які можеш перевірити.',
    disclaimer: 'Неофіційний інструмент спільноти, не пов’язаний з Blast чи протоколами зі списку. Дані: Blast RPC, Routescan, DefiLlama, Ethereum RPC. Евристика може помилятися, перевіряй в експлорері перед діями.',
    stream: 'Вестинг-стрім', streamNow: 'можна вивести зараз',
    themeAuto: 'Авто', themeLight: 'Світла', themeDark: 'Темна',
    limT: 'Відомі обмеження (бета)',
    lim1: 'Відкриті позиції в SynFutures, Particle LAMM, INIT (NFT позицій) і Mangrove поки не розбираються. Маржа в SynFutures показується.',
    lim2: 'Смарт-гаманці Blast Mobile та AgentFi мають власні адреси. Встав їх окремо.',
    lim3: 'Дуже активні гаманці скануються близько хвилини, і перевіряються лише останні 20 000 записів історії.',
    lim4: 'Сторінка працює на безкоштовних публічних API (Routescan, публічні RPC, DefiLlama). Якщо RPC Blast вимкнуть раніше, сканування перестане працювати.',
    lim5: 'Частина результатів — евристика, тож можливі помилки. Перевір контракт в експлорері перед діями.',
    donateBtn: '💍 Донат', donateFooter: '💍 Підтримати проєкт',
    donateT: 'Знайшов щось? 🎉',
    donateText: '🙏 Якщо застосунок допоміг знайти забуті гроші, підкинь трохи розробнику! 💍 Усі донати підуть на покупку одного OCH Ringbearer 🧙‍♂️✨ (але це не точно: якщо збереться на 2 і більше, мабуть, куплю більше 😏)',
    evmNote: 'Це EVM-адреса. Можна надсилати ETH, USDC чи USDT в Ethereum, Base, BNB Chain, Arbitrum, Robinhood Chain, Monad, Polygon, Avalanche, Arc, Plasma, OP Mainnet чи Blast. Перевір адресу після вставки.',
    copyAddr: 'Скопіювати адресу', seeCollection: 'OCH Ringbearer на OpenSea ↗', close: 'Закрити',
    raised: 'Зібрано на Ringbearer', tallyLoading: 'Перевіряю 12 мереж…', tallyFail: 'Зараз не вдалося завантажити суму.', goal: 'ціль',
    spentOn: 'Вже витрачено на Ringbearer:',
    shareTitle: (v) => `Ти знайшов ${v} на Blast 🎉`,
    shareText: 'Допоможи іншим перевірити свої гаманці до 26 жовтня. Ось готовий пост, можеш його змінити. Твоєї адреси в ньому немає.',
    sharePost: 'Запостити в X ↗', shareCopy: 'Скопіювати текст', shareLater: 'Не зараз', shareBtn: 'Поділитися в X',
    tallyChecked: (n) => `Поточний баланс донат-гаманця в ${n} мережах.`,
    tallyPartial: (ok, n, list) => `Перевірено ${ok} з ${n} мереж. Не відповіли: ${list}. Реальна сума може бути більшою.`,
    gSales: 'Сейли токенів і лончі', gSalesNote: 'Схоже, тут ти купував токени чи алокацію: гроші пішли, токени прийшли (або мали прийти). Це не депозит, тож зазвичай вивести нічого не можна. Якщо статус «не заклеймлено», перевір у контракті claim або refund.',
    saleChip: 'потенційно сейл', paid: 'сплачено', refunded: 'повернуто', got: 'отримано', nothingBack: 'токени ще не отримано',
    saleSt: { claimed: 'заклеймлено', unclaimed: 'не заклеймлено?', unknown: 'статус невідомий' },
    spent: 'витрачено', unnamed: 'Невідомий контракт', via: 'через',
    other: 'Інше', yourSafe: 'Твій Safe (мультисиг)', scanThis: 'Перевірити цю адресу',
  },
};
let lang = 'en';
let saved = null;
try { saved = localStorage.getItem('bl-lang'); } catch { /* storage optional */ }
lang = saved || ((navigator.language || '').startsWith('uk') ? 'uk' : 'en');
const t = (k) => T[lang][k];

function applyLang() {
  document.documentElement.lang = lang === 'uk' ? 'uk' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  const days = Math.ceil((DEADLINE - Date.now()) / 86400000);
  document.getElementById('deadline').textContent = t('deadline')(days);
  if (lastResult) render(lastResult);
  renderTally();
}
let theme = 'auto';
try { theme = localStorage.getItem('bl-theme') || 'auto'; } catch { /* optional */ }
function applyTheme() {
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === theme)));
}
document.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => {
  theme = b.dataset.themeSet;
  try { localStorage.setItem('bl-theme', theme); } catch { /* optional */ }
  applyTheme();
}));
applyTheme();

document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  lang = b.dataset.lang;
  try { localStorage.setItem('bl-lang', lang); } catch { /* optional */ }
  applyLang();
}));

// ---------- formatting ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = (a) => (a ? a.slice(0, 6) + '…' + a.slice(-4) : '');
function usd(v) {
  if (v == null || Number.isNaN(v)) return `<span class="amt">${t('noPrice')}</span>`;
  if (Math.abs(v) > 0 && Math.abs(v) < 0.01) return '<$0.01';
  return '$' + v.toLocaleString('en-US', { maximumFractionDigits: v >= 1000 ? 0 : 2, minimumFractionDigits: v >= 1000 ? 0 : 2 });
}
const usdPlain = (v) => (v == null ? '—' : v < 0.01 && v > 0 ? '<$0.01' : '$' + v.toLocaleString('en-US', { maximumFractionDigits: v >= 1000 ? 0 : 2, minimumFractionDigits: v >= 1000 ? 0 : 2 }));
const notDust = (x) => x.usd == null ? x.amount == null || x.amount >= 1e-6 : x.usd >= 0.01;
function amt(n) {
  if (n == null) return '';
  if (n === 0) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return n.toPrecision(3);
}
const sum = (arr) => arr.reduce((s, x) => s + (x.usd || 0), 0);
const scanAddr = (a, anchor = '') => `${SCAN}/address/${a}${anchor}`;

function protoBits(row, contractForWithdraw, { fallbackChip = true } = {}) {
  const p = resolveProtocol(row.protocol, row.name, row.receipt, row.collection, row.contractLabel, row.heldByLabel);
  const chips = [];
  const links = [];
  if (p) {
    chips.push(`<span class="chip proto">${esc(p.name)}</span>`);
    if (p.dead) chips.push(`<span class="chip dead">${t('siteDown')}</span>`);
    if (p.url && !p.dead) links.push(`<a class="act" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${t('openApp')} ↗</a>`);
    if (p.dead && contractForWithdraw) links.push(`<a class="act" href="${scanAddr(contractForWithdraw, '#writeContract')}" target="_blank" rel="noopener noreferrer">${t('viaContract')} ↗</a>`);
    if (p.slug) links.push(`<a href="https://defillama.com/protocol/${esc(p.slug)}" target="_blank" rel="noopener noreferrer">${t('defillama')}</a>`);
    if (p.x) links.push(`<a href="https://x.com/${esc(p.x)}" target="_blank" rel="noopener noreferrer">${t('xacc')} @${esc(p.x)}</a>`);
  } else if (row.protocol && fallbackChip) {
    chips.push(`<span class="chip proto">${esc(row.protocol)}</span>`);
  }
  return { chips, links, p };
}

function rowHtml({ title, chips = [], sub = '', value, amount, links = [] }) {
  return `<div class="row">
    <div class="row-main"><div class="row-title">${title}${chips.join('')}</div>${sub ? `<div class="row-sub">${sub}</div>` : ''}</div>
    <div class="row-val"><span class="usd">${value}</span>${amount ? `<span class="amt">${amount}</span>` : ''}</div>
    ${links.length ? `<div class="row-links">${links.join('')}</div>` : ''}
  </div>`;
}

function group({ id, title, note, total, rows, urgent }) {
  if (!rows.length) return '';
  return `<section class="group${urgent ? ' urgent' : ''}" id="${id}">
    <div class="group-head"><h2>${title}</h2>${total != null ? `<span class="sum">${usdPlain(total)}</span>` : ''}</div>
    ${note ? `<p class="group-note">${note}</p>` : ''}
    <div class="rows">${rows.join('')}</div>
  </section>`;
}
function collapsible(title, total, inner, note = '') {
  if (!inner) return '';
  return `<details class="more"><summary>${title}<span class="sum">${total}</span></summary>${note ? `<p class="group-note">${note}</p>` : ''}${inner}</details>`;
}

// ---------- render ----------
let lastResult = null;
function render(r) {
  lastResult = r;
  r = { ...r, vaults: r.vaults.filter(notDust), debts: r.debts.filter(notDust), lp: r.lp.filter(notDust), wallet: r.wallet.filter(notDust) };
  const out = [];
  const pendingBridge = r.bridge.filter((b) => b.status !== 'finalized');
  const doneBridge = r.bridge.filter((b) => b.status === 'finalized');
  const depsGood = r.deposits.filter((d) => d.confidence !== 'low');
  const depsLow = r.deposits.filter((d) => d.confidence === 'low');
  const positions = r.totals.positions + r.totals.possible;
  const likely = r.totals.likely || 0;
  const found = r.totals.wallet + positions + r.totals.bridgePending;

  out.push(`<section class="summary">
    <div class="addr-line"><span class="addr">${esc(r.address)}</span>
      <span class="ext">
        <a class="strong" href="https://debank.com/profile/${r.address}" target="_blank" rel="noopener noreferrer">${t('openDebank')} ↗</a>
        <a href="${scanAddr(r.address)}" target="_blank" rel="noopener noreferrer">${t('openScan')} ↗</a>
        <a href="#" id="shareLink">${t('share')}</a>
        ${shareAmount(r) >= SHARE_MIN_USD ? `<a class="strong" href="#" id="shareOpen">${t('shareBtn')} ↗</a>` : ''}
      </span></div>
    <div class="figures">
      <div class="fig big"><span class="k">${t('found')}</span><span class="v">${usdPlain(found)}</span></div>
      <div class="fig"><span class="k">${t('positions')}</span><span class="v">${usdPlain(positions)}</span></div>
      <div class="fig"><span class="k">${t('wallet')}</span><span class="v">${usdPlain(r.totals.wallet)}</span></div>
      ${likely > 0 ? `<div class="fig"><span class="k">${t('possible')}</span><span class="v">~${usdPlain(likely)}</span></div>` : ''}
      ${r.totals.debt > 0 ? `<div class="fig"><span class="k">${t('debt')}</span><span class="v neg">−${usdPlain(r.totals.debt)}</span></div>` : ''}
      ${pendingBridge.length ? `<div class="fig"><span class="k">${t('bridge')}</span><span class="v alert">${usdPlain(r.totals.bridgePending)}</span></div>` : ''}
    </div>
  </section>`);

  // 1. bridge
  out.push(group({
    id: 'bridge', urgent: true, title: t('gBridge'), note: t('gBridgeNote'), total: r.totals.bridgePending,
    rows: pendingBridge.map((b) => rowHtml({
      title: `${amt(b.amount)} ${esc(b.symbol || 'ETH')}`,
      chips: [`<span class="chip ${b.status === 'proven' ? 'warn' : 'crit'}">${esc(t('st')[b.status] || b.status)}</span>`],
      sub: `${t('initiated')} ${b.date}${b.provenAt ? ` · ${t('provenAt')} ${b.provenAt}` : ''} · <span class="mono">${short(b.withdrawalHash)}</span>`,
      value: usd(b.usd),
      links: [
        `<a class="act" href="https://blast.io" target="_blank" rel="noopener noreferrer">${t('finishBridge')} ↗</a>`,
        `<a href="${SCAN}/tx/${b.txHash}" target="_blank" rel="noopener noreferrer">${t('tx')}</a>`,
        `<a href="https://etherscan.io/address/0x0Ec68c5B10F21EFFb74f2A5C61DFe6b08C0Db6Cb#writeProxyContract" target="_blank" rel="noopener noreferrer">${t('portal')}</a>`,
      ],
    })),
  }));

  // 2. lending & vaults
  const lendRows = [];
  for (const l of r.lending) {
    const { chips, links } = protoBits({ protocol: l.protocol }, l.pool);
    const hf = l.healthFactor;
    if (hf != null) chips.push(`<span class="chip ${hf < 1.1 ? 'crit' : hf < 1.5 ? 'warn' : 'ok'}">${t('hf')} ${hf > 100 ? '∞' : hf.toFixed(2)}</span>`);
    lendRows.push(rowHtml({ title: t('lending'), chips, sub: `${t('collateral')} ${usdPlain(l.collateralUsd)} · ${t('borrowed')} ${usdPlain(l.debtUsd)} · <span class="mono">${short(l.pool)}</span>`, value: usd(l.collateralUsd - l.debtUsd), links }));
  }
  for (const v of r.vaults) {
    const { chips, links } = protoBits(v, v.pool || v.token);
    links.push(`<a href="${scanAddr(v.account || v.token)}" target="_blank" rel="noopener noreferrer">${t('explorer')}</a>`);
    lendRows.push(rowHtml({ title: `${v.type === 'Vault' ? t('vault') : t('supplied')} · ${esc(v.underlyingSymbol || '?')}`, chips, sub: `${esc(v.name || '')}${v.receipt ? ` · ${esc(v.receipt)}` : ''}`, value: usd(v.usd), amount: `${amt(v.amount)} ${esc(v.underlyingSymbol || '')}`, links }));
  }
  for (const d of r.debts) {
    const { chips, links } = protoBits(d, d.token);
    lendRows.push(rowHtml({ title: `${t('borrowed')} · ${esc(d.underlyingSymbol || '?')}`, chips, sub: esc(d.name || d.receipt || ''), value: d.usd != null ? `<span style="color:var(--crit)">−${usdPlain(d.usd)}</span>` : usd(null), amount: `${amt(d.amount)} ${esc(d.underlyingSymbol || '')}`, links }));
  }
  out.push(group({ id: 'lending', title: t('gLend'), note: t('gLendNote'), total: sum(r.vaults) - sum(r.debts), rows: lendRows }));

  // 3. liquidity
  const lpRows = [];
  for (const x of r.lp) {
    const { chips, links } = protoBits(x, null);
    links.push(`<a href="${scanAddr(x.token)}" target="_blank" rel="noopener noreferrer">${t('explorer')}</a>`);
    lpRows.push(rowHtml({ title: `${t('lpv2')} · ${x.parts.map((p) => esc(p.symbol)).join(' / ')}`, chips, sub: x.parts.map((p) => `${amt(p.amount)} ${esc(p.symbol)}`).join(' + '), value: usd(x.usd), links }));
  }
  for (const x of r.nftPositions) {
    const { chips, links } = protoBits({ ...x, protocol: x.protocol }, x.heldBy !== 'wallet' ? x.heldBy : x.contract);
    if (x.inRange != null) chips.push(`<span class="chip ${x.inRange ? 'ok' : 'warn'}">${x.inRange ? t('inRange') : t('outRange')}</span>`);
    if (x.heldBy !== 'wallet') chips.push(`<span class="chip warn">${t('inFarm')} ${esc(x.heldByLabel || short(x.heldBy))}</span>`);
    links.push(`<a href="${SCAN}/nft/${x.contract}/${x.tokenId}" target="_blank" rel="noopener noreferrer">NFT #${esc(x.tokenId)}</a>`);
    if (x.heldBy !== 'wallet') links.push(`<a href="${scanAddr(x.heldBy, '#writeContract')}" target="_blank" rel="noopener noreferrer">${t('viaContract')} ↗</a>`);
    const parts = x.parts || [];
    lpRows.push(rowHtml({ title: `${t('lpv3')} · ${parts.map((p) => esc(p.symbol)).join(' / ')}`, chips, sub: (parts.map((p) => `${amt(p.amount)} ${esc(p.symbol)}`).join(' + ')) + (x.note ? ` · ${esc(x.note)}` : ''), value: usd(x.usd), links }));
  }
  out.push(group({ id: 'lp', title: t('gLp'), note: t('gLpNote'), total: sum(r.lp) + sum(r.nftPositions), rows: lpRows }));

  // 4. staked / locked / deposited
  const stRows = [];
  for (const l of r.locks) {
    const { chips, links } = protoBits(l, l.contract);
    chips.push(l.stream ? `<span class="chip ok">${t('streamNow')}</span>` : `<span class="chip ${l.unlocked ? 'ok' : 'warn'}">${l.unlock === 'permanent' ? t('permanent') : `${l.unlocked ? t('unlocked') : t('unlocks')} ${l.unlock}`}</span>`);
    links.push(`<a href="${SCAN}/nft/${l.contract}/${l.tokenId}" target="_blank" rel="noopener noreferrer">NFT #${esc(l.tokenId)}</a>`);
    stRows.push(rowHtml({ title: `${l.stream ? t('stream') : t('lock')} · ${esc(l.symbol || '?')}`, chips, sub: esc(l.collection || ''), value: usd(l.usd), amount: `${amt(l.amount)} ${esc(l.symbol || '')}`, links }));
  }
  for (const d of depsGood) stRows.push(depositRow(d));
  out.push(group({ id: 'staked', title: t('gStake'), note: t('gStakeNote'), total: sum(r.locks) + sum(depsGood), rows: stRows }));

  // 4b. potential token sales (not counted as found money)
  const sales = r.sales || [];
  const salesOpen = sales.filter((s) => s.status === 'unclaimed');
  const salesDone = sales.filter((s) => s.status !== 'unclaimed');
  if (salesOpen.length) out.push(group({ id: 'sales', title: t('gSales'), note: t('gSalesNote'), rows: salesOpen.map(saleRow) }));
  if (salesDone.length) out.push(`<section class="group">${collapsible(t('gSales'), String(salesDone.length), `<div class="rows">${salesDone.map(saleRow).join('')}</div>`, t('gSalesNote'))}</section>`);

  // 5. wallet
  out.push(group({
    id: 'wallet', title: t('gWallet'), note: t('gWalletNote'), total: r.totals.wallet,
    rows: r.wallet.map((w) => rowHtml({
      title: esc(w.symbol), chips: w.token === ETH ? [] : protoBits(w, null, { fallbackChip: false }).chips, sub: w.token === ETH ? 'Native ETH' : `${esc(w.name)} · <span class="mono">${short(w.token)}</span>`,
      value: usd(w.usd), amount: `${amt(w.amount)} ${esc(w.symbol)}`,
      links: w.token === ETH ? [] : [`<a href="${SCAN}/token/${w.token}?a=${r.address}" target="_blank" rel="noopener noreferrer">${t('explorer')}</a>`],
    })),
  }));

  // 6. collapsed extras
  const extras = [];
  if (depsLow.length) extras.push(collapsible(t('gGone'), `${depsLow.length} · ${usdPlain(sum(depsLow))}`, `<div class="rows">${depsLow.map(depositRow).join('')}</div>`, t('gGoneNote')));
  if (r.unknown.length) extras.push(collapsible(t('gUnknown'), String(r.unknown.length), `<div class="rows">${r.unknown.map((w) => rowHtml({ title: esc(w.symbol), chips: protoBits(w).chips, sub: `${esc(w.name)} · <span class="mono">${short(w.token)}</span>`, value: usd(null), amount: amt(w.amount), links: [`<a href="${SCAN}/token/${w.token}?a=${r.address}" target="_blank" rel="noopener noreferrer">${t('explorer')}</a>`] })).join('')}</div>`));
  if (r.nfts.length) extras.push(collapsible(t('gNft'), String(r.nfts.length), `<div class="rows nftgrid">${r.nfts.map((n) => rowHtml({ title: esc(n.collection || short(n.contract)), chips: n.heldBy !== 'wallet' ? [`<span class="chip warn">${t('inFarm')} ${esc(n.heldByLabel || short(n.heldBy))}</span>`] : [], sub: `#${esc(n.tokenId)}${n.erc1155 ? ` · ERC-1155 × ${esc(n.count)}` : ''}`, value: '', links: [`<a href="${SCAN}/nft/${n.contract}/${n.tokenId}" target="_blank" rel="noopener noreferrer">${t('explorer')}</a>`] })).join('')}</div>`));
  if (r.spam.length) extras.push(collapsible(t('gSpam'), String(r.spam.length), `<p class="group-note" style="color:var(--crit)">${t('gSpamNote')}</p><div class="rows">${r.spam.slice(0, 200).map((s) => `<div class="row"><div class="row-main"><div class="row-sub mono">${esc(short(s.token))} · ${esc((s.name || '').replace(/https?:\/\/\S+/g, '[link removed]').slice(0, 60))}</div></div></div>`).join('')}</div>`));
  if (extras.length) out.push(`<section class="group">${extras.join('')}</section>`);

  const empty = !r.wallet.length && !r.vaults.length && !r.lp.length && !r.nftPositions.length && !r.locks.length && !depsGood.length && !pendingBridge.length && !r.debts.length;
  if (empty) out.push(`<p class="empty">${t('nothing')}</p>`);
  if (doneBridge.length) out.push(`<p class="group-note">✓ ${doneBridge.length} bridge withdrawal(s) already finalized.</p>`);
  for (const n of r.notes || []) out.push(`<p class="group-note">${esc(trLog(n))}</p>`);

  // DeBank
  out.push(`<section class="group debank" id="debank">
    <div class="group-head"><h2>${t('debankT')}</h2></div>
    <p class="group-note">${t('debankNote')}</p>
    <div class="keyrow"><input id="dbkey" type="password" placeholder="${t('debankKey')}" autocomplete="off" value="${esc(getKey())}"><button class="btn ghost" id="dbbtn" type="button">${t('debankBtn')}</button></div>
    <div id="dbout"></div>
  </section>`);

  const res = document.getElementById('results');
  res.innerHTML = out.join('');
  document.getElementById('shareLink')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const url = location.origin + location.pathname + '?a=' + r.address;
    try { await navigator.clipboard.writeText(url); e.target.textContent = t('copied'); } catch { prompt?.('', url); }
  });
  document.getElementById('dbbtn')?.addEventListener('click', () => loadDebank(r.address));
  document.getElementById('shareOpen')?.addEventListener('click', (e) => { e.preventDefault(); openShare(r); });
}

function projName(d) {
  if (d.contractLabel === 'Your Safe (multisig)') return t('yourSafe');
  return d.contractLabel || t('unnamed');
}

function saleRow(s) {
  const { chips, links } = protoBits(s, null);
  chips.unshift(`<span class="chip sale">${t('saleChip')}</span>`);
  chips.push(`<span class="chip ${s.status === 'unclaimed' ? 'crit' : s.status === 'claimed' ? 'ok' : ''}">${t('saleSt')[s.status]}</span>`);
  links.unshift(`<a href="${scanAddr(s.contract, '#readContract')}" target="_blank" rel="noopener noreferrer">Read Contract</a>`);
  if (s.status === 'unclaimed') links.unshift(`<a class="act" href="${scanAddr(s.contract, '#writeContract')}" target="_blank" rel="noopener noreferrer">claim / refund ↗</a>`);
  if (s.txs?.length) links.push(`<a href="${SCAN}/tx/${s.txs[0]}" target="_blank" rel="noopener noreferrer">${t('tx')}</a>`);
  const got = s.received?.length ? s.received.map((x) => `${amt(x.amount)} ${esc(x.symbol)}`).join(' + ') : t('nothingBack');
  const sub = [
    `${t('paid')} ${amt(s.paid)} ${esc(s.symbol || '')}${s.refunded ? ` · ${t('refunded')} ${amt(s.refunded)} ${esc(s.symbol || '')}` : ''}${s.fns?.length ? ` · <span class="mono">${esc(s.fns.slice(0, 2).join(', '))}()</span>` : ''}`,
    `${t('got')}: ${got}`,
    `<span class="mono">${short(s.contract)}</span>${s.firstDeposit ? ` · ${s.firstDeposit}` : ''}`,
  ].join('<br>');
  return rowHtml({ title: `<span class="proj">${esc(projName(s))}</span>`, chips, sub, value: s.usd != null ? `<span class="amt">${t('spent')}</span> ${usdPlain(s.usd)}` : usd(null), amount: `${amt(s.netSpent)} ${esc(s.symbol || '')}`, links });
}

function depositRow(d) {
  const { chips, links } = protoBits(d, d.contract);
  chips.unshift(`<span class="chip ${d.confidence === 'high' ? 'ok' : d.confidence === 'medium' ? 'warn' : ''}">${t('conf')[d.confidence]}</span>`);
  if (d.ownedByYou) chips.push(`<span class="chip">${t('yours')}</span>`);
  if (d.ownedByYou) links.unshift(`<a class="act" href="?a=${d.contract}">${t('scanThis')}</a>`);
  else if (!links.some((l) => l.includes('writeContract'))) links.unshift(`<a class="act" href="${scanAddr(d.contract, '#writeContract')}" target="_blank" rel="noopener noreferrer">${t('viaContract')} ↗</a>`);
  links.push(`<a href="${scanAddr(d.contract)}" target="_blank" rel="noopener noreferrer">${t('explorer')}</a>`);
  if (d.txs?.length) links.push(`<a href="${SCAN}/tx/${d.txs[d.txs.length - 1]}" target="_blank" rel="noopener noreferrer">${t('tx')}</a>`);
  const sub = [
    `${t('deposit')} ${esc(d.symbol || '?')}${d.fns?.length ? ` ${t('via')} <span class="mono">${esc(d.fns.slice(0, 2).join(', '))}()</span>` : ''} · <span class="mono">${short(d.contract)}</span>`,
    `${t('deposited')} ${amt(d.deposited)} · ${t('withdrawn')} ${amt(d.withdrawn)}${d.lastDeposit ? ` · ${t('last')} ${d.lastDeposit}` : ''}`,
    d.evidence?.length ? `<span class="mono">${esc(d.evidence[0])}</span>` : '',
  ].filter(Boolean).join('<br>');
  return rowHtml({ title: `<span class="proj">${esc(projName(d))}</span>`, chips, sub, value: usd(d.usd), amount: `${amt(d.amount)} ${esc(d.symbol || '')}`, links });
}

// ---------- DeBank (optional, user's own key) ----------
function getKey() { try { return localStorage.getItem('bl-debank') || ''; } catch { return ''; } }
async function loadDebank(address) {
  const key = document.getElementById('dbkey').value.trim();
  const box = document.getElementById('dbout');
  if (!key) { box.innerHTML = `<p class="group-note">${t('debankKey')}?</p>`; return; }
  try { localStorage.setItem('bl-debank', key); } catch { /* optional */ }
  box.innerHTML = '<div class="progress"><span class="spinner"></span>DeBank…</div>';
  try {
    const r = await fetch(`https://pro-openapi.debank.com/v1/user/complex_protocol_list?id=${address}&chain_id=blast`, { headers: { AccessKey: key, accept: 'application/json' } });
    const j = await r.json();
    if (!r.ok) throw new Error(j.message || r.status);
    if (!j.length) { box.innerHTML = `<p class="group-note">${t('debankNone')}</p>`; return; }
    box.innerHTML = '<div class="rows">' + j.map((p) => {
      const net = p.portfolio_item_list.reduce((s, i) => s + (i.stats?.net_usd_value || 0), 0);
      const items = p.portfolio_item_list.map((i) => {
        const toks = [...(i.detail?.supply_token_list || []), ...(i.detail?.token_list || [])].map((x) => `${amt(x.amount)} ${esc(x.symbol)}`).join(' + ');
        const debt = (i.detail?.borrow_token_list || []).map((x) => `−${amt(x.amount)} ${esc(x.symbol)}`).join(', ');
        return `${esc(i.name)}: ${toks}${debt ? ` · ${debt}` : ''}`;
      }).join('<br>');
      const links = p.site_url ? [`<a class="act" href="${esc(p.site_url)}" target="_blank" rel="noopener noreferrer">${esc(p.site_url.replace(/^https?:\/\//, ''))} ↗</a>`] : [];
      return rowHtml({ title: esc(p.name), chips: [], sub: items, value: usd(net), links });
    }).join('') + '</div>';
  } catch (e) {
    box.innerHTML = `<p class="error">${t('debankErr')}${esc(e.message)}</p>`;
  }
}

const LOG_UK = [
  [/^Loading transaction history…$/, 'Завантажую історію транзакцій…'],
  [/^Token transfers loaded: (\d+)$/, 'Завантажено переказів токенів: $1'],
  [/^History: (\d+) token transfers, (\d+) NFT transfers, (\d+) transactions$/, 'Історія: $1 переказів токенів, $2 NFT, $3 транзакцій'],
  [/^Checking balances of (\d+) tokens…$/, 'Перевіряю баланси $1 токенів…'],
  [/^Decoding (\d+) tokens \(lending \/ LP \/ vaults\)…$/, 'Розпізнаю $1 токенів (лендінг / LP / волти)…'],
  [/^Checking NFTs and LP positions…$/, 'Перевіряю NFT та LP-позиції…'],
  [/^Looking for deposits without receipt tokens \(staking, farms\)…$/, 'Шукаю депозити без receipt-токенів (стейкінг, фарми)…'],
  [/^Checking unfinished bridge withdrawals on Ethereum…$/, 'Перевіряю незавершені виводи через міст на Ethereum…'],
  [/^Fetching prices…$/, 'Підтягую ціни…'],
  [/^Done$/, 'Готово'],
  [/^Very active wallet: the deposit search was limited to the largest candidates\.$/, 'Дуже активний гаманець: пошук депозитів обмежено найбільшими кандидатами.'],
];
const trLog = (m) => { if (lang !== 'uk') return m; for (const [re, s] of LOG_UK) if (re.test(m)) return m.replace(re, s); return m; };

// ---------- share ----------
const SHARE_MIN_USD = 20;
const SITE = 'blast-leftovers.vercel.app';
// Only what is certainly still there: wallet, decoded positions, confirmed deposits, unfinished bridge
// withdrawals, minus debt. "Likely" / "probably moved" rows and token sales are left out.
function shareAmount(r) {
  const t0 = r.totals || {};
  return Math.max(0, (t0.wallet || 0) + (t0.positions || 0) + (t0.possible || 0) + (t0.bridgePending || 0) - (t0.debt || 0));
}
const fmtShare = (v) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: v >= 100 ? 0 : 2, minimumFractionDigits: v >= 100 ? 0 : 2 });
function sharePostText(v) {
  return `just found ${fmtShare(v)} I forgot on Blast before it shuts down 😳\n\ncheck yours before Oct 26, just paste your address:\n${SITE}\n\nh/t @NotYur`;
}
const shareDlg = document.getElementById('shareDlg');
const shownFor = new Set();
function openShare(r) {
  const v = shareAmount(r);
  const text = sharePostText(v);
  document.getElementById('share-h').textContent = t('shareTitle')(fmtShare(v));
  document.getElementById('sharePreview').textContent = text;
  document.getElementById('shareX').href = 'https://x.com/intent/post?text=' + encodeURIComponent(text);
  document.getElementById('shareCopy').textContent = t('shareCopy');
  if (typeof shareDlg.showModal === 'function') shareDlg.showModal(); else shareDlg.setAttribute('open', '');
}
function maybeShare(r) {
  if (shownFor.has(r.address) || shareAmount(r) < SHARE_MIN_USD) return;
  shownFor.add(r.address);
  setTimeout(() => { if (!document.getElementById('donateDlg').open) openShare(r); }, 1800);
}
document.getElementById('shareClose').addEventListener('click', () => shareDlg.close());
document.getElementById('shareX').addEventListener('click', () => setTimeout(() => shareDlg.close(), 300));
shareDlg.addEventListener('click', (e) => { if (e.target === shareDlg) shareDlg.close(); });
document.getElementById('shareCopy').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  try { await navigator.clipboard.writeText(document.getElementById('sharePreview').textContent); btn.textContent = t('copied'); }
  catch {
    const range = document.createRange(); range.selectNodeContents(document.getElementById('sharePreview'));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
  }
});

// ---------- donate ----------
const fab = document.getElementById('donateFab');
const dlg = document.getElementById('donateDlg');
let tally = null, shakeTimer = null;
const fmtUsd = (v) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: v >= 100 ? 0 : 2 });
function renderTally() {
  const box = document.getElementById('tallyBox');
  const ft = document.getElementById('fabTally');
  if (!tally) { box.innerHTML = `<span class="small">${t('tallyLoading')}</span>`; ft.textContent = ''; return; }
  if (tally.error) { box.innerHTML = `<span class="small">${t('tallyFail')}</span>`; return; }
  const total = tally.total || 0;
  const bar = GOAL_USD ? `<div class="bar"><i style="width:${Math.min(100, (total / GOAL_USD) * 100).toFixed(1)}%"></i></div><span class="small">${t('goal')} ${fmtUsd(GOAL_USD)}</span>` : '';
  const amt2 = (n) => n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n >= 1 ? n.toLocaleString('en-US', { maximumFractionDigits: 3 }) : n.toPrecision(3);
  const chains = (tally.perChain || []).map((c) => `<span class="small">${c.name}: ${c.items.map((x) => `${amt2(x.amount)} ${x.symbol}`).join(' + ')}${c.usd ? ` · ${fmtUsd(c.usd)}` : ''}</span>`).join('');
  const spent = tally.spentUsd > 0 ? `<span class="small">${t('spentOn')} ${fmtUsd(tally.spentUsd)}</span>` : '';
  const status = tally.failed?.length
    ? `<span class="small" style="color:var(--warn)">${t('tallyPartial')(tally.checked, tally.chains, tally.failed.join(', '))}</span>`
    : `<span class="small">${t('tallyChecked')(tally.chains)}</span>`;
  box.innerHTML = `<span class="small">${t('raised')}</span><span class="big">${tally.failed?.length ? '≥ ' : ''}${fmtUsd(total)}</span>${bar}${chains}${spent}${status}`;
  ft.textContent = total > 0 ? fmtUsd(total) : '';
}
async function refreshTally() {
  try { tally = await loadTally(); } catch { tally = { error: true }; }
  renderTally();
}
function openDonate() {
  document.getElementById('donateAddr').textContent = DONATE_ADDRESS;
  renderTally();
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  refreshTally();
}
function onScanDone() {
  fab.hidden = false;
  if (!tally) setTimeout(refreshTally, 4000); // let the scan's own explorer calls finish first
  clearInterval(shakeTimer);
  // shake every ~4.5 s while visible; skip while the donate dialog is open
  const shake = () => { if (dlg.open || shareDlg.open) return; fab.classList.remove('shake'); void fab.offsetWidth; fab.classList.add('shake'); };
  setTimeout(shake, 1500);
  shakeTimer = setInterval(shake, 4500);
}
fab.addEventListener('click', openDonate);
document.getElementById('donateFooter').addEventListener('click', openDonate);
document.getElementById('closeDonate').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
document.getElementById('copyDonate').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  try { await navigator.clipboard.writeText(DONATE_ADDRESS); btn.textContent = t('copied'); }
  catch {
    const range = document.createRange(); range.selectNodeContents(document.getElementById('donateAddr'));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
  }
  setTimeout(() => { btn.textContent = t('copyAddr'); }, 2000);
});

// ---------- scan flow ----------
const form = document.getElementById('scanForm');
const input = document.getElementById('addr');
const status = document.getElementById('status');
const btn = document.getElementById('scanBtn');

async function run(address) {
  address = address.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) { status.innerHTML = `<p class="error">${t('invalid')}</p>`; return; }
  history.replaceState(null, '', '?a=' + address);
  btn.disabled = true;
  document.getElementById('results').innerHTML = '';
  status.innerHTML = '<div class="progress"><span class="spinner"></span><span id="plog"></span></div>';
  const plog = document.getElementById('plog');
  try {
    const r = await scan(address, (m) => { plog.textContent = trLog(m); });
    status.innerHTML = '';
    render(r);
    onScanDone();
    maybeShare(r);
  } catch (e) {
    console.error(e);
    status.innerHTML = `<p class="error">${t('failed')}${esc(e.shortMessage || e.message)}<br>${t('retry')}</p>`;
  } finally {
    btn.disabled = false;
  }
}
form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); });
document.getElementById('example').addEventListener('click', () => { input.value = EXAMPLE; run(EXAMPLE); });

applyLang();
const q = new URLSearchParams(location.search).get('a');
if (q) { input.value = q; run(q); }
