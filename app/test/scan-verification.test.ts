import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTicketCode, parseTicketCode } from "../src/lib/ticketCodec.ts";
import { verifyScannedTicket } from "../src/lib/scanVerification.ts";
import type { TicketReads } from "../src/lib/scanVerification.ts";

const CHAIN = 10143;
const CONTRACT = "0xB462AFdB02F46f011e9De4AcCBF117F30803b28b";
const HOLDER = "0x8ba172A0BeC64fceB3B4Bde5E0f5A0C98B4e7E3e";

function readsReturning(partial: Partial<TicketReads>): TicketReads {
  return {
    ownerOf: async () => HOLDER,
    isUsed: async () => false,
    ...partial,
  };
}

test("a code built by the app parses back to the same values", () => {
  const code = buildTicketCode(CHAIN, CONTRACT, 7n);
  assert.deepEqual(parseTicketCode(code), { chainId: CHAIN, contract: CONTRACT, tokenId: 7n });
});

test("malformed and tampered codes are rejected by the parser", () => {
  assert.equal(parseTicketCode("hello"), undefined, "plain text");
  assert.equal(parseTicketCode("stk:1:10143:" + CONTRACT), undefined, "missing token id");
  assert.equal(parseTicketCode("stk:1:0:" + CONTRACT + ":1"), undefined, "zero chain id");
  assert.equal(parseTicketCode("stk:1:10143:0xabc:1"), undefined, "short address");
  assert.equal(parseTicketCode(`stk:1:10143:${CONTRACT}:1.5`), undefined, "non integer token id");
  assert.equal(parseTicketCode(`stk:1:10143:${CONTRACT}:-1`), undefined, "negative token id");
});

test("a code from another network is refused before any contract call", async () => {
  const verdict = await verifyScannedTicket({
    text: buildTicketCode(1, CONTRACT, 1n),
    expectedChainId: CHAIN,
    expectedContract: CONTRACT,
    reads: readsReturning({}),
  });
  assert.equal(verdict.kind, "reject");
  assert.match(verdict.kind === "reject" ? verdict.reason : "", /different network/);
});

test("a code for another event is refused", async () => {
  const verdict = await verifyScannedTicket({
    text: buildTicketCode(CHAIN, "0x080266e2e193Afe65f72099E1cB804A4202D0fc8", 1n),
    expectedChainId: CHAIN,
    expectedContract: CONTRACT,
    reads: readsReturning({}),
  });
  assert.equal(verdict.kind, "reject");
  assert.match(verdict.kind === "reject" ? verdict.reason : "", /different event/);
});

test("an id that was never minted is refused, because existence is checked first", async () => {
  const verdict = await verifyScannedTicket({
    text: buildTicketCode(CHAIN, CONTRACT, 999n),
    expectedChainId: CHAIN,
    expectedContract: CONTRACT,
    reads: readsReturning({
      ownerOf: async () => {
        throw new Error("ERC721NonexistentToken");
      },
      isUsed: async () => false,
    }),
  });
  assert.equal(verdict.kind, "reject");
  assert.match(verdict.kind === "reject" ? verdict.reason : "", /has ever been issued/);
});

test("a ticket already checked in is refused, and the owner is reported", async () => {
  const verdict = await verifyScannedTicket({
    text: buildTicketCode(CHAIN, CONTRACT, 3n),
    expectedChainId: CHAIN,
    expectedContract: CONTRACT,
    reads: readsReturning({ isUsed: async () => true }),
  });
  assert.equal(verdict.kind, "reject");
  if (verdict.kind === "reject") {
    assert.match(verdict.reason, /already been checked in/);
    assert.equal(verdict.owner, HOLDER);
  }
});

test("a ticket held in escrow by a resale listing is refused", async () => {
  const verdict = await verifyScannedTicket({
    text: buildTicketCode(CHAIN, CONTRACT, 2n),
    expectedChainId: CHAIN,
    expectedContract: CONTRACT,
    reads: readsReturning({ ownerOf: async () => CONTRACT }),
  });
  assert.equal(verdict.kind, "reject");
  assert.match(verdict.kind === "reject" ? verdict.reason : "", /listed for resale/);
});

test("a live ticket is accepted, and its owner comes from the chain", async () => {
  const verdict = await verifyScannedTicket({
    text: buildTicketCode(CHAIN, CONTRACT, 1n),
    expectedChainId: CHAIN,
    expectedContract: CONTRACT,
    reads: readsReturning({}),
  });
  assert.equal(verdict.kind, "ok");
  if (verdict.kind === "ok") {
    assert.equal(verdict.tokenId, 1n);
    assert.equal(verdict.owner, HOLDER);
  }
});

test("the contract address comparison is case insensitive", async () => {
  const verdict = await verifyScannedTicket({
    text: buildTicketCode(CHAIN, CONTRACT.toLowerCase(), 1n),
    expectedChainId: CHAIN,
    expectedContract: CONTRACT.toUpperCase().replace("0X", "0x"),
    reads: readsReturning({}),
  });
  assert.equal(verdict.kind, "ok");
});
