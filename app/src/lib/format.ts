import { formatEther } from "viem";

/** Formats a wei amount as a short, human amount of MON (max 4 decimals, no trailing zeros). */
export function formatMon(wei: bigint | undefined): string {
  if (wei === undefined) return "0";
  const asEther = Number(formatEther(wei));
  const rounded = Math.round(asEther * 10_000) / 10_000;
  return `${rounded} MON`;
}

/** Shortens an address for display: 0x1234...abcd */
export function shortAddress(address: string | undefined): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/** Formats a unix timestamp (seconds) as a local date and time. */
export function formatTimestamp(seconds: bigint | number | undefined): string {
  if (seconds === undefined) return "";
  const value = typeof seconds === "bigint" ? Number(seconds) : seconds;
  return new Date(value * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Formats a countdown in seconds as a compact duration, e.g. "2 days 4 hours". */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0 minutes";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) return `${days} day${days === 1 ? "" : "s"} ${hours} hour${hours === 1 ? "" : "s"}`;
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} min`;
  return `${Math.max(minutes, 1)} min`;
}

/** Reads an unknown thrown value into a message worth showing a user. */
export function errorMessage(error: unknown): string {
  if (!error) return "Something went wrong.";
  const raw = error instanceof Error ? error.message : String(error);

  if (/User rejected|User denied/i.test(raw)) return "Transaction rejected in the wallet.";
  if (/Insufficient funds/i.test(raw)) return "Not enough MON in the wallet to cover this transaction.";
  if (/eventStart|not started/i.test(raw)) return "This event has not started yet.";
  if (/Sales closed/i.test(raw)) return "Ticket sales are closed for this event.";
  if (/Already checked in/i.test(raw)) return "This ticket has already been checked in.";
  if (/Ticket escrowed/i.test(raw)) return "This ticket is listed for resale, so it cannot be checked in.";
  if (/TransferNotAllowed/i.test(raw)) return "Ticket transfers are disabled. Use the resale market.";
  if (/Above cap/i.test(raw)) return "That price is above the official price.";

  const firstLine = raw.split("\n")[0] ?? raw;
  return firstLine.length > 180 ? `${firstLine.slice(0, 177)}...` : firstLine;
}
