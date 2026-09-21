# Review

Keep short retrieval prompts or review metadata for meaningful topics.

## YYYY-MM-DD: Topic

- **Recall prompt:**
- **Last reviewed:**
- **Confidence:**
- **Next review or exercise:**

---

## 2026-09-14: `_update` dispatch, `super`, and the `auth == address(0)` bypass

- **Recall prompt:** Inside a `_update` override, what does `return _update(to, tokenId, auth);` (no `super`) do when `auth` is a real address, and what does it do when `auth == address(0)`? Which body does `super._update` jump to, and how many times does it run?
- **Last reviewed:** 2026-09-14
- **Confidence:** moderate — corrected mid-session. First answer conflated `auth` with `from` and missed that on the `transferFrom` path the guard reverts before the recursive line is ever reached; the revealing path is `buyResale` (`auth == 0`) → self-dispatch → gas exhaustion.
- **Next review or exercise:** 2026-09-17 — implement both variants in a Foundry test: confirm the `auth == 0` branch runs out of gas on the recursion, and that `transferFrom` reverts from the guard (not the recursion) either way.

## 2026-09-14: Stale listing — ownership and payment reading two different sources of truth

- **Recall prompt:** `listForSale` writes `listings[tokenId]`; `buyResale` never clears it. Trace Carol calling `buyResale` on Alice→Bob's completed sale: what are `ownerOf(tokenId)` and `listings[tokenId].seller`, who moves the ticket, whose wallet receives Carol's MON, and which single `require` is missing?
- **Last reviewed:** 2026-09-14
- **Confidence:** moderate — correct on the third attempt after two narrowing hints (stored value vs. live caller). Not first-pass.
- **Next review or exercise:** 2026-09-17 — compare the `require(ownerOf(tokenId) == l.seller)` fix against `delete listings[tokenId]` on purchase (storage refund, unreadable-vs-unmatchable), then add the missing `used` check: after `checkIn`, the ticket is a dead end and must not be resellable.

## 2026-09-14: Gas is a property of the operation, not of the container (recurring)

- **Recall prompt:** Rank by total cost for 500 check-ins: (A) 500 × `eth_call`, (B) 500 separate `checkIn` transactions, (C) one transaction looping `checkIn` 500 times. Which term of B−C survives batching? What does moving the `used` flag into a bitmap change, and what does it cost you?
- **Last reviewed:** 2026-09-14
- **Confidence:** low — the ordering (A < C < B) was right for partly wrong reasons: "C only pays once" (base fee, not the 500 writes) and "A is free" (free of gas, not of RPC credits). Second occurrence of the same failure mode logged in `mistakes.md` on 2026-09-13.
- **Next review or exercise:** 2026-09-17 — `forge snapshot` a 500-iteration loop `checkIn` against a `mapping(uint256 => uint256)` bitmap version; then write the one-sentence answer: which cost term survives batching and which does not.
