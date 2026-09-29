import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { eventTicketsAbi } from "../lib/contracts";

/**
 * Every state-changing call the app can make, in one place.
 *
 * Each action sets a label so the UI can say what is happening, and all of them share a
 * single wagmi write so pending, confirming, error and success state stay consistent.
 */

export type ActionName = "buy" | "list" | "unlist" | "buyResale" | "checkIn" | "withdraw";

const actionLabels: Record<ActionName, string> = {
  buy: "Buying a ticket",
  list: "Listing for resale",
  unlist: "Taking the ticket back",
  buyResale: "Buying from the resale market",
  checkIn: "Checking the ticket in",
  withdraw: "Withdrawing the proceeds",
};

export function useEventActions(address: `0x${string}`) {
  const { writeContractAsync, data: hash, isPending, error, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const [action, setAction] = useState<ActionName | null>(null);
  const queryClient = useQueryClient();

  /*
   * Reads poll every 15 seconds, which is fine while idle but wrong right after the user
   * acts: a confirmed transaction should be visible immediately, not up to 15 seconds
   * later. Invalidating the cache once the receipt lands makes every dependent read
   * refetch at once.
   */
  useEffect(() => {
    if (receipt.isSuccess) void queryClient.invalidateQueries();
  }, [receipt.isSuccess, receipt.data?.transactionHash, queryClient]);

  async function buy(price: bigint) {
    setAction("buy");
    await writeContractAsync({ address, abi: eventTicketsAbi, functionName: "buy", value: price });
  }

  async function listForSale(tokenId: bigint, price: bigint) {
    setAction("list");
    await writeContractAsync({
      address,
      abi: eventTicketsAbi,
      functionName: "listForSale",
      args: [tokenId, price],
    });
  }

  async function unlist(tokenId: bigint) {
    setAction("unlist");
    await writeContractAsync({ address, abi: eventTicketsAbi, functionName: "unlist", args: [tokenId] });
  }

  async function buyResale(tokenId: bigint, price: bigint) {
    setAction("buyResale");
    await writeContractAsync({
      address,
      abi: eventTicketsAbi,
      functionName: "buyResale",
      args: [tokenId],
      value: price,
    });
  }

  async function checkIn(tokenId: bigint) {
    setAction("checkIn");
    await writeContractAsync({ address, abi: eventTicketsAbi, functionName: "checkIn", args: [tokenId] });
  }

  async function withdraw() {
    setAction("withdraw");
    await writeContractAsync({ address, abi: eventTicketsAbi, functionName: "withdraw" });
  }

  return {
    buy,
    listForSale,
    unlist,
    buyResale,
    checkIn,
    withdraw,
    action,
    actionLabel: action ? actionLabels[action] : undefined,
    hash,
    isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    isBusy: isPending || receipt.isLoading,
    error,
    reset,
  };
}
