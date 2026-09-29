# Deployments — Monad testnet

Records of the `EventTickets` instances deployed during development, with the transactions that
verify each designed behaviour on-chain. These are **throwaway instances** used to exercise both
sides of the `eventStart` hinge; the canonical demo address lives in the README.

## Network

| | |
|---|---|
| Chain | Monad testnet, chain id `10143` (`0x279f`) |
| RPC | `https://testnet-rpc.monad.xyz` |
| Faucet | `https://faucet.monad.xyz` |
| Explorers | `testnet.monadscan.com`, `testnet.monadvision.com` |

## Instances

Common terms: `officialPrice = 0.01 MON` (`10000000000000000` wei) · `maxSupply = 500` · `FEE_BPS = 500` (5%).

| Instance | Address | `eventStart` | Organizer | Purpose |
|---|---|---|---|---|
| **C — canonical** | `0x080266e2e193Afe65f72099E1cB804A4202D0fc8` | `1790988897` | `0x036A247dce86Ec5A3E4644B3Ca756C520193E72B` | the deployment the frontend targets: 7-day sales window |
| **A** | `0xC443AC182f08EC2B86925B2b63a736D4f35ea3f0` | `1790387515` | `0x48EC2A52bdc779226B7b144e6ae428b3524F6Df8` | sales open: buying, listing, resale, cap, anti-scalping |
| **B** | `0xB462AFdB02F46f011e9De4AcCBF117F30803b28b` | `1790377496` | `0x48EC2A52bdc779226B7b144e6ae428b3524F6Df8` | doors open: check-in rules, withdrawal |

A and B were deployed with an organizer key that was later exposed; they are throwaway demo instances
and their organizer cannot be re-pointed. C was deployed after that, with a rotated organizer address —
though see the key hygiene note at the bottom before treating either address as a secret.

## Transaction evidence

### Deployment

| Tx | Instance | Block | Gas | Cost |
|---|---|---|---|---|
| `0x5de7fe6db1a55f6e6d4e49cc9617c88fad8c4021945d75509f6b60f5b83fd732` | A | 65450650 | 4,028,945 | 0.414981335 MON |
| `0xb5a3bc9877eb5178459c4c6553a36be8d5deb160d14d76fb317f5df06dab76a6` | B | 65690722 | 4,028,945 | 0.414981335 MON |
| `0x6a5c3c63f6c1d18051854360dc9e74f084cd17eefb4d9a46d8ae247ead6a6a7a` | C (canonical) | 65718037 | 4,028,945 | 0.414981335 MON |

### Primary sales (`buy`)

| Tx | Instance | Token | Gas | Evidence |
|---|---|---|---|---|
| `0x5c713170b5b04e29ecf343d6747ec6522f748b26eafebff9b8cf8b2247662d6b` | A | 1 | 92,537 | `Transfer(0x0 → buyer, 1)` |
| `0x7b8de3ae0e329052ae6f96a0f0abb5601345d7343bf13e990ac1199b932f63ca` | B | 1 | 92,537 | mint |
| `0x425d3f5d20740aa5a0c1c4d1454b23135fea73536b725659e3b01d89e57d686f` | B | 2 | 75,470 | mint (slot already warm) |
| `0xb4b31b3a54ba2ce1427190b1ac991f0431bb32b4e3cd7849eef39aee869fa1a9` | B | 3 | 75,470 | mint |

### Escrow and resale

| Tx | Instance | Call | Evidence |
|---|---|---|---|
| `0x882bd4cf895376d70cd03d8c048a1b4dd7ff7b313090692b31e0f826ca2aea25` | B | `listForSale(2, 0.01 MON)` | `Transfer(buyer → contract, 2)` — escrow entered; `ownerOf(2)` became the contract |
| `0xe16d08a4eaf8e550c12c8e1748fe93f60c51550dcd76efbb262b4c9081eeedc0` | A | `listForSale(1, 0.01 MON)` | escrow entered |
| `0x35b3bf1925f2646dc4a8a4a1062c00366bd38e6354de2f5fd5f121e6cf18253a` | A | `buyResale(1)` | `ownerOf(1)` → second buyer, listing cleared; contract balance `10500000000000000` = price + exactly 5% fee |

### Door rules

| Tx / call | Instance | Expected | Observed |
|---|---|---|---|
| `0xeb8f2a47c23ba6167d16856c6c82bf64fb585b2c5745f98014c05ccfb97ca0bb` | B | `checkIn(1)` succeeds | success; `isUsed(1) == true` |
| call | B | `buy()` after `eventStart` | revert `Sales closed` |
| call | B | second `checkIn(1)` | revert `Already checked in` |
| call | B | `checkIn(2)` while escrowed | revert `Ticket escrowed` |
| `0x54354ac5b57d09e51b7800f3e1b288ba615005b5f2d53364e764e22a87db2452` | B | `unlist(2)` returns the ticket | success; `ownerOf(2)` → seller |
| `0xf9526de591d78e8f3c0e418b1edd0bd92d6e55b9a600cec195b835ec1b421dd7` | B | `checkIn(2)` now succeeds | success |
| `0x05d4e7b7dcbabe4198823ef1fd673390f56f6d0facd9caeb4ee17fef4d19f002` | B | `withdraw()` sweeps the balance | success; contract balance 0 |

### Anti-scalping and the approval surface

| Call | Instance | Expected | Observed |
|---|---|---|---|
| `transferFrom(buyer, organizer, 1)` as owner | A | blocked | revert `TransferNotAllowed` (selector `0x8cd22d19`) |
| `approve(organizer, 1)` | A | succeeds, grants nothing | tx `0x8a84210fbe2c3a66ccf290e65581bc2e8d63a46213952c6425344263085daeff`, `getApproved(1)` set |
| `transferFrom` after that approval | A | still blocked | revert `TransferNotAllowed` |

Every `Transfer` event this contract can emit is one of three shapes — minted (`from = 0x0`), into
escrow (`to = contract`), or out of escrow (`from = contract`). A Transfer between two ordinary
addresses is impossible by construction, which is the anti-scalping guarantee visible as a log invariant.

## Reproduce any of it

```bash
ADDR=0xC443AC182f08EC2B86925B2b63a736D4f35ea3f0
cast call $ADDR "organizer()(address)"    --rpc-url https://testnet-rpc.monad.xyz
cast call $ADDR "officialPrice()(uint256)" --rpc-url https://testnet-rpc.monad.xyz
cast call $ADDR "ownerOf(uint256)(address)" 1 --rpc-url https://testnet-rpc.monad.xyz
cast call $ADDR "listings(uint256)(address,uint256)" 1 --rpc-url https://testnet-rpc.monad.xyz
cast call $ADDR "isUsed(uint256)(bool)" 1 --rpc-url https://testnet-rpc.monad.xyz
```

## Observed gas, for the write-up

At Monad testnet's ~100 gwei base fee, one state-changing transaction costs roughly 0.008–0.015 MON —
comparable to the 0.01 MON ticket price used in these demos. Deployment is 4,028,945 gas ≈ 0.415 MON.
A resale that pays the seller 0.0095 MON can therefore *cost the organizer more in gas than the sale
is worth* at this price point. The contract is fine; the demo economics are dominated by gas.

## Key hygiene

All development keys were exposed in plaintext during this work and must be treated as public:

- deployer / organizer of A and B — `0x48EC2A52bdc779226B7b144e6ae428b3524F6Df8` (**compromised**)
- secondary buyer — `0x8ba172A0BeC64fceB3B4Bde5E0f5A0C98B4e7E3e` (**compromised**)
- organizer of C — `0x036A247dce86Ec5A3E4644B3Ca756C520193E72B` (**also exposed after rotation**)

Anyone holding an organizer key can `withdraw()` instances that name it and `checkIn()` their tickets,
and `organizer` is immutable, so such instances cannot be re-pointed. Consequences are limited to
testnet funds and demo credibility.

For any real deployment: generate the organizer key in a secure environment, fund it only with what it
needs, never paste it into a chat, issue, commit, or log, and prefer a multisig as the organizer
address so custody can rotate without redeploying the contract.
