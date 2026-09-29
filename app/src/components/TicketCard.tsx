import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { parseEther } from "viem";
import { formatMon } from "../lib/format";
import { buildTicketCode } from "../lib/ticketCodec";

/**
 * One ticket, with the QR payload the scanner reads and the resale controls.
 * The code format itself lives in lib/ticketCodec.ts so the scanner and the ticket display
 * cannot drift apart.
 */

export type TicketCardProps = {
  tokenId: bigint;
  isUsed: boolean;
  isListed: boolean;
  listingPrice: bigint;
  officialPrice: bigint;
  chainId: number;
  contractAddress: string;
  isBusy: boolean;
  onList: (tokenId: bigint, price: bigint) => Promise<void>;
  onUnlist: (tokenId: bigint) => Promise<void>;
};

export function TicketCard({
  tokenId,
  isUsed,
  isListed,
  listingPrice,
  officialPrice,
  chainId,
  contractAddress,
  isBusy,
  onList,
  onUnlist,
}: TicketCardProps) {
  const [priceText, setPriceText] = useState("");
  const [inputError, setInputError] = useState<string | undefined>();

  const payload = buildTicketCode(chainId, contractAddress, tokenId);
  const status = isUsed ? "Checked in" : isListed ? "Listed for resale" : "Ready to use";

  return (
    <article className="card ticket">
      <div className="row row--between">
        <h3>Ticket #{tokenId.toString()}</h3>
        <span className={isUsed ? "badge" : isListed ? "badge badge--warn" : "badge badge--ok"}>{status}</span>
      </div>

      <div className="row" style={{ alignItems: "flex-start", gap: "1.25rem" }}>
        <div className="ticket__qr">
          <QRCodeSVG value={payload} size={148} level="M" bgColor="#ffffff" fgColor="#1b1a1f" />
        </div>

        <div className="ticket__meta" style={{ flex: 1, minWidth: "14rem" }}>
          <p className="hint">Show this code at the door. Admission is verified against the chain, so a forwarded copy will not admit anyone else.</p>

          {isUsed ? (
            <p className="notice">This ticket has been checked in and cannot be resold.</p>
          ) : isListed ? (
            <>
              <p className="notice notice--warn">
                Listed at {formatMon(listingPrice)}. While it is listed the contract holds the ticket, so it
                cannot be used for entry. Take it back to use it yourself.
              </p>
              <button
                type="button"
                className="button button--secondary"
                disabled={isBusy}
                onClick={() => {
                  void onUnlist(tokenId).catch(() => {
                    /* the page surfaces the error */
                  });
                }}
              >
                Take it back
              </button>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor={`price-${tokenId}`}>
                  Resale price, at or below {formatMon(officialPrice)}
                </label>
                <input
                  id={`price-${tokenId}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.0001"
                  placeholder={formatMon(officialPrice).replace(" MON", "")}
                  value={priceText}
                  onChange={(event) => {
                    setPriceText(event.target.value);
                    setInputError(undefined);
                  }}
                />
              </div>
              {inputError ? <p className="notice notice--danger">{inputError}</p> : null}
              <button
                type="button"
                className="button"
                disabled={isBusy}
                onClick={() => {
                  let price: bigint;
                  try {
                    price = parseEther(priceText.trim() === "" ? "0" : priceText.trim());
                  } catch {
                    setInputError("Enter the price as a number, for example 0.01.");
                    return;
                  }
                  if (price <= 0n) {
                    setInputError("The price has to be greater than zero.");
                    return;
                  }
                  if (price > officialPrice) {
                    setInputError(`The contract refuses any price above ${formatMon(officialPrice)}.`);
                    return;
                  }
                  void onList(tokenId, price).catch(() => {
                    /* the page surfaces the error */
                  });
                }}
              >
                List for resale
              </button>
              <p className="hint">
                The contract takes the ticket into escrow when you list it. A 5% fee goes to the organizer on
                any sale.
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
