# Questions

Keep unresolved questions concise. Add a date or context when it helps.

## YYYY-MM-DD: Question

- **Context:**
- **Current hypothesis:**
- **Evidence to check:**
- **Status:** unresolved

---

## 2026-09-13: Why `super._update(...)` and not `_update(...)` inside the override?

- **Context:** The NEPEL anti-calo guard is a single override of `_update` that reverts when the third argument is not the zero address. Open question: why can't the override just call `_update(to, tokenId, auth)`?
- **Current hypothesis:** None formed yet.
- **Evidence to check:** Write the override both ways in a Foundry test and observe what happens — specifically what happens to the call when a function dispatches to itself.
- **Status:** resolved (2026-09-14). A bare internal call to a `virtual` function resolves to the **most-derived override** — the body you are standing in — so `_update(to, tokenId, auth)` calls itself and recurses until gas is exhausted. `super._update` instead jumps to the **next implementation up the inheritance chain** (ERC721's real body) exactly once, then returns. Note the path: on `transferFrom`, `auth` is a real address, so the guard reverts *before* the recursive line is reached — the recursion only manifests where the guard passes, i.e. `buyResale` with `auth == address(0)`. Still to verify in code: exact failure mode (OOG vs. revert) via a Foundry test.

## 2026-09-13: If the built-in check is switched off, what must `buyResale` verify itself?

- **Context:** Passing the zero address as the third argument to `_update` skips OpenZeppelin's authorization check entirely. That is exactly what makes the anti-calo guard work — and it also means nothing verifies the seller owns the ticket or that the buyer paid.
- **Current hypothesis:** First item identified (2026-09-14) via a stale-listing trace: `buyResale` must confirm the *current* owner is the seller who is being paid — `require(ownerOf(tokenId) == l.seller)`, or equivalently `delete listings[tokenId]` at purchase. Without it, the listing outlives the sale: any third party can pay the stale price to the former owner and have the ticket moved to themselves. Money and ownership were reading two different sources of truth.
- **Evidence to check:** Still open — the full enumeration (ownership, not-used, payment arrived, price within cap) is incomplete. Remaining known gap: the `used` flag — a checked-in ticket is a dead end per the blueprint state machine and must not be resellable. Next: write the bogus-caller test (Carol on a stale and on a used ticket) and confirm both revert.
- **Status:** partially resolved (2026-09-14) — ownership check confirmed missing and fixed; `used`-check and full pre-move enumeration still unresolved.
