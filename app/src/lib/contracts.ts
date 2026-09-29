import { eventTicketsAbi } from "./abis/EventTickets";

/**
 * Contract wiring.
 *
 * Addresses come from the environment, never from hardcoded literals, so the same build
 * can target the canonical event, a scanner instance whose doors are already open, or a
 * fresh deployment, without touching source.
 *
 * Missing configuration fails loudly here rather than producing an empty UI later.
 */

function requiredAddress(value: string | undefined, name: string): `0x${string}` {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy app/.env.example to app/.env and fill it in, then restart the dev server.`,
    );
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`${name} is not a valid address: ${value}`);
  }
  return value as `0x${string}`;
}

/** The event tickets contract the buyer pages read from and write to. */
export const eventAddress = requiredAddress(import.meta.env.VITE_EVENT_ADDRESS, "VITE_EVENT_ADDRESS");

/**
 * The contract the scanner page uses.
 *
 * Check-in only works once `eventStart` has passed, so the scanner often points at a
 * different instance than the buyer pages. Defaults to the same one.
 */
export const scannerEventAddress = import.meta.env.VITE_SCANNER_EVENT_ADDRESS
  ? requiredAddress(import.meta.env.VITE_SCANNER_EVENT_ADDRESS, "VITE_SCANNER_EVENT_ADDRESS")
  : eventAddress;

export { eventTicketsAbi };

/** ERC-721 transfer event topic, used when the app needs to reason about transfers. */
export const transferEventTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as const;

/** The organizer fee on every resale, in basis points. Mirrors FEE_BPS in the contract. */
export const feeBps = 500;
