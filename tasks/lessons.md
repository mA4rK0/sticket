# Lessons

Patterns learned from corrections. Each entry is a durable rule, not a one-off note.

## L1 - Do not force content into git against the project's own .gitignore

**What happened:** `forge install` failed on a flaky clone, so dependencies were vendored and then
`git add -f contracts/lib` was used to commit 612 dependency files. The project's `.gitignore`
already said `lib/`, and the force-add bypassed that intent.

**Rule:** treat `.gitignore` as a specification, not an obstacle. If a file must be committed
despite being ignored, raise it as a decision with the tradeoff stated, never with `-f` on my own
initiative.

## L2 - Surface the cost of a workaround before taking it

**What happened:** switching from submodules to vendored dependencies added ~600 files to the repo.
That was a defensible call but was reported after the fact.

**Rule:** when a fix trades one problem for another (file count, size, clone behaviour, flag
requirements), state the cost in the same message and let the user choose.

## L3 - Never commit without being asked

**What happened:** several commits were made automatically while the user wanted to review and commit
themselves.

**Rule:** leave changes in the working tree. Editing files is fine; `git commit` requires an explicit
instruction in that turn.

## L4 - Do not edit user-facing documents without asking

**What happened:** the README's deployment section was rewritten to hold a table of demo instances,
implying more permanence than a throwaway contract has.

**Rule:** docs that a judge or user reads are design artefacts. Propose the change, or ask which
shape is wanted, before writing it.

## L5 - Verify state before asserting it

**What happened:** a message claimed "you've now made three (A, B, C)" when C did not exist.

**Rule:** never state that something exists, was created, or was deployed without reading the
evidence (git log, deployment records, chain reads) in that turn.

## L6 - Edit anchors must be checked, not assumed

**What happened:** two slips in one session: an anchor replaced an address declaration instead of
adding a new one, and five test calls omitted a required function argument.

**Rule:** when an edit adds something alongside existing content, include enough surrounding context
that deleting is impossible; after writing calls to an API, re-read the signature. The compiler or
test suite is the cheap detector - run it immediately.

## L7 - A contract whose start time has passed can never have any tickets

**What happened:** a two-contract demo plan proposed an instance with `eventStart` in the past for the
door demo. Buying is closed at and after `eventStart`, so nothing could ever be minted on it and there
would be nothing to check in.

**Rule:** for time-gated systems, check every state transition for reachability given the current
clock before proposing a configuration. Ask of each planned instance: which actions remain possible
after its gate passes?

## L8 - A corrupted global toolchain is repaired with the toolchain that still works

**What happened:** `npm` resolved to a globally installed copy under the user profile whose own
`node_modules` was missing `path-scurry`, so every `npm` command failed. Node ships a working npm
beside itself.

**Rule:** when a global CLI is broken, look for a second copy that still runs (Node's bundled npm,
a pinned version manager) and use it to reinstall the broken one. Check version compatibility first:
`npm@latest` demanded a newer Node than was installed, so the newest compatible major was the right
target.

## L9 - Bundler failures from optional peer dependencies are fixed by installing them

**What happened:** the production build failed with `MISSING_EXPORT` for `@solana/kit` and friends,
because Privy declares them as optional peers and Vite 8's rolldown resolves the missing packages to
an empty stub, then complains the named exports do not exist.

**Rule:** stubbing cannot fix this (the stub would need every export the library imports) and
marking them external breaks at runtime. Install the optional peers and exclude them from
pre-bundling. Cost: bundle weight from a code path that never runs.

## L10 - Browser verification harnesses have a lifetime shorter than the session

**What happened:** `page.exposeFunction` persisted across tool calls while the injected provider and
`page.evaluateOnNewDocument` registrations did not, and the third `exposeFunction` attempt for a new
account failed because the first binding was still installed with the old key in its closure, so
transactions silently signed as the wrong wallet. A per-call runtime cap also aborted long waits.

**Rule:** assume nothing set on a page survives to the next call. Do a multi-step flow inside one
call, use a fresh binding name per identity, keep each call short, and verify outcomes against the
chain rather than trusting the harness narrative.

## L11 - Enumerating "my" tokens must include the ones in escrow

**What happened:** the ticket list filtered by `ownerOf`, so once a ticket was listed for resale the
contract became its owner and the ticket disappeared from the user's own page.

**Rule:** when a design moves ownership into a contract temporarily, every "belongs to this user"
query needs a second condition. A listed item is mine when I am its recorded seller, not only when I
am its owner.

## L12 - Refresh reads when a write confirms

**What happened:** a confirmed purchase or listing stayed invisible for up to 15 seconds because
reads only polled.

**Rule:** if the UI polls, it must also invalidate when a transaction receipt arrives, or the user
sees stale state at exactly the moment they are paying attention.

## L13 - Assert behaviour, not remembered copy

**What happened:** moving the scanner rules into a module changed one message slightly and the test
that pinned the old wording failed.

**Rule:** match a stable fragment that expresses the rule, or assert on the verdict itself. When a
test fails, check which side is stale before changing either one.
