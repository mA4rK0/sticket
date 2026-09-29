import { useAccount, useBalance } from "wagmi";
import { useEvent } from "../hooks/useEvent";
import { useEventActions } from "../hooks/useEventActions";
import { eventAddress } from "../lib/contracts";
import { explorerAddressUrl, monadTestnet } from "../lib/chain";
import { errorMessage, formatDuration, formatMon, formatTimestamp } from "../lib/format";
import { EmptyState, ErrorState, Loading } from "../components/StateBlock";

/**
 * The event page: what the event is, what it costs, how many tickets remain, and the buy
 * action. Every number shown is read from the chain, and the sales window is judged
 * against the chain's own clock.
 */
export function EventPage() {
  const event = useEvent(eventAddress);
  const { address, isConnected, chain } = useAccount();
  const balance = useBalance({ address, query: { enabled: Boolean(address) } });
  const actions = useEventActions(eventAddress);

  const onWrongChain = Boolean(chain) && chain!.id !== monadTestnet.id;

  if (event.isLoading) return <Loading label="Reading the event from Monad testnet" />;

  if (event.isError || event.officialPrice === undefined) {
    return (
      <ErrorState
        title="Could not read this event"
        message="The contract did not answer. Check the RPC endpoint and the contract address, then try again."
        onRetry={event.refetch}
      />
    );
  }

  const soldOut = event.remaining <= 0n;
  const notEnoughMon = balance.data !== undefined && balance.data.value < event.officialPrice;
  const canBuy =
    event.salesOpen && !soldOut && isConnected && !onWrongChain && !notEnoughMon && !actions.isBusy;

  return (
    <div className="stack">
      <section className="stack--tight">
        <div className="row row--between">
          <h1>{event.name ?? "Event"}</h1>
          {event.salesOpen ? (
            <span className="badge badge--ok">Sales open</span>
          ) : event.doorsOpen ? (
            <span className="badge badge--warn">Sales closed</span>
          ) : (
            <span className="badge">Not started</span>
          )}
        </div>
        <p className="lede">
          Residents of this contract hold their ticket until they sell it through the capped resale
          market. No wallet can transfer a ticket directly to another wallet, and no ticket can be sold
          above the official price.
        </p>
        <p className="hint">
          Contract{" "}
          <a href={explorerAddressUrl(eventAddress)} target="_blank" rel="noreferrer" className="mono">
            {eventAddress}
          </a>
        </p>
      </section>

      <section className="card stack">
        <div className="grid">
          <div className="stat">
            <span className="label">Official price</span>
            <span className="value">{formatMon(event.officialPrice)}</span>
          </div>
          <div className="stat">
            <span className="label">Tickets remaining</span>
            <span className="value">
              {event.remaining.toString()} of {(event.maxSupply ?? 0n).toString()}
            </span>
          </div>
          <div className="stat">
            <span className="label">Sold</span>
            <span className="value">{event.sold.toString()}</span>
          </div>
          <div className="stat">
            <span className="label">{event.salesOpen ? "Sales close" : "Event start"}</span>
            <span className="value">{formatTimestamp(event.eventStart)}</span>
            {event.salesOpen ? (
              <span className="hint">in {formatDuration(event.secondsUntilStart)}</span>
            ) : null}
          </div>
        </div>

        <hr />

        {!event.salesOpen ? (
          <p className="notice notice--warn">
            Sales are closed for this event. {event.doorsOpen ? "The doors are open: take a ticket to the scanner." : ""}
          </p>
        ) : soldOut ? (
          <p className="notice notice--warn">Every ticket has been sold. Look at the resale market for a ticket someone else is passing on.</p>
        ) : null}

        <div className="row row--between">
          <div className="stack--tight">
            {isConnected ? (
              <span className="hint">
                Wallet balance: {formatMon(balance.data?.value)} on {monadTestnet.name}
              </span>
            ) : (
              <span className="hint">Connect a wallet or log in to buy a ticket.</span>
            )}
            {notEnoughMon ? (
              <span className="hint">
                This wallet needs at least {formatMon(event.officialPrice)} plus a little extra for the
                network fee.
              </span>
            ) : null}
          </div>

          <button
            type="button"
            className="button"
            disabled={!canBuy}
            onClick={() => {
              void actions.buy(event.officialPrice!).catch(() => {
                /* surfaced below from actions.error */
              });
            }}
          >
            {actions.isBusy && actions.action === "buy"
              ? "Buying"
              : `Buy a ticket for ${formatMon(event.officialPrice)}`}
          </button>
        </div>

        {actions.error ? (
          <p className="notice notice--danger" role="alert">
            {errorMessage(actions.error)}
          </p>
        ) : null}

        {actions.isConfirmed && actions.action === "buy" ? (
          <p className="notice notice--ok" role="status">
            Ticket bought. It is now in your wallet, and it will appear under My tickets.
          </p>
        ) : null}
      </section>

      <section className="stack--tight">
        <h2>How resale works here</h2>
        <p>
          A holder who cannot attend lists the ticket at or below the official price and the contract takes
          it into escrow. A buyer pays the listed price, the seller receives it minus a 5% fee, and the
          ticket moves to the buyer. The price ceiling follows the ticket, not the buyer, so it never rises
          on later sales.
        </p>
        <p className="hint">
          One honest caveat: the ceiling bounds the price, not profit. A buyer who purchases a discounted
          listing can resell at the official price and come out ahead. The rules stop buying at face value
          and selling above it, nothing more.
        </p>
      </section>

      {event.remaining <= 0n && event.sold > 0n ? (
        <EmptyState title="Nothing left at the official price">
          <p>
            Every ticket has been issued. The <a href="/resale">resale market</a> is where tickets change
            hands from here.
          </p>
        </EmptyState>
      ) : null}

      <section className="card card--quiet stack--tight">
        <h2 style={{ fontSize: "1.05rem" }}>Try the rules yourself</h2>
        <p className="hint">
          Open the contract on the explorer and call <span className="mono">transferFrom</span> as the ticket
          owner. It reverts with <span className="mono">TransferNotAllowed</span> every time, because direct
          transfers are disabled.
        </p>
      </section>
    </div>
  );
}
