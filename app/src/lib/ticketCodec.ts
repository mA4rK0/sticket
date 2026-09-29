/**
 * The ticket code shown at the door.
 *
 * Format: stk:1:<chainId>:<contract>:<tokenId>
 *
 * The chain id and contract address are part of the code on purpose: a code from another
 * event, or from another network entirely, must be rejected before any contract call.
 */

const PREFIX = "stk";
const VERSION = "1";

export function buildTicketCode(chainId: number, contractAddress: string, tokenId: bigint): string {
  return `${PREFIX}:${VERSION}:${chainId}:${contractAddress}:${tokenId.toString()}`;
}

export type TicketCode = {
  chainId: number;
  contract: string;
  tokenId: bigint;
};

export function parseTicketCode(text: string): TicketCode | undefined {
  const parts = text.trim().split(":");
  if (parts.length !== 5) return undefined;
  if (parts[0] !== PREFIX || parts[1] !== VERSION) return undefined;

  const chainId = Number(parts[2]);
  const contract = parts[3];
  const rawTokenId = parts[4];

  if (!Number.isInteger(chainId) || chainId <= 0) return undefined;
  if (!contract || !/^0x[0-9a-fA-F]{40}$/.test(contract)) return undefined;
  if (!rawTokenId || !/^\d+$/.test(rawTokenId)) return undefined;

  return { chainId, contract, tokenId: BigInt(rawTokenId) };
}
