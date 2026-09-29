import { useAccount, useBalance, useReadContract } from "wagmi";
import { useEvent } from "../hooks/useEvent";
import { useTicketLedger } from "../hooks/useTickets";
import { useEventActions } from "../hooks/useEventActions";
import { eventAddress, eventTicketsAbi } from "../lib/contracts";
import { errorMessage, formatMon, formatTimestamp } from "../lib/format";
import { EmptyState, ErrorState, Loading } from "../components/StateBlock";

/**
 * Organizer dashboard: how the event is going, and the one privileged action available.
 *
 * The withdraw button is shown only to the address the contract names as organizer, and
 * the contract enforces that regardless of what this page decides to render.
 */
export function DashboardPage() {
  const { address, isConnected } = useAccount();
  const event = useEvent(eventAddress);
  const ledger = useTicketLedger(eventAddress);
  const contractBalance = useBalance({ address: eventAddress });
  const actions = useEventActions(eventAddress);

  const organizer = useReadContract({
    address: eventAddress,
    abi: eventTicketsAbi,
    functionName: "organizer",
  });

  const isOrganizer =
    Boolean(address) && Boolean(organizer.data) && address!.toLowerCase() === organizer.data!.toLowerCase();

  if (event.isLoading || ledger.isLoading) return <Loading label="Reading the event ledger" />;

  if (event.isError || event.officialPrice === undefined) {
    return (
      <ErrorState
        title="Could not read the event"
        message="The contract did not answer. Try again in a moment."
        onRetry={event.refetch}
      />
    );
  }

  if (!isConnected) {
    return (
      <EmptyState title="Connect the organizer wallet">
        <p className="hint">
          This page shows sales and check-in totals for the event, and lets the organizer collect the
          proceeds. Connect a wallet to continue.
        </p>
      </EmptyState>
    );
  }

  const collected = contractBalance.data?.value ?? 0n;

  return (
    <div className="stack">
      <div className="stack--tight">
        <h1>Organizer dashboard</h1>
        <p className="lede">
          {isOrganizer
            ? "This wallet is the organizer for this event."
            : "This wallet is not the organizer. Totals are visible to anyone, but the privileged actions are not available."}
        </p>
      </div>

      <section className="card">
        <div className="grid">
          <div className="stat">
            <span className="label">Tickets sold</span>
            <span className="value">{event.sold.toString()}</span>
          </div>
          <div className="stat">
            <span className="label">Remaining</span>
            <span className="value">
              {event.remaining.toString()} of {(event.maxSupply ?? 0n).toString()}
            </span>
          </div>
          <div className="stat">
            <span className="label">Checked in</span>
            <span className="value">{ledger.checkedIn.toString()}</span>
          </div>
          <div className="stat">
            <span className="label">On the resale market</span>
            <span className="value">{ledger.listed.toString()}</span>
          </div>
          <div className="stat">
            <span className="label">Held by the contract</span>
            <span className="value">{formatMon(collected)}</span>
            <span className="hint">Ticket sales plus resale fees</span>
          </div>
          <div className="stat">
            <span className="label">Sales window</span>
            <span className="value">
              {event.salesOpen ? "Open" : event.doorsOpen ? "Closed, doors open" : "Not started"}
            </span>
            <span className="hint">Event start {formatTimestamp(event.eventStart)}</span>
          </div>
        </div>
      </section>

      {ledger.truncated ? (
        <p className="notice notice--warn">
          This page scans the first 200 ticket ids in one pass, so the checked-in count may be short for very
          large events. The contract remains the source of truth.
        </p>
      ) : null}

      <section className="card stack--tight">
        <h2 style={{ fontSize: "1.05rem" }}>Proceeds</h2>
        {event.doorsOpen ? (
          <p className="hint">
            The contract allows the organizer to withdraw the full balance from the event start time onward.
          </p>
        ) : (
          <p className="hint">
            Nothing can be withdrawn yet. The contract holds the money until the event start time, which is
            the protection buyers get against a no-show.
          </p>
        )}

        {isOrganizer ? (
          <button
            type="button"
            className="button"
            disabled={!event.doorsOpen || actions.isBusy || collected === 0n}
            onClick={() => {
              void actions.withdraw().catch(() => {
                /* surfaced below */
              });
            }}
          >
            {actions.isBusy && actions.action === "withdraw"
              ? "Withdrawing"
              : `Withdraw ${formatMon(collected)}`}
          </button>
        ) : (
          <p className="hint">Only the organizer address can withdraw. Nothing here for this wallet.</p>
        )}

        {actions.error ? (
          <p className="notice notice--danger" role="alert">
            {errorMessage(actions.error)}
          </p>
        ) : null}

        {actions.isConfirmed && actions.action === "withdraw" ? (
          <p className="notice notice--ok" role="status">
            Withdrawn. The contract balance is now zero.
          </p>
        ) : null}
      </section>

      <section className="card card--quiet stack--tight">
        <h2 style={{ fontSize: "1.05rem" }}>Checking people in</h2>
        <p className="hint">
          Use the scanner page at the door. It reads the ticket from the holder's screen, confirms on-chain
          who owns it, and refuses tickets that are unknown, already used, or currently listed for resale.
        </p>
      </section>
    </div>
  );
}
