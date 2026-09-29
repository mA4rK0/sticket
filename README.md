# Sticket — tickets that stick to the person

On-chain event tickets for Indonesian community events: campus talks, workshops, meetups — the
events that suffer most from dead tickets and scalpers.

The ownership ledger is a smart contract on Monad, not a server. There is no backend and no
database: who owns a ticket, whether it has been used, and what it may be resold for are all
enforced by code that nobody can override at runtime — including the organizer.

> **Hackathon:** Monad Metropolis · Track 02 — Consumer Products & Payments
> **Full plan:** [`blueprint.md`](./blueprint.md)

**Deployed (Monad testnet, chain id 10143):** [`0x080266e2e193Afe65f72099E1cB804A4202D0fc8`](https://testnet.monadscan.com/address/0x080266e2e193Afe65f72099E1cB804A4202D0fc8)

Price 0.01 MON · supply 500 · organizer `0x036A…72B` · sales open until `eventStart` 1790988897 ·
deploy tx `0x6a5c3c63f6c1d18051854360dc9e74f084cd17eefb4d9a46d8ae247ead6a6a7a`

Development instances, their terms, every transaction hash, and the on-chain verification evidence live in
[`docs/deployments.md`](./docs/deployments.md).

---

## What the contract does

| Function | Who may call | Rules enforced |
|---|---|---|
| `buy()` | anyone | exact payment, one ticket per call, `maxSupply` quota, sales close at `eventStart` |
| `listForSale(tokenId, price)` | the ticket's current owner | not used, `0 < price <= officialPrice`; the ticket moves **into the contract** |
| `unlist(tokenId)` | only the recorded seller | returns the ticket, clears the listing |
| `buyResale(tokenId)` | anyone | listing exists, exact payment, cap re-checked, not used; pays the seller minus the 5% fee |
| `checkIn(tokenId)` | organizer only | after `eventStart`, ticket not escrowed, not already used; records a timestamp |
| `withdraw()` | organizer only | after `eventStart`; sends the whole balance to the organizer |
| `transferFrom` / `safeTransferFrom` | — | **always revert.** Every user-initiated transfer is blocked |

The last row is the product. A ticket cannot leave this contract except through the capped resale
market, so there is no dark channel to sell one through.

## The anti-scalping guarantee, stated precisely

- A ticket can never be sold for more than the **official price**, on any hand. The cap is the
  event's official price and does not drop: a second-hand buyer's ceiling is the same as the first buyer's.
- A ticket can never move outside this contract. Every user-initiated ERC-721 transfer reverts.
- **What the cap does NOT do:** it does not bound profit on a *discounted* listing. If a holder
  lists below the official price, a buyer can resell at the cap and profit. The cap stops buying at
  face and flipping above face; it does not stop arbitrage against a distressed seller.
- Every resale costs the seller the 5% organizer fee, so selling at face is a small loss regardless.

## Quick start

Dependencies are **not vendored** — `contracts/lib/` is gitignored, exactly as Foundry expects.
Fetch them (this is the same step CI runs):

```bash
cd contracts

git clone --depth 1 --branch v1.16.2 https://github.com/foundry-rs/forge-std lib/forge-std
git clone --depth 1 --branch v5.0.2 https://github.com/OpenZeppelin/openzeppelin-contracts lib/openzeppelin-contracts

forge test
```

`forge` installs the right `solc` automatically. Expect **39 passing tests**.

## Deploy

```bash
cp .env.example .env          # fill in price, organizer, supply, event start, RPC
cast wallet import deployer --interactive     # paste a key; no key ever touches the source
```

Then, from `contracts/`, with the variables exported:

```bash
forge script script/Deploy.s.sol --rpc-url "$MONAD_RPC_URL" --account deployer --broadcast -vvv
```

The script reads everything from the environment, so the same file deploys to a local `anvil`, to
Monad testnet, or anywhere else without edits.

## The web app

`app/` is a Vite + React + TypeScript single page app. It talks to the contract directly: no backend, no database, no indexer. It holds its own toolchain and never imports from `contracts/`; the only bridge is the generated ABI file and the deployed address.

```bash
cd app
cp .env.example .env      # adjust the contract addresses if needed
npm install
npm run dev               # http://localhost:5173
```

| Script | Purpose |
|---|---|
| `npm run dev` | development server |
| `npm run build` | typecheck then production build |
| `npm run typecheck` | types only |
| `npm test` | unit tests for the door rules and the ticket code format |
| `npm run gen:abi` | regenerate `src/lib/abis/EventTickets.ts` from the compiled contract |
| `npm run lint` | oxlint |

Configuration, all of it optional except the contract address:

| Variable | Meaning |
|---|---|
| `VITE_MONAD_RPC_URL` | RPC endpoint for Monad testnet |
| `VITE_EVENT_ADDRESS` | the contract the buyer pages use |
| `VITE_SCANNER_EVENT_ADDRESS` | the contract the scanner uses; defaults to the above. Check-in only works after an instance's `eventStart`, so this is usually a different deployment |
| `VITE_PRIVY_APP_ID` | enables email login with an embedded wallet. Empty by default, and Privy's bundle is then never downloaded |

Two things about the wallet layer worth knowing:

- Without a Privy App ID the app uses any injected browser wallet. Phantom and MetaMask both work; Phantom supports Monad natively.
- With a Privy App ID, Privy's wrapper is loaded on demand and provides email login plus an embedded wallet. Privy has no gas sponsorship on a custom chain, so an embedded wallet starts at 0 MON and needs funding before it can buy anything.

## Tests

`contracts/test/EventTickets.t.sol` — 39 Foundry tests:

- **Purchase:** mint to buyer, sequential ids, exact-payment boundaries (`PRICE ± 1`, zero), quota
  boundary (last ticket sells, next reverts), sales-closed boundary (`eventStart - 1` vs `eventStart`).
- **Anti-scalping:** user `transferFrom` reverts and ownership is unchanged; the mint still works, which
  proves the guard does not break issuance.
- **Resale:** escrow on listing, unlisting restores ownership, non-seller cannot unlist, non-owner
  cannot list, above-cap and zero-price listings revert, wrong payment reverts, double listing reverts,
  resale cannot happen after sales close, and a second-hand resale proves the cap does not drop.
- **Check-in:** timestamp recorded, double check-in reverts, non-organizer reverts, unknown ticket
  reverts, escrowed ticket reverts, before-`eventStart` reverts.
- **Money:** proceeds reach the organizer, non-organizer cannot withdraw, withdrawal is time-locked,
  the contract's balance and the seller's payout are asserted exactly.

## Known limitations

- **No refunds.** If the event is cancelled, buyers have no on-chain recourse; the organizer is the
  only party who can move the money. Sales closing at `eventStart` bounds the window but does not
  guarantee delivery.
- **Operator trust.** The organizer can withdraw all proceeds after `eventStart`, and can mark any
  non-escrowed ticket as used. Anti-scalping protects holders from each other, not from the organizer.
- **Escrow changes what "owner" means.** While a ticket is listed, `ownerOf(tokenId)` is the
  contract. UIs must read `listings(tokenId).seller` to show who is selling.
- **`officialPrice` is immutable.** A mispriced event requires redeployment.
- **`eventStart` is immutable.** A postponed event leaves the withdrawal gate at the original date.
- **Check-ins are irreversible** (no undo for a mis-scanned QR) and have no upper time bound.
- **ERC-721 approvals still succeed but grant nothing** — `approve`/`setApprovalForAll` write state,
  while every transfer reverts. Marketplace tooling will offer a buy button that fails on-chain.
- **Timestamps** come from `block.timestamp`, which a validator can nudge by seconds — irrelevant at
  event timescales, but it is an assumption.

## Repo layout

```
blueprint.md              # full project plan and design intent
contracts/                # Foundry project
├── src/EventTickets.sol  # the only contract
├── test/                 # 39 Foundry tests
├── script/Deploy.s.sol   # env-driven deployment
└── .env.example          # deployment variables
app/                      # Vite + React + TypeScript front end
├── src/lib/scanVerification.ts  # the door rules, unit tested
├── test/                 # app unit tests
└── .env.example          # app configuration
tasks/                    # plan, todo and lessons kept while building
docs/LEARNING-TOOLKIT.md  # the learning harness used while building this
learning/                 # learning logs kept during development
```

## Built with

This project was built using [Manware's AI Learning Toolkit](./docs/LEARNING-TOOLKIT.md) as the
learning harness — an AI setup that refuses to write the solution and instead asks questions, tests
predictions, and reviews code. The git history shows the process: design interview, tests written
before the code that satisfies them, and a review that found a hole in the pitch before a judge could.
