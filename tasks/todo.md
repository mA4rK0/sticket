# Todo - frontend F2 + F3

## Phase 0 - Decisions and pins - DONE

- [x] Confirm plan: buyer flow, dashboard, scanner; no event-creation page (no TicketFactory exists)
- [x] Pin stack versions from the npm registry
- [x] Confirm Privy is feasible on Monad testnet (custom chain, configured client side)
- [x] Privy ships behind `VITE_PRIVY_APP_ID`; the app runs without it and never downloads its bundle

## Phase 1 - Scaffold - DONE

- [x] `app/` created with the Vite react-ts template
- [x] Pinned dependencies installed (wagmi 3.7.7, viem 2.56.0 exact, react-query 5.104.0, Privy 3.45.0, qrcode.react, ZXing)
- [x] `app/.env.example` and a local `app/.env`
- [x] ABI generated from `contracts/out/` by `npm run gen:abi`
- [x] `lib/chain.ts`, `lib/contracts.ts`, `lib/wagmi.ts`, providers, routing, layout, wallet control

## Phase 2 - Buyer flow - DONE

- [x] Event page: price, supply, remaining, sales window, countdown, buy
- [x] Balance and insufficient-funds guidance
- [x] My tickets via multicall, with QR per ticket
- [x] List and unlist for resale, with client-side cap validation
- [x] Resale market with buy at the listed price

## Phase 3 - Organizer - DONE

- [x] Dashboard: sold, remaining, checked in, listed, contract balance, sales window
- [x] Withdraw visible only to the organizer, disabled before the event start
- [x] Scanner route, lazy loaded: camera, code validation, owner and used checks, check-in

## Phase 4 - Policies and polish - DONE

- [x] Terms, privacy and refund pages, footer with policy links and business-details placeholder
- [x] Skeleton loaders for async reads
- [x] Empty, error and disconnected states
- [x] Audit: no emoji, no em dashes, no horizontal overflow, no unnamed controls, no contrast failures
- [x] Plain-language copy throughout

## Phase 5 - Verification - DONE, with two exceptions noted below

- [x] `tsc -b` clean, `vite build` clean, `oxlint` clean
- [x] 9 unit tests for the ticket code format and the door rules
- [x] Reads diffed against `cast call` on the live chain
- [x] Buy driven through the UI: ticket 1 minted to the connected wallet, contract holds 0.01 MON
- [x] List driven through the UI: ticket escrowed, `ownerOf` became the contract
- [x] Unlist driven through the UI: listing cleared, ownership returned
- [x] Resale purchase driven through a second wallet: ownership moved wallet to wallet, seller paid 95%, contract holds exactly price plus 5%
- [x] Scanner page: correct instance addressed, camera failure surfaced as "Permission denied", organizer gating correct
- [x] Dashboard figures matched the chain exactly (0.0105 MON held, 499 remaining)
- [ ] Camera decode of a printed ticket, on a phone: cannot be exercised headlessly, needs a real device
- [ ] Privy email login: cannot be exercised without an App ID from the user's dashboard

## Phase 6 - Deploy - NOT STARTED

- [ ] Deploy the app to hosting with production env vars
- [ ] Verify the public URL against the live contracts
- [ ] Record the link in the README and in docs/deployments.md

## Review

**Defects found and fixed during verification**

1. **Listed tickets disappeared from "My tickets".** The enumeration filtered by `ownerOf`, but a listed ticket is owned by the contract, so a user's own escrowed ticket vanished. Fixed by also matching listings whose recorded seller is the connected wallet. This was the exact failure mode the plan predicted.
2. **Stale reads after a transaction.** Reads poll every 15 seconds, so a confirmed purchase or listing was invisible for up to 15 seconds. Now the query cache is invalidated when the receipt lands: measured 1.8 seconds from click to updated UI on both list and unlist.
3. **Privy was bundled even when disabled.** Making the Privy wrapper and its wallet button dynamically imported keeps its several hundred kilobytes out of the default build.
4. **A stale test assertion** expected wording that changed when the scanner rules moved into a module. Caught by running the tests rather than trusting them.

**Verification evidence**

| Behaviour | Evidence |
|---|---|
| Buy | `ownerOf(1)` = acting wallet, `balanceOf` = 1, contract balance = 0.01 MON |
| List | `listings(1)` = (seller, 0.01 MON), `ownerOf(1)` = contract |
| Unlist | `listings(1)` = zero, `ownerOf(1)` = seller |
| Resale buy | `ownerOf(1)` = second wallet, contract balance = 0.0105 MON (price + 5%), seller balance +0.0095 MON |
| Dashboard | sold 1, remaining 499 of 500, held 0.0105 MON, matching `cast` output |
| Layout audit | eight routes: zero emoji, zero em dashes, zero overflow, zero unnamed controls, zero contrast failures |

**Open items for the user**

- Camera and check-in on a real phone, which is the blueprint's own F4 requirement.
- A Privy App ID, if email login is wanted for the demo.
- Hosting, then the address and link recorded in the README.
