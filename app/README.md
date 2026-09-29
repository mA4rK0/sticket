# Sticket app

The Vite + React + TypeScript front end for Sticket. It talks to the `EventTickets` contract on Monad testnet directly: no backend, no database, no indexer.

The full project documentation, including what is verified and what is not, is in the [root README](../README.md).

## Run it

```bash
cp .env.example .env
npm install
npm run dev
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | development server |
| `npm run build` | typecheck, then production build |
| `npm run typecheck` | types only |
| `npm test` | unit tests for the ticket code format and the door rules |
| `npm run gen:abi` | regenerate the contract ABI from the Foundry artifact |
| `npm run lint` | oxlint |
| `npm run preview` | serve the production build locally |

## Configuration

| Variable | Meaning |
|---|---|
| `VITE_MONAD_RPC_URL` | RPC endpoint for Monad testnet |
| `VITE_EVENT_ADDRESS` | the contract the buyer pages use |
| `VITE_SCANNER_EVENT_ADDRESS` | the contract the scanner uses, defaulting to the above. Check-in only works after an instance's `eventStart`, so this is often a different deployment |
| `VITE_PRIVY_APP_ID` | enables email login with an embedded wallet. Left empty, the app uses any injected browser wallet and never downloads Privy's bundle |

## Contract interface

The ABI is generated, never hand written: `npm run gen:abi` reads `../contracts/out/EventTickets.sol/EventTickets.json` and writes `src/lib/abis/EventTickets.ts`. Run `forge build` in `contracts/` first.

## What the tests cover

`npm test` exercises the two pure modules that carry the door logic:

- `src/lib/ticketCodec.ts` builds and parses the `stk:1:<chainId>:<contract>:<tokenId>` code, and rejects malformed or tampered input
- `src/lib/scanVerification.ts` decides whether a scanned ticket is admissible, in the order that matters: valid code, right chain, right event, ticket exists, not already used, not held in escrow

The camera capture itself needs a real device; see the testing section of the root README.
