import { useBlock, useReadContracts } from "wagmi";
import { eventTicketsAbi } from "../lib/contracts";

/**
 * Reads the public state of one event contract.
 *
 * The sales window is judged against the chain's own clock (the latest block timestamp),
 * never the browser's: `eventStart` is what the contract compares against, so the UI must
 * use the same source or it can disagree with reality.
 */

type CallResult = { status: "success" | "failure"; result?: unknown } | undefined;

function read<T>(entry: CallResult): T | undefined {
  return entry?.status === "success" ? (entry.result as T) : undefined;
}

export type EventState = {
  name?: string;
  symbol?: string;
  officialPrice?: bigint;
  maxSupply?: bigint;
  nextTicketId?: bigint;
  eventStart?: bigint;
  sold: bigint;
  remaining: bigint;
  chainTime?: bigint;
  /** Sales are open before eventStart and closed at or after it. */
  salesOpen: boolean;
  /** Check-in and withdrawal are available at or after eventStart. */
  doorsOpen: boolean;
  secondsUntilStart: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

export function useEvent(address: `0x${string}`): EventState {
  const { data, isLoading, isError, refetch } = useReadContracts({
    contracts: [
      { address, abi: eventTicketsAbi, functionName: "name" },
      { address, abi: eventTicketsAbi, functionName: "symbol" },
      { address, abi: eventTicketsAbi, functionName: "officialPrice" },
      { address, abi: eventTicketsAbi, functionName: "maxSupply" },
      { address, abi: eventTicketsAbi, functionName: "nextTicketId" },
      { address, abi: eventTicketsAbi, functionName: "eventStart" },
    ],
    query: { refetchInterval: 15_000 },
  });

  const { data: block } = useBlock({
    query: { refetchInterval: 10_000 },
  });

  const name = read<string>(data?.[0]);
  const symbol = read<string>(data?.[1]);
  const officialPrice = read<bigint>(data?.[2]);
  const maxSupply = read<bigint>(data?.[3]);
  const nextTicketId = read<bigint>(data?.[4]);
  const eventStart = read<bigint>(data?.[5]);
  const chainTime = block?.timestamp;

  const sold = nextTicketId !== undefined ? nextTicketId - 1n : 0n;
  const remaining = maxSupply !== undefined ? maxSupply - sold : 0n;

  const salesOpen = chainTime !== undefined && eventStart !== undefined ? chainTime < eventStart : false;
  const doorsOpen = chainTime !== undefined && eventStart !== undefined ? chainTime >= eventStart : false;

  const secondsUntilStart =
    chainTime !== undefined && eventStart !== undefined && eventStart > chainTime
      ? Number(eventStart - chainTime)
      : 0;

  return {
    name,
    symbol,
    officialPrice,
    maxSupply,
    nextTicketId,
    eventStart,
    sold,
    remaining,
    chainTime,
    salesOpen,
    doorsOpen,
    secondsUntilStart,
    isLoading,
    isError,
    refetch: () => {
      void refetch();
    },
  };
}
