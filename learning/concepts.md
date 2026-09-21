# Concepts

Record durable understanding, not every definition encountered.

## YYYY-MM-DD: Concept

- **Learner's explanation:**
- **Corrected understanding:**
- **Example:**
- **Related concepts:**

---

## 2026-09-13: Where a ticket's owner lives, and the one place it changes

- **Learner's explanation:** Started with no model of the internals at all. After reading the OpenZeppelin code, correctly worked out that a scalper calling `transferFrom` directly is a **transfer** (not a mint, not a burn), and that blocking it needs **one** check in **one** place, not three.
- **Corrected understanding:** Each ticket's owner is a single row in a table: ticket ID → wallet address. Only three things can ever change that row — creating a ticket (mint), moving it (transfer), destroying it (burn). Inside OpenZeppelin, all three end up in the same internal function, `_update`. That function takes a third argument whose only job is to say *who claims this move is allowed*. The library passes the zero address there for moves the contract makes itself (mint, burn, its own internal transfers), and passes the real user's address for moves a user starts (the public `transferFrom` / `safeTransferFrom`). So that one argument is what separates "the system moved this" from "a person moved this." Behaviour checked against OpenZeppelin 5.0.2 and 5.6.0 — same in both.
- **Example:** Inside an `_update` override: "if that argument is not the zero address, revert." Every user-started transfer gets blocked; mint, burn, and a resale performed by the contract's own code still go through.
- **Related concepts:** reads vs writes cost (a write is roughly 10–200× a read); approvals (`approve` / `setApprovalForAll`) become pointless once every public transfer reverts; the same hook is named `_beforeTokenTransfer` in OpenZeppelin 4.x.
