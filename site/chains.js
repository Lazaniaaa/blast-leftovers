// Chains the scanner supports. Everything chain-specific lives here; engine.js reads only this config.
import { defineChain } from 'viem';

const blastChain = defineChain({
  id: 81457, name: 'Blast',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.blast.io'] } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
});
const abstractChain = defineChain({
  id: 2741, name: 'Abstract',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://api.mainnet.abs.xyz'] } },
  contracts: { multicall3: { address: '0xAa4De41dba0Ca5dCBb288b7cC6b708F3aaC759E7' } },
});

export const CHAINS = {
  blast: {
    key: 'blast', name: 'Blast', id: 81457, viemChain: blastChain,
    rpc: ['https://rpc.blast.io', 'https://blast-rpc.publicnode.com'],
    multicall3: '0xcA11bde05977b3631167028862bE2a173976CA11',
    // Routescan, Etherscan-compatible, no key, up to 10k rows per call
    explorerApi: 'https://api.routescan.io/v2/network/mainnet/evm/81457/etherscan/api', pageMax: 10000, historyMax: 20000,
    scan: 'https://blastscan.io', explorerName: 'Blastscan', llama: 'blast',
    deadline: '2026-10-26T23:59:59Z', deadlineLabel: 'Oct 26',
    withdrawals: 'op', bridgeUrl: 'https://blast.io',
    // L2 contracts a withdrawal can start from
    bridges: ['0x4300000000000000000000000000000000000005', '0x4200000000000000000000000000000000000010', '0x4200000000000000000000000000000000000016', '0x4200000000000000000000000000000000000007', '0x4200000000000000000000000000000000000014'],
    // wrapping is not a deposit
    wrappers: ['0x4300000000000000000000000000000000000004', '0x4300000000000000000000000000000000000003', '0xca11bde05977b3631167028862be2a173976ca11'],
    example: '0x0ee09b204ffebf9a1f14c99e242830a09958ba34',
  },
  abstract: {
    key: 'abstract', name: 'Abstract', id: 2741, viemChain: abstractChain,
    rpc: ['https://api.mainnet.abs.xyz'],
    multicall3: '0xAa4De41dba0Ca5dCBb288b7cC6b708F3aaC759E7',
    // ZK Stack block explorer API: Etherscan-compatible, no key, max 1000 rows per call
    explorerApi: 'https://block-explorer-api.mainnet.abs.xyz/api', pageMax: 1000, historyMax: 10000,
    scan: 'https://abscan.org', explorerName: 'Abscan', llama: 'abstract',
    deadline: '2026-12-15T23:59:59Z', deadlineLabel: 'Dec 15',
    withdrawals: 'zk', bridgeUrl: 'https://migrate.abs.xyz',
    // ETH base token, L2 asset router / shared bridge, legacy shared bridge (from zks_getBridgeContracts)
    bridges: ['0x000000000000000000000000000000000000800a', '0x0000000000000000000000000000000000010003', '0x954ba8223a6bfec1cc3867139243a02ba0bc66e4'],
    wrappers: ['0x3439153eb7af838ad19d56e1571fbd09333c2809', '0xaa4de41dba0ca5dcbb288b7cc6b708f3aac759e7'],
    // Ethereum side of the ZK Stack bridge
    zk: { chainId: 2741n, l1Nullifier: '0xD7f9f54194C633F36CCD5F3da84ad4a1c38cB2cB' },
    // Abstract Global Wallet: smart account derived from the signer address
    agw: {
      factory: '0x9B947df68D35281C972511B3E7BC875926f26C1A', registry: '0xd5E3efDA6bB5aB545cc2358796E96D9033496Dda',
      // delegate.xyz "linked wallets": ExclusiveDelegateResolver + AGW link rights (from the AGW SDK)
      resolver: '0x0000000078CC4Cc1C14E27c0fa35ED6E5E58825D', linkRights: '0xc10dcfe266c1f71ef476efbd3223555750dc271e4115626b',
    },
    // contract-internal positions (addresses from docs.myriad.markets and Morpho's address registry)
    myriad: { market: '0x3e0F5F8F5Fb043aBFA475C0308417Bf72c463289', points: '0x0b07cf011b6e2b7e0803b892d97f751659940f23' },
    morpho: '0xc85CE8ffdA27b646D269516B8d0Fa6ec2E958B55',
    // Stargate ETH pool LP (S*ETH) is redeemable 1:1 for ETH
    priceAlias: { '0x868bdf0b7429704db1a50af77fc02c0bb9a4c754': 'eth' },
    // apps that hold balances in their own ledger or off-chain; if the wallet touched them, point the user there
    apps: [
      { key: 'gigaverse', name: 'Gigaverse', contracts: ['0x50a5eb2b3b289d4cfda0e307609b655175a275b1', '0x59eec556cef447e13edf4bfd3d4433d8dad8a7a5'] },
      { key: 'och', name: 'Onchain Heroes', contracts: ['0x06d7ee1d50828ca96e11890a1601f6fe61f1e584'] },
      { key: 'shiny', name: 'Shiny', contracts: ['0x911dbdd9841b53ee5a08170109daf7ad82684108'] },
      { key: 'gacha', name: 'Gacha', contracts: ['0x268031de8363401d61b6a256bea009bb57277619', '0x3272596f776470d2d7c3f7dff3dc50888b7d8967'] },
      { key: 'orderly', name: 'Orderly', contracts: ['0xe80f2396a266e898fbbd251b89cfe65b3e41fd18'] },
      { key: 'logx', name: 'LogX', contracts: ['0x816b55ff6e204d5825cf2792955daf449e819494'] },
      { key: 'witty', name: 'Witty', contracts: ['0x0b4429576e5ed44a1b8f676c8217eb45707afa3d'] },
      { key: 'amigo', name: 'Amigo', contracts: ['0x4b48f3d1ddc9e5793d4817517255e6bef6d72a7c'] },
      { key: 'deathfun', name: 'death.fun', contracts: ['0x27edd16ee56958fddcba08947f12c43ddec2b20c'] },
    ],
    example: null,
  },
};
export const CHAIN_KEYS = Object.keys(CHAINS);
