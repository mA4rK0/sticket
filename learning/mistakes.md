# Mistakes

Record meaningful bugs or recurring misconceptions. Preserve the original reasoning.

## YYYY-MM-DD: Short title

- **Problem:**
- **Mistake:**
- **Original mental model:**
- **Correct mental model:**
- **Category:**
- **Prevention:**
- **Follow-up exercise:**

---

## 2026-09-13: Gas is not free — reads are ephemeral work, writes are permanent state

- **Problem:** Asked to describe how ticket ownership is stored and what a lookup costs. Answer: *"it stored ticket ownership using a key-value lookup table, the lookup cost is zero gas."* Asked next who pays for an on-chain read and an on-chain write: answered *"Monad"* both times.
- **Mistake:** Two errors inside one model. (1) Treated storage cost as a property of the *data* ("it's just sitting there, so reading it is free") instead of a property of the *operation*. (2) Treated gas as something the network pays, rather than something the transaction's signer pays.
- **Original mental model:** Ownership is a key-value table. Looking a value up is instantaneous and free. Whatever cost exists belongs to Monad.
- **Correct mental model:** Cost depends on who executes the operation and whether a transaction is involved. Off-chain read (`eth_call` via RPC): free to the caller, leaves no trace, served by any node from state it already holds. On-chain read (SLOAD): charged — ~2,100 gas cold, ~100 gas warm. On-chain write (SSTORE, fresh slot): ~20,000 gas, roughly 10–200× a read, because the new state must be agreed by consensus and persisted by every validator indefinitely. Gas is paid by whoever signed the transaction, for every operation that transaction performs — including reads executed by contract code it calls. The network charges gas; it never pays it.
- **Category:** Conceptual weakness — cost/resource model of the execution environment. Not a syntax gap.
- **Prevention:** Before reasoning about cost, answer two questions: (1) Who signs this — is it a transaction at all? (2) Does the world have to remember something afterward? Reads are ephemeral work; writes purchase permanent, replicated state.
- **Follow-up exercise:** In Sticket, list every operation a scanner performs per attendee during check-in and label each as off-chain read, on-chain read, or on-chain write. Predict which one dominates the cost of a 500-attendee event, then verify against Monad's documented fee parameters.
