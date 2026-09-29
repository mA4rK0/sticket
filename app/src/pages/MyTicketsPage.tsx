import { useAccount } from "wagmi";
import { useMyTickets } from "../hooks/useTickets";
import { useEvent } from "../hooks/useEvent";
import { useEventActions } from "../hooks/useEventActions";
import { eventAddress } from "../lib/contracts";
import { monadTestnet } from "../lib/chain";
import { errorMessage } from "../lib/format";
import { TicketCard } from "../components/TicketCard";
import { EmptyState, ErrorState, Loading, SkeletonCard } from "../components/StateBlock";

/**
 * "My tickets".
 *
 * A listed ticket is owned by the contract, not by the wallet, so this page reads the
 * listing record to show the user what they still control. Ownership alone would make a
 * listed ticket appear to have vanished.
 */

export function MyTicketsPage() {
  const { address, isConnected } = useAccount();
  const event = useEvent(eventAddress);
  const mine = useMyTickets(eventAddress, address);
  const actions = useEventActions(eventAddress);

  if (!isConnected || !address) {
    return (
      <EmptyState title="Connect to see your tickets">
        <p className="hint">
          Tickets live in a wallet. Connect one, or log in with email if that option is available, and your
          tickets will be listed here.
        </p>
      </EmptyState>
    );
  }

  if (mine.isLoading || event.officialPrice === undefined) return <Loading label="Finding your tickets" />;

  if (mine.isError) {
    return (
      <ErrorState
        title="Could not read your tickets"
        message="The contract did not answer. Try again in a moment."
        onRetry={mine.refetch}
      />
    );
  }

  const ready = mine.held.filter((ticket) => !ticket.isUsed);
  const used = mine.held.filter((ticket) => ticket.isUsed);

  return (
    <div className="stack">
      <div className="stack--tight">
        <h1>My tickets</h1>
        <p className="lede">
          {mine.owned.length === 0
            ? "This wallet holds no tickets for this event yet."
            : `${mine.owned.length} ticket${mine.owned.length === 1 ? "" : "s"} for this event.`}
        </p>
      </div>

      {mine.truncated ? (
        <p className="notice notice--warn">
          This event has more tickets than this page scans in one pass, so the list may be incomplete. The
          check-in ledger and the explorer remain authoritative.
        </p>
      ) : null}

      {actions.error ? (
        <p className="notice notice--danger" role="alert">
          {errorMessage(actions.error)}
        </p>
      ) : null}

      {actions.isConfirmed ? (
        <p className="notice notice--ok" role="status">
          {actions.action === "list"
            ? "Listed. The contract now holds the ticket until it sells or you take it back."
            : actions.action === "unlist"
              ? "Taken back. The ticket is in your wallet again."
              : "Done."}
        </p>
      ) : null}

      {typeof actions.action === "string" && actions.isBusy ? (
        <p className="notice" role="status">
          {actions.actionLabel}. Confirm in your wallet if it asks.
        </p>
      ) : null}

      <section className="stack">
        <h2>Ready to use</h2>
        {ready.length === 0 ? (
          <EmptyState title="Nothing available for entry">
            <p className="hint">Tickets you have listed for resale, or already used, do not appear here.</p>
          </EmptyState>
        ) : (
          ready.map((ticket) => (
            <TicketCard
              key={ticket.tokenId.toString()}
              tokenId={ticket.tokenId}
              isUsed={false}
              isListed={false}
              listingPrice={0n}
              officialPrice={event.officialPrice!}
              chainId={monadTestnet.id}
              contractAddress={eventAddress}
              isBusy={actions.isBusy}
              onList={actions.listForSale}
              onUnlist={actions.unlist}
            />
          ))
        )}
      </section>

      {mine.listed.length > 0 ? (
        <section className="stack">
          <h2>Listed for resale</h2>
          {mine.listed.map((ticket) => (
            <TicketCard
              key={ticket.tokenId.toString()}
              tokenId={ticket.tokenId}
              isUsed={false}
              isListed
              listingPrice={ticket.listingPrice}
              officialPrice={event.officialPrice!}
              chainId={monadTestnet.id}
              contractAddress={eventAddress}
              isBusy={actions.isBusy}
              onList={actions.listForSale}
              onUnlist={actions.unlist}
            />
          ))}
        </section>
      ) : null}

      {used.length > 0 ? (
        <section className="stack">
          <h2>Already used</h2>
          {used.map((ticket) => (
            <div key={ticket.tokenId.toString()} className="card">
              <div className="row row--between">
                <h3>Ticket #{ticket.tokenId.toString()}</h3>
                <span className="badge">Checked in</span>
              </div>
              <p className="hint" style={{ marginTop: "0.4rem" }}>
                Kept as a record of the event. It cannot be resold or used again.
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {mine.owned.length === 0 ? (
        <div className="stack">
          <SkeletonCard />
        </div>
      ) : null}
    </div>
  );
}
