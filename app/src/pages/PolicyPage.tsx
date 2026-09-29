import { Link } from "react-router-dom";

/**
 * Policy pages.
 *
 * This app has no backend, no database, no accounts of its own and sets no cookies, so
 * several clauses a typical product needs simply do not apply here. What remains is
 * written plainly rather than padded with boilerplate.
 */

const operatorPlaceholder = "the Sticket student project team (contact details to be added before launch)";

const content = {
  terms: {
    title: "Terms of use",
    intro:
      "Sticket is a student project built for a hackathon, running on the Monad testnet. It exists to demonstrate that event tickets can be issued and resold under rules that a platform operator cannot quietly change.",
    sections: [
      {
        heading: "This is a demonstration, not a ticketing service",
        body: [
          "No ticket issued here grants entry to any real event. Tickets carry no monetary value, no refund rights, and no promise of admission.",
          "Payments are made in MON on a test network. Those tokens are obtained free from a faucet and have no market value.",
        ],
      },
      {
        heading: "What you are responsible for",
        body: [
          "You are responsible for the wallet you use. Nobody at Sticket can recover a wallet, reverse a transaction, or restore an access key.",
          "Transactions on a public blockchain are final. Once confirmed, a ticket purchase, a listing or a check-in cannot be undone.",
        ],
      },
      {
        heading: "Rules the contract enforces",
        body: [
          "A ticket can never be transferred directly between wallets. Every user-initiated transfer is rejected, which is what stops off-market scalping.",
          "A ticket can be resold only through the contract, at or below the official price. Each resale carries a 5% fee to the organizer.",
          "Once a ticket is checked in at the door it can never be resold.",
          "While a ticket is listed for resale the contract holds it, and it cannot be used for entry until the listing is withdrawn.",
        ],
      },
      {
        heading: "Powers the organizer keeps",
        body: [
          "The organizer can check tickets in and can withdraw the proceeds after the event start time. The organizer cannot move tickets between wallets, cannot change the official price, and cannot extend the sales window.",
        ],
      },
      {
        heading: "Operator",
        body: [`This demonstration is operated by ${operatorPlaceholder}.`],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro:
      "The short version: this application collects nothing about you. There is no server to send data to.",
    sections: [
      {
        heading: "No cookies, no tracking, no analytics",
        body: [
          "The app sets no cookies and includes no analytics, advertising or tracking scripts.",
          "Browser storage is used only to remember the wallet connection itself.",
        ],
      },
      {
        heading: "What is visible on the blockchain",
        body: [
          "Blockchain data is public by design. Your wallet address, the tickets it holds, listings, resale prices and check-in times are all readable by anyone, permanently.",
          "Nothing you do here should be assumed to be private. Do not use a wallet whose address you need to keep unlinked from your identity.",
        ],
      },
      {
        heading: "Email login",
        body: [
          "If email login is enabled, the address you type is handled by Privy, our authentication provider, which creates a wallet for you. Their privacy policy governs that data. Sticket stores no copy of it.",
        ],
      },
      {
        heading: "Deleting your data",
        body: [
          "There is nothing on a Sticket server to delete. On-chain records cannot be erased by anyone, including us. If you used email login, requests about that account go to Privy.",
        ],
      },
    ],
  },
  refund: {
    title: "Refund policy",
    intro:
      "Read this before buying: tickets bought through Sticket are not refundable through the contract. The contract cannot return money to a buyer.",
    sections: [
      {
        heading: "Why there are no refunds",
        body: [
          "The contract has no function that pays a buyer back. Money collected from ticket sales sits in the contract until the organizer withdraws it after the event start time. There is no path in the code that sends it to a ticket holder.",
          "This is a deliberate limitation of the demonstration version, published here rather than left to be discovered.",
        ],
      },
      {
        heading: "Your exit is resale",
        body: [
          "If you cannot attend, you can list the ticket for resale at or below the official price and sell it to someone else. A 5% fee goes to the organizer and the remainder goes to you.",
          "Selling at the official price means recovering less than you paid, because of that fee. Resale is a way to limit a loss, not a way to break even.",
          "Listings can be withdrawn at any time before they sell, which returns the ticket to your wallet.",
        ],
      },
      {
        heading: "If the event is cancelled",
        body: [
          "A cancellation has no automatic effect on the contract. Buyers have no on-chain claim, because the contract holds no obligation to refund. This is stated clearly so that nobody buys under a mistaken assumption.",
        ],
      },
      {
        heading: "Test network",
        body: [
          "On Monad testnet the money involved is faucet currency with no market value, so these limitations cost nothing real. They would need to be addressed before any deployment involving actual payments.",
        ],
      },
    ],
  },
} as const;

export type PolicyKind = keyof typeof content;

export function PolicyPage({ kind }: { kind: PolicyKind }) {
  const page = content[kind];

  return (
    <article className="stack" style={{ maxWidth: "46rem" }}>
      <div className="stack--tight">
        <h1>{page.title}</h1>
        <p className="lede">{page.intro}</p>
      </div>

      {page.sections.map((section) => (
        <section key={section.heading} className="stack--tight">
          <h2>{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}

      <hr />
      <p className="hint">
        See also the <Link to="/terms">terms of use</Link>, the <Link to="/privacy">privacy policy</Link> and
        the <Link to="/refund">refund policy</Link>.
      </p>
    </article>
  );
}
