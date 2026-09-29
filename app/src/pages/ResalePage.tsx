import { useAccount } from "wagmi";
import { useResaleMarket } from "../hooks/useTickets";
import { useEvent } from "../hooks/useEvent";
import { useEventActions } from "../hooks/useEventActions";
import { eventAddress } from "../lib/contracts";
import { errorMessage, formatMon, shortAddress } from "../lib/format";
import { explorerAddressUrl } from "../lib/chain";
import { EmptyState, ErrorState, Loading } from "../components/StateBlock";

/**
 * The resale market: tickets the contract currently holds in escrow on behalf of sellers.
 *
 * Every listing is bought at its listed price, which the contract has already checked
 * against the official ceiling.
 */

export function ResalePage() {
  const { address, isConnected } = useAccount();
  const event = useEvent(eventAddress);
  const market = useResaleMarket(eventAddress);
  const actions = useEventActions(eventAddress);

  if (market.isLoading) return <Loading label="Reading the resale market" />;

  if (market.isError) {
    return (
      <ErrorState
        title="Could not read the resale market"
        message="The contract did not answer. Try again in a moment."
        onRetry={market.refetch}
      />
    );
  }

  const listings = market.listings.filter(
    (ticket) => ticket.listingSeller.toLowerCase() !== (address ?? "").toLowerCase(),
  );

  return (
    <div className="stack">
      <div className="stack--tight">
        <h1>Resale market</h1>
        <p className="lede">
          Tickets handed on by their holders. The seller sets a price at or below the official price, the
          contract holds the ticket until someone buys, and a 5% fee goes to the organizer.
        </p>
        {event.officialPrice !== undefined ? (
          <p className="hint">Official price for this event: {formatMon(event.officialPrice)}.</p>
        ) : null}
      </div>

      {actions.error ? (
        <p className="notice notice--danger" role="alert">
          {errorMessage(actions.error)}
        </p>
      ) : null}

      {actions.isConfirmed && actions.action === "buyResale" ? (
        <p className="notice notice--ok" role="status">
          Bought. The ticket is in your wallet, and the seller has been paid minus the organizer fee.
        </p>
      ) : null}

      {!event.salesOpen ? (
        <p className="notice notice--warn">
          Sales are closed for this event, so resale purchases are closed too. Listings can still be taken
          back by their sellers.
        </p>
      ) : null}

      {listings.length === 0 ? (
        <EmptyState title="No tickets are on the market">
          <p className="hint">
            When a holder lists a ticket it appears here. If you hold a ticket you cannot use, you can list it
            from the My tickets page.
          </p>
        </EmptyState>
      ) : (
        <div className="grid">
          {listings.map((listing) => (
            <article key={listing.tokenId.toString()} className="card stack--tight">
              <div className="row row--between">
                <h3>Ticket #{listing.tokenId.toString()}</h3>
                <span className="badge badge--ok">Available</span>
              </div>

              <div className="stat">
                <span className="label">Price</span>
                <span className="value">{formatMon(listing.listingPrice)}</span>
              </div>

              <p className="hint">
                Seller{" "}
                <a
                  href={explorerAddressUrl(listing.listingSeller)}
                  target="_blank"
                  rel="noreferrer"
                  className="mono"
                >
                  {shortAddress(listing.listingSeller)}
                </a>
              </p>

              <button
                type="button"
                className="button"
                disabled={!isConnected || !event.salesOpen || actions.isBusy}
                onClick={() => {
                  void actions.buyResale(listing.tokenId, listing.listingPrice).catch(() => {
                    /* surfaced above */
                  });
                }}
              >
                {actions.isBusy && actions.action === "buyResale"
                  ? "Buying"
                  : `Buy for ${formatMon(listing.listingPrice)}`}
              </button>

              {!isConnected ? <p className="hint">Connect a wallet to buy.</p> : null}
            </article>
          ))}
        </div>
      )}

      <section className="card card--quiet stack--tight">
        <h2 style={{ fontSize: "1.05rem" }}>What the ceiling does and does not do</h2>
        <p className="hint">
          The ceiling stops anyone from buying at the official price and selling above it. It does not stop
          profit on a discounted listing: a buyer can purchase below the official price and later resell at
          the ceiling. The rule bounds the price, not the outcome.
        </p>
      </section>
    </div>
  );
}
