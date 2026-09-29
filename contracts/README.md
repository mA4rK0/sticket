# Sticket contracts

A Foundry project holding one contract: `EventTickets`, an ERC-721 where every ticket is unique and every transfer has to go through the contract's own resale market.

## Commands

```bash
forge build
forge test          # 39 tests
forge fmt --check
```

Dependencies are not vendored: `lib/` is gitignored, so fetch them first (this is the same step CI runs):

```bash
git clone --depth 1 --branch v1.16.2 https://github.com/foundry-rs/forge-std lib/forge-std
git clone --depth 1 --branch v5.0.2 https://github.com/OpenZeppelin/openzeppelin-contracts lib/openzeppelin-contracts
```

## Deploy

```bash
cp .env.example .env     # price, organizer, supply, event start, RPC
cast wallet import deployer --interactive
forge script script/Deploy.s.sol --rpc-url "$MONAD_RPC_URL" --account deployer --broadcast -vvv
```

The script reads everything from the environment, so one script deploys to a local `anvil`, to Monad testnet, or anywhere else without edits. `EVENT_START` is immutable once deployed and acts as a hinge: before it sales are open, at and after it sales are closed, the door opens, and withdrawal unlocks.

## Deployed instances

Addresses, terms, every transaction hash, and the on-chain evidence for each behaviour are in [`../docs/deployments.md`](../docs/deployments.md).

## Design notes worth knowing before reading the code

- The `_update` override reverts whenever the third argument is not the zero address, which blocks every user-initiated transfer, including the owner's. Minting and the contract's own escrow moves pass through because they use the zero address.
- Resale is escrowed: `listForSale` moves the token into the contract, so while a ticket is listed the contract is its owner.
- `listForSale` can only be called by the ticket's current owner, which also makes double-listing impossible, because after the first listing the owner is the contract.
- `buyResale` deletes the listing before paying the seller, so a re-entrant seller cannot sell the same ticket twice.
- Sales close at `eventStart` (`buy` and `buyResale`), and `withdraw` unlocks at the same instant. There is no event-end, so the organizer can withdraw while the event runs.
- Two checks in `buyResale` are currently unreachable: the price cap is immutable and already enforced at listing time, and an escrowed ticket can never be checked in. They are kept as defence against a future change that would make them reachable.
