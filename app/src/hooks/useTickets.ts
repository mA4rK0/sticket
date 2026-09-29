import { useReadContract, useReadContracts } from "wagmi";
import { eventTicketsAbi } from "../lib/contracts";

/**
 * Ticket enumeration.
 *
 * ERC-721 without ERC721Enumerable cannot answer "which tokens does this address own",
 * and this contract is deployed and verified, so it cannot gain that extension. Two
 * honest options existed: scan Transfer logs from the deployment block, or read every
 * candidate id. We read ids 1..nextTicketId-1 in a single batched multicall, which is one
 * request and bounded by maxSupply (500 on the deployed instances).
 *
 * The cap below keeps a misconfigured or hostile event from issuing an unbounded batch.
 * Beyond this scale the correct move is an indexer or a log scan; see tasks/plan.md.
 */

const MAX_SCAN_IDS = 200;

export type TicketView = {
  tokenId: bigint;
  owner: `0x${string}`;
  isUsed: boolean;
  listingSeller: `0x${string}`;
  listingPrice: bigint;
  isListed: boolean;
};

type CallResult = { status: "success" | "failure"; result?: unknown } | undefined;

function read<T>(entry: CallResult): T | undefined {
  return entry?.status === "success" ? (entry.result as T) : undefined;
}

function useScannedTickets(address: `0x${string}`) {
  const { data: nextTicketId } = useReadContract({
    address,
    abi: eventTicketsAbi,
    functionName: "nextTicketId",
    query: { refetchInterval: 15_000 },
  });

  const minted = nextTicketId !== undefined ? Number(nextTicketId - 1n) : 0;
  const scanned = Math.min(minted, MAX_SCAN_IDS);
  const ids = Array.from({ length: scanned }, (_, index) => BigInt(index + 1));

  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: ids.flatMap((tokenId) => [
      { address, abi: eventTicketsAbi, functionName: "ownerOf", args: [tokenId] },
      { address, abi: eventTicketsAbi, functionName: "isUsed", args: [tokenId] },
      { address, abi: eventTicketsAbi, functionName: "listings", args: [tokenId] },
    ]),
    query: { enabled: scanned > 0, refetchInterval: 15_000 },
  });

  const tickets: TicketView[] = ids.flatMap((tokenId, index) => {
    const owner = read<`0x${string}`>(data?.[index * 3]);
    if (!owner) return [];
    const isUsed = read<boolean>(data?.[index * 3 + 1]) ?? false;
    const listing = read<[`0x${string}`, bigint]>(data?.[index * 3 + 2]);
    const listingSeller = listing?.[0] ?? "0x0000000000000000000000000000000000000000";
    const listingPrice = listing?.[1] ?? 0n;
    return [
      {
        tokenId,
        owner,
        isUsed,
        listingSeller,
        listingPrice,
        isListed: listingSeller !== "0x0000000000000000000000000000000000000000",
      },
    ];
  });

  return {
    tickets,
    minted,
    truncated: minted > scanned,
    isLoading: isLoading || nextTicketId === undefined,
    isError,
    refetch: () => {
      void refetch();
    },
  };
}

/** Tickets owned by one address, plus the ones it has listed and the contract now holds. */
export function useMyTickets(address: `0x${string}`, owner: `0x${string}` | undefined) {
  const scanned = useScannedTickets(address);

  const me = owner?.toLowerCase();
  const owned = me
    ? scanned.tickets.filter(
        (ticket) =>
          ticket.owner.toLowerCase() === me ||
          (ticket.isListed && ticket.listingSeller.toLowerCase() === me),
      )
    : [];

  const held = owned.filter((ticket) => !ticket.isListed);
  const listed = owned.filter((ticket) => ticket.isListed);

  return { ...scanned, owned, held, listed, escrowAddress: address };
}

/** Tickets currently offered for resale, with the contract holding them in escrow. */
export function useResaleMarket(address: `0x${string}`) {
  const scanned = useScannedTickets(address);

  const listings = scanned.tickets.filter((ticket) => ticket.isListed);

  return { ...scanned, listings };
}

/** The whole ledger, for the organizer view: totals rather than per-wallet filtering. */
export function useTicketLedger(address: `0x${string}`) {
  const scanned = useScannedTickets(address);

  const checkedIn = scanned.tickets.filter((ticket) => ticket.isUsed).length;
  const listed = scanned.tickets.filter((ticket) => ticket.isListed).length;

  return { ...scanned, checkedIn, listed };
}
