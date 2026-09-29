# Frontend plan - Sticket (F2 + F3)

Status: **frozen, awaiting sign-off.** Stack pinned from the npm registry; nothing has been built yet.

## Confirmed decisions

| Question | Decision |
|---|---|
| Login | Privy email login plus embedded wallet. Verified feasible on Monad testnet (see below). |
| Scope | Buyer flow plus organizer dashboard and camera scanner. No event-creation page. |
| Language | English throughout the interface. |
| Manual testing | The user installs a browser wallet and imports the already-public buyer key. Phantom verified as working on Monad; MetaMask also fine. |
| Folder | `app/` at the repository root, per the blueprint. It never imports from `contracts/` at runtime; the only bridge is the generated ABI file and the deployed address. |

## Goal

A Vite + React + TypeScript SPA in `app/` that lets a buyer purchase, use, and resell an on-chain
Sticket ticket, and lets the organizer sell, monitor, and scan tickets at the door. Deployed to a public
host, talking directly to Monad testnet with no backend and no database.

## Non-goals

- No mainnet, no real payments, no stablecoin rail.
- No backend, API, or database of any kind.
- No event-creation page: it would require `TicketFactory`, which does not exist in `contracts/`.
  One event equals one deployed `EventTickets` instance, and creating one means running the deploy
  script. Recorded as a known limitation, not built.
- No analytics, no cookies, no third-party trackers.

## Target contracts

| Instance | Address | Use |
|---|---|---|
| C - canonical | `0x080266e2e193Afe65f72099E1cB804A4202D0fc8` | buying, listing, resale (sales open for 7 days) |
| B - doors open | `0xB462AFdB02F46f011e9De4AcCBF117F30803b28b` | scanner and check-in demo (`eventStart` passed) |

Both are configured through env vars so no address is hardcoded, and the scanner can point at B while
the buyer pages point at C.

## Stack (pinned from the npm registry)

| Package | Pin | Why this version |
|---|---|---|
| vite | 8.3.1 | react-ts template default; Node 22.16.0 satisfies its engines (`^20.19 \|\| >=22.12`) |
| react / react-dom | 19.3.0 | every peer below accepts `>=18` or `^19` |
| typescript | template default, must be `>=5.9.3` | wagmi 3 peer requirement. Latest is 7.0.2; not chased, the template pin is the boring choice |
| wagmi | 3.7.7 | current stable (v3, not the v2 the blueprint assumed) |
| viem | **2.56.0 exactly** | `@privy-io/wagmi` declares viem `2.56.0` as an exact peer; `2.56.9` would conflict |
| @tanstack/react-query | 5.104.0 | wagmi peer `>=5.0.0` |
| @privy-io/react-auth | 3.45.0 | email login plus embedded wallet |
| @privy-io/wagmi | 4.0.17 | the wagmi bridge; peers: wagmi `>=2`, react-auth `^3`, viem `2.56.0` |
| @privy-io/chains | 0.6.1 | supplies `addRpcUrlOverrideToChain` for the custom chain |
| qrcode.react | 4.2.0 | QR rendering, peer accepts React 19 |
| @zxing/browser + @zxing/library | 0.2.1 + `^0.23.0` | camera scanning; actively released and published with build provenance |

Rejected: `html5-qrcode` (no recent release or provenance compared with ZXing).

## Privy on Monad testnet - resolved

Privy embedded wallets support arbitrary EVM chains, configured **client side** rather than in the
dashboard: define the chain with viem's `defineChain`, wrap the RPC URL with
`addRpcUrlOverrideToChain` from `@privy-io/chains`, and pass it to `PrivyProvider` as both
`defaultChain` and `supportedChains`. Dashboard chain settings are required only for ERC-4337 smart
wallets, where a bundler and paymaster URL must be registered. Source:
`docs.privy.io/basics/react/advanced/configuring-evm-networks`.

Consequence for the demo: there is no gas sponsorship on a custom chain, so an embedded wallet starts
at 0 MON and cannot buy or check in until it is funded. The demo script needs a funding step.

## Browser wallets - resolved

Phantom natively supports Monad and exposes an EIP-1193 provider, so it works as the injected wallet;
MetaMask and Rabby also work. The app does not depend on any specific one: it uses wagmi's injected
connector, and the automation harness supplies its own provider.

## Architecture

`app/src/lib/chain.ts` defines Monad testnet (id 10143, RPC from `VITE_MONAD_RPC_URL`).
`app/src/lib/contracts.ts` holds the event address and the typed ABI.

Connectors are ordered deliberately:

1. **Injected** (EIP-1193) - always present. Used by the user with any browser wallet, and used by the
   automated verification harness to drive real transactions.
2. **Privy** - added only when `VITE_PRIVY_APP_ID` is present. Email login plus embedded wallet.

Business logic depends only on wagmi hooks (`useReadContract`, `useWriteContract`, `useReadContracts`),
never on a specific connector, so the app is fully testable without Privy credentials.

## Data layer - the enumeration problem

ERC-721 without `ERC721Enumerable` cannot list "the tokens this address owns". Three options:

| Option | Cost | Verdict |
|---|---|---|
| Log scan (`eth_getLogs` for `Transfer` to/from the user) | needs a from-block, works with any provider | correct at scale, more code |
| `ERC721Enumerable` | contract change plus redeploy | rejected: contract is frozen and verified |
| Multicall over ids `1..nextTicketId-1`, then filter by `ownerOf` | one batched request, bounded by `maxSupply` (500) | chosen for the demo |

Same technique enumerates the resale market: read `listings(id)` across the same id range and keep
entries whose `seller != address(0)`.

Hooks: `useEvent`, `useMyTickets`, `useResale`, `useBuyTicket`, `useListTicket`, `useBuyResale`,
`useDashboard`, `useCheckIn`.

## Pages

| Route | Purpose | Phase |
|---|---|---|
| `/` | Event page: name, official price, remaining supply, sales window state, buy button | F2 |
| `/tickets` | My tickets, each with a QR code; list and unlist for resale | F2 |
| `/resale` | Active listings, buy at the capped price | F2 |
| `/dashboard` | Organizer: sold count, revenue estimate, checked-in count | F3 |
| `/scanner` | Camera scan, ownership and `isUsed` checks, then `checkIn` | F3 |
| `/terms`, `/privacy`, `/refund` | Plain-language policies | F2 |

Scanner ordering matters: resolve the token's owner **first** (unknown ids revert), then read
`isUsed`, and only then call `checkIn`. `isUsed` returns `false` for non-existent tokens, so a
fabricated QR must be rejected by the ownership check, not by `isUsed`.

## Interface constraints (from the forbidden list)

No emoji, no em dashes, no pure white background, no harsh gradients, no neon or pastel-only palette,
no rainbow accents, no Inter/Geist/Space Grotesk typefaces, no bento or dot grids, no terminal-window
styling, no sparkle icons, no checkmark bullets, no colored left stripe, no fake testimonials, no
"it is not X, it is Y" copy.

Required by the same list: real product demos (this app, working), skeleton loaders for every
async read, a terms of service page, a privacy policy page.

## Legal and launch checklist mapping

Applies and will be built: privacy policy, terms of service, refund policy (the contract has no
refunds, so the refund page states that plainly), business details in the footer, accessible alt text,
colour contrast, keyboard navigation, no dark patterns, no hidden fees, no unsupported claims.

Not applicable, stated rather than silently skipped: cookie policy and consent banner (no cookies),
form consents and age consent (no forms, no accounts), password hashing, login rate limiting, row
level security, database keys, server-side auth, query parameterisation, file uploads, session
cookies (no backend, no database, no accounts - identity comes from the wallet).

Applies to deployment: no secrets in the bundle (only public identifiers), security headers and HTTPS
via the host, dependency audit.

## Verification plan

1. `npm run build` and `tsc --noEmit` clean.
2. Read paths verified against the live chain: each displayed value (price, supply, remaining,
   `eventStart` state, ownership, `isUsed`, listings) compared with a direct `cast call`.
3. Write paths verified by driving the app in a real browser with an injected test provider backed by
   a funded testnet key, confirming the resulting transaction on the explorer.
4. Scanner verified against instance B, including the three rejections: unknown token, already used,
   and not owned.
5. Loading, empty, error, wrong-network, and disconnected-wallet states each exercised deliberately.
6. Mobile viewport check, since the scanner is used on a phone.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Privy may not support Monad testnet as a custom chain | email login unavailable | research task; injected connector keeps the app functional either way |
| Embedded wallets start with 0 MON | demo user cannot transact | documented funding step; fund from the faucet or the deployer |
| No Privy app ID available to me | cannot verify the Privy path myself | verify everything else with the injected connector; user clicks the Privy path once |
| Camera API requires a secure context | scanner fails on plain HTTP | develop on localhost, deploy on HTTPS |
| Bundle grows with a QR plus a scanner library | slower first load | lazy-load the scanner route only |
