// Known Blast contracts -> human label. Lowercase keys.
// Sources: Blast docs, DefiLlama adapters. Used only for display.
export const LABELS = {
  // Blast core
  '0x4300000000000000000000000000000000000003': 'USDB',
  '0x4300000000000000000000000000000000000004': 'WETH',
  '0x4300000000000000000000000000000000000005': 'Blast Bridge (L2)',
  '0x4200000000000000000000000000000000000010': 'Standard Bridge (L2)',
  '0x4200000000000000000000000000000000000016': 'L2→L1 Message Passer',
  '0x4200000000000000000000000000000000000007': 'Cross-Domain Messenger',
  '0x4200000000000000000000000000000000000014': 'ERC721 Bridge (L2)',
  '0xb1a5700fa2358173fe465e6ea4ff52e36e88e2ad': 'BLAST token',

  '0xb772d5c5f4a2eef67dfbc89aa658d2711341b8e5': 'Blur · Blur Pool (ETH 1:1)',
  '0x9d020b1697035d9d54f115194c9e04a1e4eb9af7': 'Blast · NrETH',
  '0x96f6b70f8786646e0ff55813621ef4c03823139c': 'Blast · NrUSDB',
  '0xa3bd3be19012de72190c885fb270beb93e36a8a7': 'Ambient · Query',

  // Juice Finance
  '0x4a1d9220e11a47d8ab22ccd82da616740cf0920a': 'Juice Finance · USDB lending pool',
  '0x44f33bc796f7d3df55040cd3c631628b560715c2': 'Juice Finance · WETH lending pool',
  '0x6301795aa55b90427cf74c18c8636e0443f2100b': 'Juice Finance · Collateral manager',
  '0x105e285f1a2370d325046fed1424d4e73f6fa2b0': 'Juice Finance · Collateral manager v2',
  '0x23eba06981b5c2a6f1a985bdce41bd64d18e6dfa': 'Juice Finance · WETH collateral manager',
  '0xc81a630806d1af3fd7509187e1afc501fd46e818': 'Juice Finance · ezETH collateral manager',
  '0x788654040d7e9a8bb583d7d8ccea1ebf1ae4ac06': 'Juice Finance · USDB vault',
  '0x60ed5493b35f833189406dfec0b631a6b5b57f66': 'Juice Finance · WETH vault',
  '0xace661bf726bd8afe6f6594c559a5136489e64f9': 'Juice Finance · USDB vault',
  '0x4dee8034019f03f1a025dbfb4bbc159d7baa7a0a': 'Juice Finance · WETH vault',
  '0xc3ecadb7a5fab07c72af6bcfbd588b7818c4a40e': 'Juice Finance · LP staking',

  // Hyperlock
  '0xec73284e4ec9bcea1a7dddf489eaa324c3f7dd31': 'Hyperlock · HYPER',
  '0x569fcbda292f1a69ab14e401bad13cc0e1dec790': 'Hyperlock · hyperTHRUST',
  '0x08d46dc9e455c9b97e671b6291a54ba5668b94ac': 'Hyperlock · Booster',
  '0x70a8075c73a9ff9616cb5af6bb09c04844718f27': 'Hyperlock · Voter proxy',
  '0xc1de2d060a18cffab121e90118e380629d11977e': 'Hyperlock · Locker',

  // Thruster
  '0xe36072dd051ce26261bf50cd966311cab62c596e': 'Thruster · THRUST',
  '0x434575eaea081b735c985fa9bf63cd7b87e227f9': 'Thruster V3 · LP positions (NFT)',
  '0xb4a7d971d0adea1c73198c97d7ab3f9ce4aafa13': 'Thruster V2 · Factory',
  '0x37836821a2c03c171fb1a595767f4a16e2b93fc4': 'Thruster V2 · Factory',

  // Blasterswap
  '0xa761d82f952e9998fe40a6db84bd234f39122bad': 'Blasterswap V3 · LP positions (NFT)',
  '0x1e60c4113c86231ef4b5b0b1cbf689f1b30e7966': 'Blasterswap V3 · LP positions (NFT)',

  // SynFutures
  '0x6a372dbc1968f4a07cf2ce352f410962a972c257': 'SynFutures V3 · Gate (margin)',

  // Ambient
  '0xaaaaaaaaffe404ee9433eef0094b6382d81fb958': 'Ambient · Dex',

  // BladeSwap
  '0x10f6b147d51f7578f760065df7f174c3bc95382c': 'BladeSwap · Vault',

  // Particle
  '0xc932317385fdc794633f612874bd687ea987b151': 'Particle DUO · WETH 90d',
  '0x57a6ccb2d5663ef874c29b161dd7907c7673feb0': 'Particle DUO · USDB 90d',
  '0x08b939da28c97afa6664ec49ad5be51805ebbb36': 'Particle DUO · WETH 90d v2',
  '0xa625b1e6686e8ceadd88afac8e44365005c3dbc4': 'Particle DUO · DUSD 90d v2',
  '0x1da40c742f32bbee81694051c0ee07485fc630f6': 'Particle DUO · duoETH',
  '0x1a3d9b2fa5c6522c8c071dc07125ce55df90b253': 'Particle DUO · duoUSD',
  '0xeea70d690c6c9c5534fcb90b6b0ae71199c7d4d3': 'Particle · Vault',

  // Kalax
  '0x2f67f59b3629bf24962290db9ede0cd4127e606d': 'Kalax · KALA',
  '0xe63153c3360aca0f4e7ca7a1fc61c2215faef5a1': 'Kalax · Farm',
  '0xfe899401a1d86cc1113020fb40878c76239142a5': 'Kalax · Farm',
  '0x1cb8f6cecf7c8fbb9863417f8371cb2a076c9115': 'Kalax · Farm',

  // Wasabi
  '0x046299143a880c4d01a318bc6c9f2c0a5c1ed355': 'Wasabi · Long pool',
  '0x0301079dabdc9a2c70b856b2c51aca02bac10c3a': 'Wasabi · Short pool',
  '0xbdae5df498a45c5f058e3a09afe9ba4da7b248aa': 'Wasabi · Long pool',
  '0xa456c77d358c9c89f4dfb294fa2a47470b7da37c': 'Wasabi · Short pool',
  '0x0da575d3edd4e3ee1d904936f94ec043c06bb12b': 'Wasabi · Long pool',
  '0x3ee6c6cdaa0073de6da00091329de4390b0df1ee': 'Wasabi · Short pool',

  // Wand
  '0xdc3985196d263e5259ab946a4b52cedcbadc1390': 'Wand · ETH vault',
  '0xfd7d3d51b081fbea178891839a9fed5ca7896bda': 'Wand · ETH pty pool (buy low)',
  '0x2f5007df87c043552f3c6b6e5487b2bdc92f0232': 'Wand · ETH pty pool (sell high)',
  '0x05c061126a82dc1aff891b9184c1bc42d380a2ff': 'Wand · USDB vault',
  '0x7063ea2dba364acd9135752da5395ac7cd12313d': 'Wand · ETH V2 vault',
  '0x3ee083573fcea8c015dcbfc7a51777b5770cbe64': 'Wand · ETH V2 pty pool (buy low)',
  '0x39db7083c97d2c298c1a88fd27b0bd1c9c9f6fa8': 'Wand · ETH V2 pty pool (sell high)',
  '0x565e325b7197d6105b0ee74563ea211cc838e2c3': 'Wand · USDB V2 vault',
  '0x4a084b06efdb44e9fb26eac29334e4808ba65a32': 'Wand · weETH vault',

  // Cybro
  '0xd01d2b926edb4e9df43abc2f97b0655845ada688': 'Cybro · Staking',
  '0x13a2a10c5f800199d2a1b2db4972effdee3eeaa5': 'Cybro · Staking',
  '0x03b7becb964ab0ebad805683d14f338504152707': 'Cybro · Staking',
  '0x951c846aa10cc3da45defed784c3802605f71769': 'Cybro · Staking',
  '0x6f0acbaac51f3c72ddaa4edc6e20fc388d20adbc': 'Cybro · Staking',

  // Others
  '0x26fd9643baf1f8a44b752b28f0d90aebd04ab3f8': 'Mangrove',
  '0x455b20131d59f01d082df1225154fda813e8cee9': 'Ring · Few factory',
  '0x9be8a40c9cf00fe33fd84eaedaa5c4fe3f04cbc3': 'Ring · Router',
  '0x12c69bfa3fb3cba75a1defa6e976b87e233fc7df': 'Thruster · Router',
  '0x3b5d3f610cc3505f4701e9fb7d0f0c93b7713add': 'Blasterswap · Router',
  '0x79e8cad80e2aa49a246b789584c45aab1cfe402e': 'Abracadabra · Cauldron',
  '0xc8f5eb8a632f9600d1c7bc91e97dad5f8b1e3748': 'Abracadabra · MIM',
  '0x52056ed29fe015f4ba2e3b079d10c0b87f46e8c6': 'Anzen · USDz',
  '0x2416092f143378750bb29b79ed961ab195cceea5': 'Renzo · ezETH',
  '0x04c0599ae5a44757c0af6f9ec3b93da8976c150a': 'ether.fi · weETH',
  '0x93dd104528b35e82c061bb0d521096dcf11628fa': 'Overnight · USD+',
  '0x1d48dd3094ebb4b9a2c5ab96df4ef05bff562f26': 'Overnight · USDC+',
  '0xe7d96684a56e60ffbaae0fc0683879da48dab383': 'HMX · Pool',
  '0x97e94bda44a2df784ab6535aae2d62efc6d2e303': 'HMX · Vault storage',
};

// Bridge contracts on L2: tx to any of these may start an L2->L1 withdrawal.
export const BRIDGES = new Set([
  '0x4300000000000000000000000000000000000005',
  '0x4200000000000000000000000000000000000010',
  '0x4200000000000000000000000000000000000016',
  '0x4200000000000000000000000000000000000007',
  '0x4200000000000000000000000000000000000014',
]);

// Abstract (chain 2741). Sources: zks_getBridgeContracts, Abstract Global Wallet SDK, DefiLlama registries.
export const LABELS_ABSTRACT = {
  '0x000000000000000000000000000000000000800a': 'Abstract · ETH (system contract)',
  '0x0000000000000000000000000000000000010003': 'Abstract · Native bridge',
  '0x954ba8223a6bfec1cc3867139243a02ba0bc66e4': 'Abstract · Native bridge (legacy)',
  '0x9b947df68d35281c972511b3e7bc875926f26c1a': 'Abstract Global Wallet · factory',
  '0xd5e3efda6bb5ab545cc2358796e96d9033496dda': 'Abstract Global Wallet · registry',
  '0x3439153eb7af838ad19d56e1571fbd09333c2809': 'WETH',
  '0x84a71ccd554cc1b02749b35d22f684cc8ec987e1': 'USDC.e',
  '0x0709f39376deee2a2dfc94a58edeb2eb9df012bd': 'USDT',
  '0x9ebe3a824ca958e4b3da772d2065518f009cba62': 'PENGU',
  '0x566d7510dee58360a64c9827257cf6d0dc43985e': 'SakuraSwap · AMM factory',
  '0xa1160e73b63f322ae88cc2d8e700833e71d0b2a1': 'SakuraSwap · CLMM factory',
  '0xf6cdfff7ad51caad860e7a35d6d4075d74039a6b': 'Aborean · AMM factory',
  '0x8cfe21f272fdfddf42851f6282c0f998756eef27': 'Aborean · CL factory',
  '0x7c2e370ca0fcb60d8202b8c5b01f758bcad41860': 'Kona · V2 factory',
  '0xfed3612d6865ca46f080f19fc34aa8cac0c92cf6': 'Kona · V3 factory',
  '0x288e195322088e615460ccaa0fe0a862c9e06412': 'Kona · Stableswap factory',
  '0x9f9f76660d17f76f63a32f6d4920b282d3856f3f': 'Kona · Twocrypto factory',
  '0xa44965ebbcb73163eb838dc4dfa85f56b04804a6': 'Kona · Tricrypto factory',
  '0xe1e98623082f662bca1009a05382758f86f133b3': 'NOXA · DEX factory',
  '0x0b4429576e5ed44a1b8f676c8217eb45707afa3d': 'Witty · Arcade',
  '0x4b48f3d1ddc9e5793d4817517255e6bef6d72a7c': 'Amigo · Router',
  '0x8eeae4dd40ebee7bb6471c47d4d867539cf53ccf': 'ZeroLend · Data provider',
};
const BY_CHAIN = { blast: LABELS, abstract: LABELS_ABSTRACT };

export function labelFor(addr, chainKey = 'blast') {
  return addr ? (BY_CHAIN[chainKey] || {})[addr.toLowerCase()] : undefined;
}
export function label(addr) {
  return labelFor(addr, 'blast');
}
