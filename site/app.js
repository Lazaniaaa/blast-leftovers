import { scan, ETH, abstractWallets } from './engine.js';
import { CHAINS } from './chains.js';
import { resolveProtocol, PROTOCOLS } from './protocols.js';
import { DONATE_ADDRESS, GOAL_USD, loadTally } from './donate.js';

const EXAMPLE = CHAINS.blast.example;
// The chain of the block being rendered: links, explorer and protocol status depend on it
let CUR = CHAINS.blast;
let SCAN = CUR.scan;

// ---------- i18n ----------
const T = {
  en: {
    h1: 'What did you <em>leave on Blast or Abstract?</em>',
    lede: 'Blast and Abstract are shutting down. Paste an address to find everything still there: lending deposits, LP positions, staking, vaults, locks and bridge withdrawals you never finished. Your Abstract Global Wallet is found automatically.',
    scan: 'Scan address',
    hintNoConnect: '<b>No wallet connection.</b> Read-only, runs in your browser.',
    example: 'Try an example address',
    deadline: (name, label, d) => d > 0 ? `${name} closes ${label} · ${d} day${d === 1 ? '' : 's'}` : `${name}: deadline passed`,
    closes: (label, d) => d > 0 ? `closes ${label} · ${d}d left` : 'deadline passed',
    chainAll: 'All chains', agwLookup: 'looking for your Abstract Global Wallet…',
    agwHead: 'Abstract Global Wallet', signerHead: 'signer address', agwProbableHead: 'probably your Global Wallet',
    agwNoteLinked: (s) => `This smart wallet is officially linked to ${s}, the address you pasted.`,
    agwNoteProbable: (s) => `Found from your transfers: ${s} sent funds to this smart wallet and got funds back from it, so it is most likely yours. If it is not, ignore this block.`,
    agwSuggest: 'You also sent funds to these Abstract Global Wallets. If one is yours, scan it:',
    agwNote: (s) => `Found automatically: this smart wallet belongs to the signer ${s} you pasted.`,
    foundAll: 'Found in total', bridgeDone: (n) => `${n} bridge withdrawal(s) already finalized.`,
    gBridgeNoteAbs: 'You started these withdrawals to Ethereum. "Ready to claim" means the batch is on Ethereum but nobody claimed the funds yet: claim them through the official migration page. "Waiting" means the batch is not on Ethereum yet (usually about 3 hours).',
    gWalletNoteAbs: 'Plain balances. Swap or bridge them out before Dec 15. Tokens that exist only on Abstract can be sold only while the chain runs.',
    gNftNoteAbs: 'NFTs on Abstract cannot be bridged in general. Whether a collection moves depends on its project; check their announcements.',
    gUnknownNoteAbs: 'Tokens without a market price. If they exist only on Abstract, sell them before Dec 15 or they are lost.',
    prediction: 'Prediction market', markets: (n) => `${n} market${n === 1 ? '' : 's'}`,
    pst: { claim: 'won, not claimed', open: 'open position', voided: 'market voided, refund' },
    gApps: 'Check inside these apps', gAppsNote: 'You used these apps. They keep part of the balance in their own ledger (game items, cards, trading accounts, points), which no scanner can read. Open each app and withdraw before Dec 15.',
    appNote: {
      gigaverse: 'Game items not exported through Trade Port, and in-game balances.',
      och: 'Heroes staked in game contracts, unclaimed HERO, VALOR from Maze of Gains (off-chain).',
      shiny: 'Vaulted cards, quick-sell proceeds, Pawnshop loans.',
      gacha: 'Cards held as NFTs (physical twins), buybacks, prize pools.',
      orderly: 'Trading account balance (Orderly-based exchanges). Withdraw it in the app.',
      logx: 'Trading account balance. Withdraw it in the app.',
      witty: 'Game balance and unfinished rounds.',
      amigo: 'Keys inside Amigo: sell them back in the app.',
      deathfun: 'Unfinished rounds: cash out in the app.',
    },
    insolvent: 'insolvent here',
    invalid: 'That is not a valid EVM address. It should start with 0x and have 40 hex characters.',
    failed: 'Scan failed: ',
    retry: 'Public APIs sometimes rate-limit. Wait a few seconds and scan again.',
    found: (n) => `Found on ${n}`, wallet: 'In wallet', positions: 'In protocols', debt: 'Debt', possible: 'Probably still deposited', bridge: 'Bridge, unfinished',
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
    st: { initiated: 'not proven', proven: 'proven, not finalized', finalized: 'done', unknown: 'unknown', waiting: 'waiting for Ethereum', claimable: 'ready to claim' },
    initiated: 'started', provenAt: 'proven',
    finishBridge: 'Official bridge', portal: 'L1 portal contract',
    nothing: (n) => `Nothing found on ${n} for this address. If you used a smart wallet or a Safe, scan that address too.`,
    debankT: 'Cross-check with DeBank',
    debankNote: 'DeBank lists protocol positions it knows about. Its API needs your own DeBank Cloud AccessKey. The key is saved only in this browser and sent only to DeBank.',
    debankBtn: 'Load from DeBank', debankKey: 'DeBank Cloud AccessKey', debankNone: 'DeBank shows no Blast or Abstract protocol positions for this address.',
    debankErr: 'DeBank request failed: ',
    how1t: 'Receipt tokens', how1: 'Every token you ever received is checked. aTokens, cTokens, LP tokens and ERC-4626 shares are converted to the assets behind them.',
    how2t: 'Money that never came back', how2: 'Transactions where tokens or ETH went into a contract and nothing came back are grouped by contract, then checked against what the contract still holds.',
    how3t: 'LP NFTs and locks', how3: 'Thruster, Blasterswap, SakuraSwap, Aborean and other concentrated positions are valued from the pool price, including NFTs sitting in farms. Vote-escrow locks are read too.',
    how5t: 'Separate wallets', how5: 'On Abstract your Abstract Global Wallet is derived from your signer address and scanned automatically. Blast Mobile, AgentFi agents and Safe multisigs use their own addresses, so scan those too.',
    how4t: 'Bridge withdrawals', how4: 'Every withdrawal you started on Blast or Abstract is looked up on Ethereum to see whether it was proven, finalized or still waits to be claimed.',
    phish: 'Blast and Abstract are full of fake "claim" and "migration" sites right now. This page never asks you to connect a wallet or sign anything. Only use protocol links you can verify.',
    disclaimer: 'Unofficial community tool, not affiliated with Blast, Abstract or any protocol listed. Data: Blast and Abstract RPCs, Routescan, Abstract block explorer, DefiLlama, Ethereum RPC. Heuristic results can be wrong; verify on the explorer before acting.',
    stream: 'Vesting stream', streamNow: 'withdrawable now',
    themeAuto: 'Auto', themeLight: 'Light', themeDark: 'Dark',
    limT: 'Known limitations (beta)',
    lim1: 'Open positions in SynFutures, Particle LAMM, INIT (position NFTs) and Mangrove are not decoded yet. Margin in SynFutures is shown. On Abstract, Myriad markets and Morpho are read, but balances kept inside games and apps (VALOR, DYLI earnings, unexported Gigaverse items, Shiny or Gacha cards, Orderly accounts, game wallets made by an app) are not: the scan lists the apps you used so you can check them.',
    lim2: 'Blast Mobile and AgentFi smart wallets have their own addresses. Paste them separately. Abstract Global Wallets are found automatically.',
    lim3: 'Very active wallets take about a minute, and only the latest 20,000 records of history are checked.',
    lim4: 'The page relies on free public APIs (Routescan, the Abstract explorer, public RPCs, DefiLlama). If a chain’s RPC goes offline early, its scans stop working.',
    lim5: 'Results come partly from heuristics and can be wrong. Check the contract on the explorer before you act.',
    donateBtn: '💍 Donate', donateFooter: '💍 Support this tool',
    donateT: 'Found something? 🎉',
    donateText: '🙏 If this saved you some forgotten bags, tip the dev! 💍 Every donation goes toward buying one OCH Ringbearer 🧙‍♂️✨ (not set in stone: if it adds up to 2 or more, I’ll probably grab more 😏)',
    evmNote: 'This is an EVM address. Send ETH, USDC or USDT on Ethereum, Base, BNB Chain, Arbitrum, Robinhood Chain, Monad, Polygon, Avalanche, Arc, Plasma, OP Mainnet, Blast or Abstract. Double-check the address after pasting.',
    copyAddr: 'Copy address', seeCollection: 'OCH Ringbearer on OpenSea ↗', close: 'Close',
    raised: 'Raised for the Ringbearer', tallyLoading: 'Checking 13 networks…', tallyFail: 'Could not load the total right now.', goal: 'goal',
    spentOn: 'Already spent on the Ringbearer:',
    shareTitle: (v, chains) => `You found ${v} on ${chains} 🎉`,
    shareText: 'Help others check theirs before the deadline. Here is a ready post, edit it if you like. Your address is not in it.',
    shareDebt: (d) => `Your debt of ${d} is already subtracted, so the number is a bit lower than "Found".`,
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
    h1: 'Що ти <em>залишив на Blast чи Abstract?</em>',
    lede: 'Blast і Abstract закриваються. Встав адресу й побачиш усе, що там лишилось: депозити в лендінгах, LP-позиції, стейкінг, волти, локи та незавершені виводи через міст. Abstract Global Wallet знаходиться автоматично.',
    scan: 'Перевірити',
    hintNoConnect: '<b>Без підключення гаманця.</b> Лише читання, все працює у твоєму браузері.',
    example: 'Спробувати на прикладі',
    deadline: (name, label, d) => d > 0 ? `${name} закривається ${label} · ${d} дн.` : `${name}: дедлайн минув`,
    closes: (label, d) => d > 0 ? `закривається ${label} · лишилось ${d} дн.` : 'дедлайн минув',
    chainAll: 'Усі мережі', agwLookup: 'шукаю твій Abstract Global Wallet…',
    agwHead: 'Abstract Global Wallet', signerHead: 'адреса signer', agwProbableHead: 'схоже, твій Global Wallet',
    agwNoteLinked: (s) => `Цей смарт-гаманець офіційно прив’язаний до адреси ${s}, яку ти вставив.`,
    agwNoteProbable: (s) => `Знайдено за переказами: ${s} надсилав гроші на цей смарт-гаманець і отримував їх назад, тож він найімовірніше твій. Якщо ні, просто ігноруй цей блок.`,
    agwSuggest: 'Ти також надсилав гроші на ці Abstract Global Wallet. Якщо котрийсь твій, перевір його:',
    agwNote: (s) => `Знайдено автоматично: цей смарт-гаманець належить signer-адресі ${s}, яку ти вставив.`,
    foundAll: 'Знайдено разом', bridgeDone: (n) => `Уже завершених виводів через міст: ${n}.`,
    gBridgeNoteAbs: 'Ти почав ці виводи в Ethereum. «Можна заклеймити» означає, що батч уже в Ethereum, але кошти ніхто не забрав: заклейми їх через офіційну сторінку міграції. «Чекає Ethereum» означає, що батч ще не в Ethereum (зазвичай близько 3 годин).',
    gWalletNoteAbs: 'Звичайні баланси. Обміняй або виведи їх до 15 грудня. Токени, що існують лише на Abstract, можна продати тільки поки мережа працює.',
    gNftNoteAbs: 'NFT з Abstract загалом не переносяться мостом. Чи переїде колекція, вирішує її проєкт: дивись їхні анонси.',
    gUnknownNoteAbs: 'Токени без ринкової ціни. Якщо вони є лише на Abstract, продай їх до 15 грудня, інакше вони пропадуть.',
    prediction: 'Ринок прогнозів', markets: (n) => `ринків: ${n}`,
    pst: { claim: 'виграш не забрано', open: 'відкрита позиція', voided: 'ринок скасовано, повернення' },
    gApps: 'Перевір усередині цих застосунків', gAppsNote: 'Ти користувався цими застосунками. Частину балансу вони тримають у власному обліку (ігрові предмети, картки, торгові акаунти, поінти), і жоден сканер його не бачить. Відкрий кожен застосунок і виведи кошти до 15 грудня.',
    appNote: {
      gigaverse: 'Ігрові предмети, не експортовані через Trade Port, і баланси в грі.',
      och: 'Герої, застейкані в ігрових контрактах, незабраний HERO, VALOR з Maze of Gains (поза блокчейном).',
      shiny: 'Картки у сховищі, гроші за quick-sell, позики в Pawnshop.',
      gacha: 'Картки у вигляді NFT (фізичні двійники), buyback, призові пули.',
      orderly: 'Баланс торгового акаунта (біржі на Orderly). Виведи його в застосунку.',
      logx: 'Баланс торгового акаунта. Виведи його в застосунку.',
      witty: 'Баланс у грі та незавершені раунди.',
      amigo: 'Keys в Amigo: продай їх назад у застосунку.',
      deathfun: 'Незавершені раунди: забери гроші в застосунку.',
    },
    insolvent: 'тут неплатоспроможний',
    invalid: 'Це не схоже на EVM-адресу. Вона має починатися з 0x і мати 40 hex-символів.',
    failed: 'Помилка сканування: ',
    retry: 'Публічні API іноді обмежують запити. Зачекай кілька секунд і спробуй ще раз.',
    found: (n) => `Знайдено на ${n}`, wallet: 'На гаманці', positions: 'У протоколах', debt: 'Борг', possible: 'Ймовірно ще в депозитах', bridge: 'Міст, не завершено',
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
    st: { initiated: 'не доведено (prove)', proven: 'доведено, не фіналізовано', finalized: 'завершено', unknown: 'невідомо', waiting: 'чекає Ethereum', claimable: 'можна заклеймити' },
    initiated: 'почато', provenAt: 'prove',
    finishBridge: 'Офіційний міст', portal: 'L1-контракт порталу',
    nothing: (n) => `Для цієї адреси на ${n} нічого не знайдено. Якщо ти користувався смарт-гаманцем або Safe, перевір і ту адресу.`,
    debankT: 'Звірити з DeBank',
    debankNote: 'DeBank показує позиції в протоколах, які він знає. Його API потребує твого власного AccessKey з DeBank Cloud. Ключ зберігається лише в цьому браузері й надсилається лише в DeBank.',
    debankBtn: 'Завантажити з DeBank', debankKey: 'AccessKey DeBank Cloud', debankNone: 'DeBank не бачить позицій у протоколах Blast чи Abstract для цієї адреси.',
    debankErr: 'Помилка запиту до DeBank: ',
    how1t: 'Receipt-токени', how1: 'Перевіряється кожен токен, який ти коли-небудь отримував. aTokens, cTokens, LP-токени та ERC-4626 частки переводяться в активи, що за ними стоять.',
    how2t: 'Гроші, що не повернулися', how2: 'Транзакції, де токени чи ETH пішли в контракт і нічого не повернулося, групуються по контракту і звіряються з тим, що контракт досі тримає.',
    how3t: 'LP NFT та локи', how3: 'Позиції Thruster, Blasterswap, SakuraSwap, Aborean та інших рахуються за ціною пулу, включно з NFT у фармах. Також читаються vote-escrow локи.',
    how5t: 'Окремі гаманці', how5: 'На Abstract твій Abstract Global Wallet виводиться з адреси signer і сканується автоматично. Blast Mobile, агенти AgentFi та Safe-мультисиги мають власні адреси, тож перевір і їх.',
    how4t: 'Виводи через міст', how4: 'Кожен вивід, який ти почав на Blast чи Abstract, перевіряється в Ethereum: чи був prove, finalize, чи він ще чекає клейму.',
    phish: 'Зараз довкола Blast і Abstract повно фейкових «claim»- і «migration»-сайтів. Ця сторінка ніколи не просить підключити гаманець чи щось підписати. Користуйся лише посиланнями, які можеш перевірити.',
    disclaimer: 'Неофіційний інструмент спільноти, не пов’язаний з Blast, Abstract чи протоколами зі списку. Дані: RPC Blast і Abstract, Routescan, експлорер Abstract, DefiLlama, Ethereum RPC. Евристика може помилятися, перевіряй в експлорері перед діями.',
    stream: 'Вестинг-стрім', streamNow: 'можна вивести зараз',
    themeAuto: 'Авто', themeLight: 'Світла', themeDark: 'Темна',
    limT: 'Відомі обмеження (бета)',
    lim1: 'Відкриті позиції в SynFutures, Particle LAMM, INIT (NFT позицій) і Mangrove поки не розбираються. Маржа в SynFutures показується. На Abstract ринки Myriad і Morpho читаються, а баланси всередині ігор і застосунків (VALOR, заробіток у DYLI, неекспортовані предмети Gigaverse, картки Shiny чи Gacha, акаунти Orderly, ігрові гаманці, які створив застосунок) — ні: сканер показує застосунки, якими ти користувався, щоб ти перевірив їх сам.',
    lim2: 'Смарт-гаманці Blast Mobile та AgentFi мають власні адреси, встав їх окремо. Abstract Global Wallet знаходиться автоматично.',
    lim3: 'Дуже активні гаманці скануються близько хвилини, і перевіряються лише останні 20 000 записів історії.',
    lim4: 'Сторінка працює на безкоштовних публічних API (Routescan, експлорер Abstract, публічні RPC, DefiLlama). Якщо RPC мережі вимкнуть раніше, її сканування перестане працювати.',
    lim5: 'Частина результатів — евристика, тож можливі помилки. Перевір контракт в експлорері перед діями.',
    donateBtn: '💍 Донат', donateFooter: '💍 Підтримати проєкт',
    donateT: 'Знайшов щось? 🎉',
    donateText: '🙏 Якщо застосунок допоміг знайти забуті гроші, підкинь трохи розробнику! 💍 Усі донати підуть на покупку одного OCH Ringbearer 🧙‍♂️✨ (але це не точно: якщо збереться на 2 і більше, мабуть, куплю більше 😏)',
    evmNote: 'Це EVM-адреса. Можна надсилати ETH, USDC чи USDT в Ethereum, Base, BNB Chain, Arbitrum, Robinhood Chain, Monad, Polygon, Avalanche, Arc, Plasma, OP Mainnet, Blast чи Abstract. Перевір адресу після вставки.',
    copyAddr: 'Скопіювати адресу', seeCollection: 'OCH Ringbearer на OpenSea ↗', close: 'Закрити',
    raised: 'Зібрано на Ringbearer', tallyLoading: 'Перевіряю 13 мереж…', tallyFail: 'Зараз не вдалося завантажити суму.', goal: 'ціль',
    spentOn: 'Вже витрачено на Ringbearer:',
    shareTitle: (v, chains) => `Ти знайшов ${v} на ${chains} 🎉`,
    shareText: 'Допоможи іншим перевірити свої гаманці до дедлайну. Ось готовий пост, можеш його змінити. Твоєї адреси в ньому немає.',
    shareDebt: (d) => `Борг ${d} уже віднято, тому сума трохи менша, ніж «Знайдено».`,
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
const dl = (c) => new Date(c.deadline).toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function applyLang() {
  document.documentElement.lang = lang === 'uk' ? 'uk' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  document.getElementById('deadline').textContent = Object.values(CHAINS)
    .map((c) => t('deadline')(c.name, dl(c), Math.ceil((new Date(c.deadline) - Date.now()) / 86400000))).join('  ·  ');
  document.querySelectorAll('[data-i18n-chain-all]').forEach((el) => { el.textContent = t('chainAll'); });
  if (lastResults) renderAll(lastResults);
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
const nftUrl = (c, id) => `${SCAN}/nft/${c}/${id}`;

function protoBits(row, contractForWithdraw, { fallbackChip = true } = {}) {
  const p = row.protocolKey ? { key: row.protocolKey, ...PROTOCOLS[row.protocolKey] } : resolveProtocol(row.protocol, row.name, row.receipt, row.collection, row.contractLabel, row.heldByLabel);
  const chips = [];
  const links = [];
  if (p) {
    chips.push(`<span class="chip proto">${esc(p.name)}</span>`);
    if (p.dead) chips.push(`<span class="chip dead">${t('siteDown')}</span>`);
    if (p.insolvent?.includes(CUR.key)) chips.push(`<span class="chip crit">${t('insolvent')}</span>`);
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
let lastResults = null;
const trimDust = (r) => ({ ...r, vaults: r.vaults.filter(notDust), debts: r.debts.filter(notDust), lp: r.lp.filter(notDust), wallet: r.wallet.filter(notDust) });
const foundOf = (r) => r.totals.wallet + r.totals.positions + r.totals.possible + r.totals.bridgePending;
const isEmpty = (r) => {
  const depsGood = r.deposits.filter((d) => d.confidence !== 'low');
  return !r.wallet.length && !r.vaults.length && !r.lp.length && !r.nftPositions.length && !r.locks.length && !depsGood.length && !r.bridge.some((b) => b.status !== 'finalized') && !r.debts.length;
};

const isAgwKind = (k) => k === 'agw' || k === 'agw-linked' || k === 'agw-probable';
function blockTitle(r) {
  const c = CHAINS[r.chain];
  if (r.chain === 'abstract' && r.kind === 'agw-probable') return `${c.name} · ${t('agwProbableHead')}`;
  if (r.chain === 'abstract' && isAgwKind(r.kind)) return `${c.name} · ${t('agwHead')}`;
  if (r.chain === 'abstract' && r.kind === 'eoa' && r.hasAgw) return `${c.name} · ${t('signerHead')}`;
  return c.name;
}

function renderAll(results) {
  lastResults = results;
  const blocks = results.filter((r) => !r.error).map(trimDust);
  // the signer of an Abstract Global Wallet is shown only when it holds something itself
  const agwFound = blocks.some((r) => r.chain === 'abstract' && isAgwKind(r.kind));
  blocks.forEach((r) => { if (r.chain === 'abstract' && r.kind === 'eoa') r.hasAgw = agwFound; });
  const visible = blocks.filter((r) => !(r.hasAgw && isEmpty(r) && !(r.suggest || []).length && !(r.apps || []).length));
  const input = results[0]?.input || results[0]?.address;
  const total = visible.reduce((s, r) => s + foundOf(r), 0);
  const share = shareAmountAll(results);

  const out = [];
  out.push(`<section class="summary">
    <div class="addr-line"><span class="addr">${esc(input)}</span>
      <span class="ext">
        <a class="strong" href="https://debank.com/profile/${input}" target="_blank" rel="noopener noreferrer">${t('openDebank')} ↗</a>
        <a href="#" id="shareLink">${t('share')}</a>
        ${share >= SHARE_MIN_USD && !results.every(isExample) ? `<a class="strong" href="#" id="shareOpen">${t('shareBtn')} ↗</a>` : ''}
      </span></div>
    <div class="figures">
      <div class="fig big"><span class="k">${visible.length > 1 ? t('foundAll') : t('found')(CHAINS[visible[0]?.chain || 'blast'].name)}</span><span class="v">${usdPlain(total)}</span></div>
      ${visible.length > 1 ? visible.map((r) => `<div class="fig"><span class="k">${esc(blockTitle(r))}</span><span class="v">${usdPlain(foundOf(r))}</span></div>`).join('') : ''}
    </div>
  </section>`);

  for (const e of results.filter((r) => r.error)) {
    out.push(`<p class="error">${esc(CHAINS[e.chain].name)}: ${t('failed')}${esc(e.error.shortMessage || e.error.message)}<br>${t('retry')}</p>`);
  }
  visible.forEach((r, i) => out.push(renderBlock(r, i, visible.length > 1)));

  // DeBank (one panel for all chains)
  out.push(`<section class="group debank" id="debank">
    <div class="group-head"><h2>${t('debankT')}</h2></div>
    <p class="group-note">${t('debankNote')}</p>
    <div class="keyrow"><input id="dbkey" type="password" placeholder="${t('debankKey')}" autocomplete="off" value="${esc(getKey())}"><button class="btn ghost" id="dbbtn" type="button">${t('debankBtn')}</button></div>
    <div id="dbout"></div>
  </section>`);

  document.getElementById('results').innerHTML = out.join('');
  document.getElementById('shareLink')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const url = location.origin + location.pathname + '?a=' + input + (chainSel !== 'all' ? '&chain=' + chainSel : '');
    try { await navigator.clipboard.writeText(url); e.target.textContent = t('copied'); } catch { prompt?.('', url); }
  });
  document.getElementById('dbbtn')?.addEventListener('click', () => loadDebank(input));
  document.getElementById('shareOpen')?.addEventListener('click', (e) => { e.preventDefault(); openShare(results); });
}

function renderBlock(r, idx, multi) {
  CUR = CHAINS[r.chain];
  SCAN = CUR.scan;
  const out = [];
  const pendingBridge = r.bridge.filter((b) => b.status !== 'finalized');
  const doneBridge = r.bridge.filter((b) => b.status === 'finalized');
  const depsGood = r.deposits.filter((d) => d.confidence !== 'low');
  const depsLow = r.deposits.filter((d) => d.confidence === 'low');
  const positions = r.totals.positions + r.totals.possible;
  const likely = r.totals.likely || 0;
  const days = Math.ceil((new Date(CUR.deadline) - Date.now()) / 86400000);
  const quiet = isEmpty(r) && !r.nfts.length && !r.unknown.length && !(r.sales || []).length && !depsLow.length && !r.bridge.length && !(r.suggest || []).length && !(r.apps || []).length;
  if (quiet) {
    return `<section class="chain-block" id="chain-${idx}"><div class="chain-head"><h2>${esc(blockTitle(r))}</h2>
      <span class="chip ${days <= 7 ? 'crit' : 'warn'}">${t('closes')(dl(CUR), days)}</span></div>
      <p class="empty">${t('nothing')(CUR.name)} <a href="${scanAddr(r.address)}" target="_blank" rel="noopener noreferrer">${CUR.explorerName} ↗</a></p></section>`;
  }

  out.push(`<section class="chain-block" id="chain-${idx}">
    <div class="chain-head">
      <h2>${esc(blockTitle(r))}</h2>
      <span class="chip ${days <= 7 ? 'crit' : 'warn'}">${t('closes')(dl(CUR), days)}</span>
    </div>
    <div class="addr-line"><span class="addr small-addr">${esc(r.address)}</span>
      <span class="ext"><a href="${scanAddr(r.address)}" target="_blank" rel="noopener noreferrer">${CUR.explorerName} ↗</a></span></div>
    ${isAgwKind(r.kind) && r.signer ? `<p class="group-note">${t(r.kind === 'agw-probable' ? 'agwNoteProbable' : r.kind === 'agw-linked' ? 'agwNoteLinked' : 'agwNote')(short(r.signer))}</p>` : ''}
    ${(r.suggest || []).length ? `<p class="group-note">${t('agwSuggest')} ${r.suggest.map((s) => `<a href="?a=${s.address}&chain=abstract">${short(s.address)}</a>`).join(', ')}</p>` : ''}
    <div class="figures">
      ${multi ? '' : ''}
      <div class="fig"><span class="k">${t('positions')}</span><span class="v">${usdPlain(positions)}</span></div>
      <div class="fig"><span class="k">${t('wallet')}</span><span class="v">${usdPlain(r.totals.wallet)}</span></div>
      ${likely > 0 ? `<div class="fig"><span class="k">${t('possible')}</span><span class="v">~${usdPlain(likely)}</span></div>` : ''}
      ${r.totals.debt > 0 ? `<div class="fig"><span class="k">${t('debt')}</span><span class="v neg">−${usdPlain(r.totals.debt)}</span></div>` : ''}
      ${pendingBridge.length ? `<div class="fig"><span class="k">${t('bridge')}</span><span class="v alert">${usdPlain(r.totals.bridgePending)}</span></div>` : ''}
    </div>
  </section>`);

  // 1. bridge
  const bridgeLinks = (b) => r.chain === 'abstract'
    ? [`<a class="act" href="${CUR.bridgeUrl}" target="_blank" rel="noopener noreferrer">${t('finishBridge')} ↗</a>`, `<a href="${SCAN}/tx/${b.txHash}" target="_blank" rel="noopener noreferrer">${t('tx')}</a>`]
    : [`<a class="act" href="${CUR.bridgeUrl}" target="_blank" rel="noopener noreferrer">${t('finishBridge')} ↗</a>`, `<a href="${SCAN}/tx/${b.txHash}" target="_blank" rel="noopener noreferrer">${t('tx')}</a>`,
      `<a href="https://etherscan.io/address/0x0Ec68c5B10F21EFFb74f2A5C61DFe6b08C0Db6Cb#writeProxyContract" target="_blank" rel="noopener noreferrer">${t('portal')}</a>`];
  out.push(group({
    id: `bridge-${idx}`, urgent: true, title: t('gBridge'), note: r.chain === 'abstract' ? t('gBridgeNoteAbs') : t('gBridgeNote'), total: r.totals.bridgePending,
    rows: pendingBridge.map((b) => rowHtml({
      title: `${amt(b.amount)} ${esc(b.symbol || 'ETH')}`,
      chips: [`<span class="chip ${b.status === 'proven' || b.status === 'waiting' ? 'warn' : 'crit'}">${esc(t('st')[b.status] || b.status)}</span>`],
      sub: `${t('initiated')} ${b.date}${b.provenAt ? ` · ${t('provenAt')} ${b.provenAt}` : ''} · <span class="mono">${short(b.txHash)}</span>`,
      value: usd(b.usd), links: bridgeLinks(b),
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
    if (v.type === 'Prediction') {
      chips.push(`<span class="chip ${v.status === 'open' ? 'warn' : 'crit'}">${t('pst')[v.status] || v.status}</span>`);
      lendRows.push(rowHtml({ title: `${t('prediction')} · ${esc(v.underlyingSymbol || '?')}`, chips, sub: t('markets')(v.markets), value: usd(v.usd), amount: `${amt(v.amount)} ${esc(v.underlyingSymbol || '')}`, links }));
      continue;
    }
    lendRows.push(rowHtml({ title: `${v.type === 'Vault' ? t('vault') : t('supplied')} · ${esc(v.underlyingSymbol || '?')}`, chips, sub: `${esc(v.name || '')}${v.receipt ? ` · ${esc(v.receipt)}` : ''}`, value: usd(v.usd), amount: `${amt(v.amount)} ${esc(v.underlyingSymbol || '')}`, links }));
  }
  for (const d of r.debts) {
    const { chips, links } = protoBits(d, d.token);
    lendRows.push(rowHtml({ title: `${t('borrowed')} · ${esc(d.underlyingSymbol || '?')}`, chips, sub: esc(d.name || d.receipt || ''), value: d.usd != null ? `<span style="color:var(--crit)">−${usdPlain(d.usd)}</span>` : usd(null), amount: `${amt(d.amount)} ${esc(d.underlyingSymbol || '')}`, links }));
  }
  out.push(group({ id: `lending-${idx}`, title: t('gLend'), note: t('gLendNote'), total: sum(r.vaults) - sum(r.debts), rows: lendRows }));

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
    links.push(`<a href="${nftUrl(x.contract, x.tokenId)}" target="_blank" rel="noopener noreferrer">NFT #${esc(x.tokenId)}</a>`);
    if (x.heldBy !== 'wallet') links.push(`<a href="${scanAddr(x.heldBy, '#writeContract')}" target="_blank" rel="noopener noreferrer">${t('viaContract')} ↗</a>`);
    const parts = x.parts || [];
    lpRows.push(rowHtml({ title: `${t('lpv3')} · ${parts.map((p) => esc(p.symbol)).join(' / ')}`, chips, sub: (parts.map((p) => `${amt(p.amount)} ${esc(p.symbol)}`).join(' + ')) + (x.note ? ` · ${esc(x.note)}` : ''), value: usd(x.usd), links }));
  }
  out.push(group({ id: `lp-${idx}`, title: t('gLp'), note: t('gLpNote'), total: sum(r.lp) + sum(r.nftPositions), rows: lpRows }));

  // 4. staked / locked / deposited
  const stRows = [];
  for (const l of r.locks) {
    const { chips, links } = protoBits(l, l.contract);
    chips.push(l.stream ? `<span class="chip ok">${t('streamNow')}</span>` : `<span class="chip ${l.unlocked ? 'ok' : 'warn'}">${l.unlock === 'permanent' ? t('permanent') : `${l.unlocked ? t('unlocked') : t('unlocks')} ${l.unlock}`}</span>`);
    links.push(`<a href="${nftUrl(l.contract, l.tokenId)}" target="_blank" rel="noopener noreferrer">NFT #${esc(l.tokenId)}</a>`);
    stRows.push(rowHtml({ title: `${l.stream ? t('stream') : t('lock')} · ${esc(l.symbol || '?')}`, chips, sub: esc(l.collection || ''), value: usd(l.usd), amount: `${amt(l.amount)} ${esc(l.symbol || '')}`, links }));
  }
  for (const d of depsGood) stRows.push(depositRow(d));
  out.push(group({ id: `staked-${idx}`, title: t('gStake'), note: t('gStakeNote'), total: sum(r.locks) + sum(depsGood), rows: stRows }));

  // 4b. potential token sales (not counted as found money)
  const sales = r.sales || [];
  const salesOpen = sales.filter((s) => s.status === 'unclaimed');
  const salesDone = sales.filter((s) => s.status !== 'unclaimed');
  if (salesOpen.length) out.push(group({ id: `sales-${idx}`, title: t('gSales'), note: t('gSalesNote'), rows: salesOpen.map(saleRow) }));
  if (salesDone.length) out.push(`<section class="group">${collapsible(t('gSales'), String(salesDone.length), `<div class="rows">${salesDone.map(saleRow).join('')}</div>`, t('gSalesNote'))}</section>`);

  // 5. wallet
  out.push(group({
    id: `wallet-${idx}`, title: t('gWallet'), note: r.chain === 'abstract' ? t('gWalletNoteAbs') : t('gWalletNote'), total: r.totals.wallet,
    rows: r.wallet.map((w) => rowHtml({
      title: esc(w.symbol), chips: w.token === ETH ? [] : protoBits(w, null, { fallbackChip: false }).chips, sub: w.token === ETH ? 'Native ETH' : `${esc(w.name)} · <span class="mono">${short(w.token)}</span>`,
      value: usd(w.usd), amount: `${amt(w.amount)} ${esc(w.symbol)}`,
      links: w.token === ETH ? [] : [`<a href="${SCAN}/token/${w.token}?a=${r.address}" target="_blank" rel="noopener noreferrer">${t('explorer')}</a>`],
    })),
  }));

  // 5b. apps with their own balances: we cannot read them, only point there
  out.push(group({
    id: `apps-${idx}`, title: t('gApps'), note: t('gAppsNote'),
    rows: (r.apps || []).map((a) => {
      const { chips, links } = protoBits({ protocolKey: a.key, protocol: a.protocol }, null);
      return rowHtml({ title: `<span class="proj">${esc(a.protocol)}</span>`, chips: chips.slice(1), sub: t('appNote')[a.key] || '', value: '', links });
    }),
  }));

  // 6. collapsed extras
  const extras = [];
  if (depsLow.length) extras.push(collapsible(t('gGone'), `${depsLow.length} · ${usdPlain(sum(depsLow))}`, `<div class="rows">${depsLow.map(depositRow).join('')}</div>`, t('gGoneNote')));
  if (r.unknown.length) extras.push(collapsible(t('gUnknown'), String(r.unknown.length), `<div class="rows">${r.unknown.map((w) => rowHtml({ title: esc(w.symbol), chips: protoBits(w).chips, sub: `${esc(w.name)} · <span class="mono">${short(w.token)}</span>`, value: usd(null), amount: amt(w.amount), links: [`<a href="${SCAN}/token/${w.token}?a=${r.address}" target="_blank" rel="noopener noreferrer">${t('explorer')}</a>`] })).join('')}</div>`, r.chain === 'abstract' ? t('gUnknownNoteAbs') : ''));
  if (r.nfts.length) extras.push(collapsible(t('gNft'), String(r.nfts.length), `<div class="rows nftgrid">${r.nfts.map((n) => rowHtml({ title: esc(n.collection || short(n.contract)), chips: n.heldBy !== 'wallet' ? [`<span class="chip warn">${t('inFarm')} ${esc(n.heldByLabel || short(n.heldBy))}</span>`] : [], sub: `#${esc(n.tokenId)}${n.erc1155 ? ` · ERC-1155 × ${esc(n.count)}` : ''}`, value: '', links: [`<a href="${nftUrl(n.contract, n.tokenId)}" target="_blank" rel="noopener noreferrer">${t('explorer')}</a>`] })).join('')}</div>`, r.chain === 'abstract' ? t('gNftNoteAbs') : ''));
  if (r.spam.length) extras.push(collapsible(t('gSpam'), String(r.spam.length), `<p class="group-note" style="color:var(--crit)">${t('gSpamNote')}</p><div class="rows">${r.spam.slice(0, 200).map((s) => `<div class="row"><div class="row-main"><div class="row-sub mono">${esc(short(s.token))} · ${esc((s.name || '').replace(/https?:\/\/\S+/g, '[link removed]').slice(0, 60))}</div></div></div>`).join('')}</div>`));
  if (extras.length) out.push(`<section class="group">${extras.join('')}</section>`);

  if (isEmpty(r)) out.push(`<p class="empty">${t('nothing')(CUR.name)}</p>`);
  if (doneBridge.length) out.push(`<p class="group-note">✓ ${t('bridgeDone')(doneBridge.length)}</p>`);
  for (const n of r.notes || []) out.push(`<p class="group-note">${esc(trLog(n))}</p>`);
  return out.join('');
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
    const r = await fetch(`https://pro-openapi.debank.com/v1/user/all_complex_protocol_list?id=${address}`, { headers: { AccessKey: key, accept: 'application/json' } });
    const j = await r.json();
    if (!r.ok) throw new Error(j.message || r.status);
    const ours = j.filter((p) => /blast|abs/i.test(p.chain || ''));
    if (!ours.length) { box.innerHTML = `<p class="group-note">${t('debankNone')}</p>`; return; }
    box.innerHTML = '<div class="rows">' + ours.map((p) => {
      const net = p.portfolio_item_list.reduce((s, i) => s + (i.stats?.net_usd_value || 0), 0);
      const items = p.portfolio_item_list.map((i) => {
        const toks = [...(i.detail?.supply_token_list || []), ...(i.detail?.token_list || [])].map((x) => `${amt(x.amount)} ${esc(x.symbol)}`).join(' + ');
        const debt = (i.detail?.borrow_token_list || []).map((x) => `−${amt(x.amount)} ${esc(x.symbol)}`).join(', ');
        return `${esc(i.name)}: ${toks}${debt ? ` · ${debt}` : ''}`;
      }).join('<br>');
      const links = p.site_url ? [`<a class="act" href="${esc(p.site_url)}" target="_blank" rel="noopener noreferrer">${esc(p.site_url.replace(/^https?:\/\//, ''))} ↗</a>`] : [];
      return rowHtml({ title: esc(p.name), chips: [`<span class="chip">${esc(p.chain)}</span>`], sub: items, value: usd(net), links });
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
const EXAMPLES = Object.values(CHAINS).map((c) => c.example).filter(Boolean).map((a) => a.toLowerCase());
const isExample = (r) => EXAMPLES.includes((r.input || r.address || '').toLowerCase());
const shareable = (results) => results.filter((r) => !r.error && !isExample(r));
function shareAmountAll(results) {
  return shareable(results).reduce((s, r) => s + shareAmount(r), 0);
}
const fmtShare = (v) => '$' + v.toLocaleString('en-US', { maximumFractionDigits: v >= 100 ? 0 : 2, minimumFractionDigits: v >= 100 ? 0 : 2 });
function shareChains(results) {
  return [...new Set(shareable(results).filter((r) => shareAmount(r) >= 1).map((r) => r.chain))];
}
function sharePostText(v, chains) {
  if (chains.length > 1) return `just found ${fmtShare(v)} I forgot on Blast and Abstract before they shut down 😳\n\ncheck yours, just paste your address:\n${SITE}\n\nh/t @NotYur`;
  const c = CHAINS[chains[0] || 'blast'];
  return `just found ${fmtShare(v)} I forgot on ${c.name} before it shuts down 😳\n\ncheck yours before ${c.deadlineLabel}, just paste your address:\n${SITE}\n\nh/t @NotYur`;
}
const shareDlg = document.getElementById('shareDlg');
const shownFor = new Set();
function openShare(results) {
  const v = shareAmountAll(results);
  const chains = shareChains(results);
  const text = sharePostText(v, chains);
  document.getElementById('share-h').textContent = t('shareTitle')(fmtShare(v), chains.map((k) => CHAINS[k].name).join(' + ') || 'Blast');
  document.getElementById('sharePreview').textContent = text;
  const debt = shareable(results).reduce((s, r) => s + (r.totals?.debt || 0), 0);
  document.getElementById('shareDebt').textContent = debt >= 0.01 ? t('shareDebt')(fmtShare(debt)) : '';
  document.getElementById('shareDebt').hidden = debt < 0.01;
  document.getElementById('shareX').href = 'https://x.com/intent/post?text=' + encodeURIComponent(text);
  document.getElementById('shareCopy').textContent = t('shareCopy');
  if (typeof shareDlg.showModal === 'function') shareDlg.showModal(); else shareDlg.setAttribute('open', '');
}
function maybeShare(results) {
  const key = (results[0]?.input || '') + '|' + chainSel;
  if (results.every(isExample) || shownFor.has(key) || shareAmountAll(results) < SHARE_MIN_USD) return;
  shownFor.add(key);
  setTimeout(() => { if (!document.getElementById('donateDlg').open) openShare(results); }, 1800);
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

// Which chains to scan: all (default), blast or abstract. URL ?chain= wins, then an Abstract-only hostname, then the last choice.
let chainSel = 'all';
try { chainSel = localStorage.getItem('bl-chain') || 'all'; } catch { /* optional */ }
if (/abstract/i.test(location.hostname)) chainSel = 'abstract';
const qChain = new URLSearchParams(location.search).get('chain');
if (qChain && (qChain === 'all' || CHAINS[qChain])) chainSel = qChain;
function applyChainSel() {
  document.querySelectorAll('[data-chain-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.chainSet === chainSel)));
}
document.querySelectorAll('[data-chain-set]').forEach((b) => b.addEventListener('click', () => {
  chainSel = b.dataset.chainSet;
  try { localStorage.setItem('bl-chain', chainSel); } catch { /* optional */ }
  applyChainSel();
  if (input.value.trim()) run(input.value);
}));
applyChainSel();

async function run(address) {
  address = address.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) { status.innerHTML = `<p class="error">${t('invalid')}</p>`; return; }
  history.replaceState(null, '', '?a=' + address + (chainSel !== 'all' ? '&chain=' + chainSel : ''));
  btn.disabled = true;
  document.getElementById('results').innerHTML = '';
  status.innerHTML = '<div class="progress"><span class="spinner"></span><span id="plog"></span></div>';
  const plog = document.getElementById('plog');
  const lines = {};
  const show = () => { plog.innerHTML = Object.entries(lines).map(([k, m]) => `${esc(k)}: ${esc(trLog(m))}`).join('<br>'); };
  try {
    const jobs = [];
    if (chainSel !== 'abstract') jobs.push({ chain: 'blast', address, kind: 'eoa' });
    if (chainSel !== 'blast') {
      lines.Abstract = t('agwLookup'); show();
      const ws = await abstractWallets(address).catch(() => [{ address, kind: 'eoa' }]);
      const suggest = ws.filter((w) => w.scan === false);
      ws.filter((w) => w.scan !== false).forEach((w) => jobs.push({ chain: 'abstract', address: w.address, kind: w.kind, signer: w.signer, suggest: w.kind === 'eoa' ? suggest : undefined }));
      delete lines.Abstract;
    }
    const results = await Promise.all(jobs.map((j) => {
      const tag = j.chain === 'abstract' && jobs.filter((x) => x.chain === 'abstract').length > 1 ? `Abstract (${j.kind === 'eoa' ? 'signer' : 'AGW'})` : CHAINS[j.chain].name;
      return scan(j.address, (m) => { lines[tag] = m; show(); }, { chain: j.chain })
        .then((r) => ({ ...r, kind: j.kind, signer: j.signer, suggest: j.suggest, input: address }))
        .catch((e) => { console.error(e); return { error: e, chain: j.chain, address: j.address, kind: j.kind, input: address }; });
    }));
    status.innerHTML = '';
    renderAll(results);
    onScanDone();
    maybeShare(results);
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
