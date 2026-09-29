import { parseTicketCode } from "./ticketCodec.ts";

/**
 * The door rules, separated from the camera and from the wallet.
 *
 * The verification order is the whole point of this module, and it is covered by unit
 * tests in test/scan-verification.test.ts:
 *
 *   1. the code must be a well formed Sticket code
 *   2. it must belong to this chain and this event
 *   3. the ticket must exist: ownerOf reverts for an id that was never minted, and isUsed
 *      would happily answer false for such an id, so existence has to be established first
 *   4. it must not already be checked in
 *   5. it must not be held in escrow by a resale listing, because then the person holding
 *      the screen is not the ticket's owner
 *
 * The contract re-checks every one of these on its own, so this is the friendly layer, not
 * the security layer.
 */

export type TicketReads = {
  ownerOf: (tokenId: bigint) => Promise<string>;
  isUsed: (tokenId: bigint) => Promise<boolean>;
};

export type ScanVerdict =
  | { kind: "ok"; tokenId: bigint; owner: string }
  | { kind: "reject"; reason: string; tokenId?: bigint; owner?: string };

export async function verifyScannedTicket(params: {
  text: string;
  expectedChainId: number;
  expectedContract: string;
  reads: TicketReads;
}): Promise<ScanVerdict> {
  const { text, expectedChainId, expectedContract, reads } = params;

  const code = parseTicketCode(text);
  if (!code) {
    return { kind: "reject", reason: "That is not a Sticket ticket code." };
  }
  if (code.chainId !== expectedChainId) {
    return { kind: "reject", reason: "That ticket belongs to a different network." };
  }
  if (code.contract.toLowerCase() !== expectedContract.toLowerCase()) {
    return { kind: "reject", reason: "That ticket belongs to a different event." };
  }

  let owner: string;
  try {
    owner = await reads.ownerOf(code.tokenId);
  } catch {
    return {
      kind: "reject",
      tokenId: code.tokenId,
      reason: "No ticket with that number has ever been issued for this event.",
    };
  }

  const used = await reads.isUsed(code.tokenId);
  if (used) {
    return {
      kind: "reject",
      tokenId: code.tokenId,
      owner,
      reason: "This ticket has already been checked in.",
    };
  }

  if (owner.toLowerCase() === expectedContract.toLowerCase()) {
    return {
      kind: "reject",
      tokenId: code.tokenId,
      reason: "This ticket is listed for resale, so it is held by the contract and cannot be used.",
    };
  }

  return { kind: "ok", tokenId: code.tokenId, owner };
}
