// Blast protocol registry. URLs come from DefiLlama's protocol list (Oct 2026);
// `dead: true` means DefiLlama marks the website as dead, so withdrawals go through the contract directly.
// Never add URLs from memory: Blast is full of phishing clones.
export const PROTOCOLS = {
  pac: { name: 'Pac Finance', slug: 'pac-finance', url: null, dead: true, x: 'pac_finance', kw: ['pac finance', 'pac '] },
  orbit: { name: 'Orbit Protocol', slug: 'orbit-protocol', url: null, dead: true, x: 'OrbitLending', kw: ['orbit'] },
  // DefiLlama marks the Abstract deployment as insolvent: withdrawals there may fail
  zerolend: { name: 'ZeroLend', slug: 'zerolend-lending', url: 'https://zerolend.xyz/', x: 'zerolendxyz', kw: ['zerolend', 'z0'], insolvent: ['abstract'] },
  init: { name: 'INIT Capital', slug: 'init-capital', url: 'https://app.init.capital', x: 'InitCapital_', kw: ['init capital', 'init '] },
  juice: { name: 'Juice Finance', slug: 'juice-finance', url: 'https://juice.finance', x: 'Juice_Finance', kw: ['juice'] },
  thruster: { name: 'Thruster', slug: 'thruster-v3', url: null, dead: true, x: 'ThrusterFi', kw: ['thruster', 't-lp'] },
  ring: { name: 'Ring', slug: 'ring-few', url: 'https://ring.exchange/#/earn', x: 'ProtocolRing', kw: [' ring ', ' few ', 'ring governance', 'ring lp'] },
  particle: { name: 'Particle', slug: 'particle-lamm', url: null, dead: true, x: 'particle_trade', kw: ['particle', 'duo '] },
  hyperlock: { name: 'Hyperlock', slug: 'hyperlock-finance', url: null, dead: true, x: 'hyperlockfi', kw: ['hyperlock', 'hyper ', 'stakeidentifiers'] },
  wasabi: { name: 'Wasabi', slug: 'wasabi-perps', url: 'https://app.wasabi.xyz', x: 'wasabi_protocol', kw: ['wasabi'] },
  kalax: { name: 'Kalax', slug: 'kalax', url: null, dead: true, x: 'Kalax_io', kw: ['kalax'] },
  cybro: { name: 'Cybro', slug: 'cybro', url: null, dead: true, x: 'Cybro_io', kw: ['cybro'] },
  blasterswap: { name: 'Blasterswap', slug: 'blasterswap-v3', url: 'https://blasterswap.com', x: 'BlasterSwap', kw: ['blaster'] },
  monoswap: { name: 'MonoSwap', slug: 'monoswap-v3', url: null, dead: true, x: 'monoswapio', kw: ['monoswap'] },
  bladeswap: { name: 'BladeSwap', slug: 'bladeswap-amm', url: 'https://bladeswap.xyz', x: 'Bladeswapxyz', kw: ['blade'] },
  fenix: { name: 'Fenix Finance', slug: 'fenix-concentrated-liquidity', url: 'https://www.fenixfinance.io', x: 'FenixFinance', kw: ['fenix', 'fnx'] },
  synfutures: { name: 'SynFutures', slug: 'synfutures-v3', url: 'https://trade.synfutures.com/#/trade', x: 'SynFuturesDefi', kw: ['synfutures'] },
  ambient: { name: 'Ambient', slug: 'ambient', url: 'https://ambient.finance/', x: 'ambient_finance', kw: ['ambient'] },
  blur: { name: 'Blur', slug: 'blur-bids', url: 'https://blur.io/', x: 'blur_io', kw: ['blur'] },
  splice: { name: 'Splice Finance', slug: 'splice-finance', url: null, dead: true, x: 'splice_fi', kw: ['splice'] },
  agentfi: { name: 'AgentFi', slug: 'agentfi', url: 'https://agentfi.io/', x: 'Agent_Fi', kw: ['agentfi'] },
  seismic: { name: 'Seismic', slug: 'seismic', url: null, dead: true, x: 'seismicfinance', kw: ['seismic'] },
  aso: { name: 'Aso Finance', slug: 'aso-finance', url: 'https://aso.finance', x: 'Aso_Finance', kw: ['aso '] },
  wand: { name: 'Wand Protocol', slug: 'wand-protocol', url: 'https://app.wandfi.io/', x: 'WandProtocol', kw: ['wand'] },
  dyorswap: { name: 'DyorSwap', slug: 'dyorswap-amm', url: 'https://dyorswap.finance/', x: 'DYORSWAPDEX', kw: ['dyor'] },
  blastoff: { name: 'Blastoff', slug: 'blastoff', url: null, dead: true, x: 'blastozone', kw: ['blastoff'] },
  blastup: { name: 'BlastUp', slug: 'blastup', url: null, dead: true, x: 'Blastup_io', kw: ['blastup'] },
  renzo: { name: 'Renzo', slug: 'renzo', url: 'https://app.renzoprotocol.com/restake', x: 'RenzoProtocol', kw: ['renzo', 'ezeth'] },
  mangrove: { name: 'Mangrove', slug: 'mangrove', url: 'https://www.mangrove.exchange', x: 'MangroveDAO', kw: ['mangrove'] },
  overnight: { name: 'Overnight', slug: 'overnight-finance', url: 'https://overnight.fi', x: 'overnight_fi', kw: ['overnight', 'usd+', 'usdc+'] },
  uniswap: { name: 'Uniswap', slug: 'uniswap-v3', url: 'https://app.uniswap.org/', x: 'Uniswap', kw: ['uniswap'] },
  sushi: { name: 'SushiSwap', slug: 'sushiswap-v3', url: 'https://sushi.com/', x: 'SushiSwap', kw: ['sushi'] },
  abracadabra: { name: 'Abracadabra', slug: 'abracadabra-spell', url: 'https://abracadabra.money/', x: 'MIM_Spell', kw: ['abracadabra', 'cauldron', 'magic internet'] },
  yel: { name: 'Yel Finance', slug: 'yel-finance', url: null, dead: true, x: 'yel_finance', kw: ['yel '] },
  anzen: { name: 'Anzen', slug: 'anzen-v2', url: 'https://anzen.finance', x: 'AnzenFinance', kw: ['anzen', 'usdz'] },
  blume: { name: 'Blume', slug: 'blume', url: 'https://blume.fm', x: 'blumefm', kw: ['blume'] },
  zerox: { name: '0xLend', slug: '0xlend', url: null, dead: true, x: '0xLendProtocol', kw: ['0xlend'] },
  munchables: { name: 'Munchables', slug: 'munchables-v2', url: null, x: null, kw: ['munchable'] },
  blast: { name: 'Blast', slug: null, url: 'https://blast.io', x: 'blast', kw: ['nr wrapper', 'nreth', 'nrusdb'] },
  sablier: { name: 'Sablier', slug: 'sablier-lockup', url: 'https://sablier.com/', x: 'Sablier', kw: ['sablier'] },
  parallel: { name: 'Parallel (Aave fork)', slug: null, url: null, x: null, kw: ['parallel'] },
  // ---- Abstract ----
  abstract: { name: 'Abstract', slug: null, url: 'https://migrate.abs.xyz', x: 'AbstractChain', kw: ['abstract ·', 'abstract global wallet'] },
  sakura: { name: 'SakuraSwap', slug: 'sakuraswap-clmm', url: 'https://sakuraswap.com/', x: 'protofire', kw: ['sakura', 'reservoir'] },
  aborean: { name: 'Aborean', slug: 'aborean-cl', url: 'https://aborean.finance', x: 'AboreanFi', kw: ['aborean'] },
  kona: { name: 'Kona', slug: 'kona-lend', url: 'https://kona.surf/', x: 'KonaDeFi', kw: ['kona', 'kittypunch'] },
  noxa: { name: 'NOXA', slug: 'noxa-dex-v2', url: 'https://fun.noxa.eth.limo/', x: 'Noxa_Fi', kw: ['noxa'] },
  myriad: { name: 'Myriad Markets', slug: 'myriad-markets', url: 'https://myriad.markets/markets', x: 'MyriadMarkets', kw: ['myriad'] },
  deathfun: { name: 'death.fun', slug: 'death.fun', url: 'https://death.fun', x: 'deathfungame', kw: ['death.fun', 'deathfun'] },
  witty: { name: 'Witty', slug: 'witty', url: 'https://www.witty.game/', x: 'play_witty', kw: ['witty'] },
  amigo: { name: 'Amigo', slug: 'amigo', url: 'https://amigo.cool/', x: 'TryAmigoApp', kw: ['amigo'] },
  zoofun: { name: 'ZOO.FUN', slug: 'zoo.fun', url: null, dead: true, x: 'zoodotfun', kw: ['zoo.fun', 'zoofun'] },
  mondrian: { name: 'Mondrian Swap', slug: 'mondrian-swap', url: null, dead: true, x: 'MondrianSwap', kw: ['mondrian'] },
  morpho: { name: 'Morpho', slug: 'morpho-blue', url: 'https://app.morpho.org', x: 'Morpho', kw: ['morpho'] },
  logx: { name: 'LogX', slug: 'logx-v2', url: 'https://logx.network/', x: 'LogX_trade', kw: ['logx'] },
};

// Texts are tried in priority order (explicit protocol label first, token name last),
// so "Wasabi JUICE Vault" resolves to Wasabi rather than Juice.
export function resolveProtocol(...texts) {
  for (const t of texts) {
    if (!t) continue;
    const s = ' ' + String(t).toLowerCase() + ' ';
    for (const [key, p] of Object.entries(PROTOCOLS)) if (p.kw.some((k) => s.includes(k))) return { key, ...p };
  }
  return null;
}
