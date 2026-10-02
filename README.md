# Blast Leftovers

Live: https://blast-leftovers.vercel.app

Made [for the love of the game](https://x.com/Skarly/status/2106037621499793494).

Paste an address and see what is still left on Blast before the shutdown (UI withdrawals close Oct 26, 2026).
No wallet connection. Everything runs in the browser and only reads data.

## What it checks

| What | How |
|---|---|
| Tokens in the wallet | Every token the address ever received (Routescan `tokentx`) → `balanceOf` via Multicall3 |
| Lending (Pac, ZeroLend, Parallel and other Aave forks) | aToken / debtToken → `UNDERLYING_ASSET_ADDRESS`, `POOL().getUserAccountData` (health factor) |
| Lending (Orbit and other Compound forks) | cToken → `exchangeRateStored`, `comptroller.getAssetsIn` → `borrowBalanceStored` |
| INIT Capital | `underlyingToken()` + `toAmt()` |
| Juice Finance | lending pools `getDepositAmount`, account managers `getAccount` → collateral + debt |
| Vaults (Wasabi, Hyperlock, ERC-4626) | `asset()` + `convertToAssets()` |
| V2 LP (Thruster, Blasterswap, …) | `token0/token1/getReserves/totalSupply` |
| V3 / Algebra LP NFTs (Thruster, Blasterswap, Fenix, …) | `positions(id)` + pool price, including NFTs staked in farms |
| ve-locks | `locked(id)` |
| Staking without a receipt token | history heuristic: what went into a contract and never came back, then checked with `balanceOf/staked/userTotalStaked/...` getters and the contract's own balance |
| Unfinished Blast → Ethereum withdrawals | `MessagePassed` from the tx receipt → `OptimismPortal.provenWithdrawals / finalizedWithdrawals` on L1 |
| Scam tokens | names with links, "claim", homoglyphs (BIast), invisible characters → hidden |
| DeBank | profile link + optional `complex_protocol_list` with the user's own AccessKey |

Protocol links come only from DefiLlama data (`protocols.js`). For protocols whose site is dead, the app links to the contract's Write Contract page on Blastscan.

## Files

- `site/index.html` — page and styles
- `site/app.js` — UI, EN/UA, themes, rendering, DeBank, donate button
- `site/engine.js` — the scanner (works in the browser and in Node)
- `site/labels.js` — known Blast contracts
- `site/protocols.js` — protocol registry (URL, dead site, X account)
- `site/donate.js` — donate address and live tally (`GOAL_USD` sets a goal bar)
- `site/vercel.json` — static hosting headers
- `test.mjs` — console scan: `npm install` once, then `node test.mjs 0x...`

## Run locally

```bash
npx http-server site -p 5178
```

## Deploy (Vercel, free)

```bash
npx vercel deploy site --prod
```

The first run asks you to log in and set up the project. Later runs redeploy the same URL.
There is no backend: every request goes from the visitor's browser to public APIs, so hosting load is negligible.

## Data sources

Blast RPC (rpc.blast.io, fallback publicnode), Routescan Etherscan-compatible API (no key), DefiLlama coins API, Ethereum RPC (publicnode).
