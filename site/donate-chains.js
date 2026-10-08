// Chains the donation tally reads (top EVM chains by TVL on DefiLlama, Oct 2026, plus Robinhood, Blast and Abstract).
// `native` is the coin price key on DefiLlama; tokens are exact contract addresses, verified on-chain
// (symbol + decimals), so look-alike airdrops can never be counted.
export const DONATION_CHAINS = [
  { id: 1, name: 'Ethereum', rpc: ['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org'], native: 'coingecko:ethereum', nativeSymbol: 'ETH',
    tokens: [['USDC', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'usd'], ['USDT', '0xdac17f958d2ee523a2206206994597c13d831ec7', 'usd'], ['WETH', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 'coingecko:ethereum']] },
  { id: 8453, name: 'Base', rpc: ['https://base-rpc.publicnode.com', 'https://base.drpc.org'], native: 'coingecko:ethereum', nativeSymbol: 'ETH',
    tokens: [['USDC', '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', 'usd'], ['USDT', '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2', 'usd'], ['WETH', '0x4200000000000000000000000000000000000006', 'coingecko:ethereum']] },
  { id: 56, name: 'BNB Chain', rpc: ['https://bsc-rpc.publicnode.com', 'https://bsc.drpc.org'], native: 'coingecko:binancecoin', nativeSymbol: 'BNB',
    tokens: [['USDT', '0x55d398326f99059ff775485246999027b3197955', 'usd'], ['USDC', '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 'usd'], ['ETH', '0x2170ed0880ac9a755fd29b2688956bd959f933f8', 'coingecko:ethereum']] },
  { id: 42161, name: 'Arbitrum', rpc: ['https://arbitrum-one-rpc.publicnode.com', 'https://arbitrum.drpc.org'], native: 'coingecko:ethereum', nativeSymbol: 'ETH',
    tokens: [['USDC', '0xaf88d065e77c8cc2239327c5edb3a432268e5831', 'usd'], ['USDC.e', '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', 'usd'], ['USDT', '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', 'usd'], ['WETH', '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', 'coingecko:ethereum']] },
  { id: 4663, name: 'Robinhood Chain', rpc: ['https://robinhood-rpc.publicnode.com', 'https://rpc.mainnet.chain.robinhood.com'], native: 'coingecko:ethereum', nativeSymbol: 'ETH',
    tokens: [['WETH', '0x0bd7d308f8e1639fab988df18a8011f41eacad73', 'coingecko:ethereum']] },
  { id: 143, name: 'Monad', rpc: ['https://rpc.monad.xyz'], native: 'coingecko:monad', nativeSymbol: 'MON',
    tokens: [['USDC', '0x754704bc059f8c67012fed69bc8a327a5aafb603', 'usd'], ['USDT', '0xe7cd86e13ac4309349f30b3435a9d337750fc82d', 'usd'], ['WETH', '0xee8c0e9f1bffb4eb878d8f15f368a02a35481242', 'coingecko:ethereum']] },
  { id: 137, name: 'Polygon', rpc: ['https://polygon.drpc.org', 'https://polygon-bor-rpc.publicnode.com'], native: 'coingecko:polygon-ecosystem-token', nativeSymbol: 'POL',
    tokens: [['USDC', '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', 'usd'], ['USDC.e', '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', 'usd'], ['USDT', '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', 'usd'], ['WETH', '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', 'coingecko:ethereum']] },
  { id: 43114, name: 'Avalanche', rpc: ['https://avalanche-c-chain-rpc.publicnode.com', 'https://avalanche.drpc.org'], native: 'coingecko:avalanche-2', nativeSymbol: 'AVAX',
    tokens: [['USDC', '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e', 'usd'], ['USDT', '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7', 'usd']] },
  // Arc pays gas in USDC: the native balance IS the USDC balance (0x3600… mirrors it), so only native counts
  { id: 5042, name: 'Arc', rpc: ['https://rpc.drpc.mainnet.arc.io', 'https://rpc.blockdaemon.mainnet.arc.io'], native: 'usd', nativeSymbol: 'USDC',
    tokens: [['WETH', '0x128cc466b61f542da60c70e3aa11c10e19b84edb', 'coingecko:ethereum']] },
  { id: 9745, name: 'Plasma', rpc: ['https://rpc.plasma.to'], native: 'coingecko:plasma', nativeSymbol: 'XPL',
    tokens: [['USDT0', '0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb', 'usd']] },
  { id: 10, name: 'OP Mainnet', rpc: ['https://optimism-rpc.publicnode.com', 'https://optimism.drpc.org'], native: 'coingecko:ethereum', nativeSymbol: 'ETH',
    tokens: [['USDC', '0x0b2c639c533813f4aa9d7837caf62653d097ff85', 'usd'], ['USDT', '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', 'usd'], ['WETH', '0x4200000000000000000000000000000000000006', 'coingecko:ethereum']] },
  { id: 81457, name: 'Blast', rpc: ['https://rpc.blast.io', 'https://blast-rpc.publicnode.com'], native: 'coingecko:ethereum', nativeSymbol: 'ETH',
    tokens: [['USDB', '0x4300000000000000000000000000000000000003', 'usd'], ['WETH', '0x4300000000000000000000000000000000000004', 'coingecko:ethereum']] },
  { id: 2741, name: 'Abstract', rpc: ['https://api.mainnet.abs.xyz'], native: 'coingecko:ethereum', nativeSymbol: 'ETH',
    tokens: [['USDC.e', '0x84a71ccd554cc1b02749b35d22f684cc8ec987e1', 'usd'], ['USDT', '0x0709f39376deee2a2dfc94a58edeb2eb9df012bd', 'usd'], ['WETH', '0x3439153eb7af838ad19d56e1571fbd09333c2809', 'coingecko:ethereum']] },
];
