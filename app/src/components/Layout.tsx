import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { WalletButton, NetworkGuard } from "./WalletButton";

/**
 * Page chrome: skip link, header with navigation and wallet state, footer with the policy
 * links a consumer product is expected to publish.
 */

const navigation = [
  { to: "/", label: "Event", end: true },
  { to: "/tickets", label: "My tickets", end: false },
  { to: "/resale", label: "Resale", end: false },
  { to: "/dashboard", label: "Dashboard", end: false },
  { to: "/scanner", label: "Scanner", end: false },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="site-header">
        <div className="site-header__inner">
          <NavLink to="/" className="brand">
            <span className="brand__name">Sticket</span>
            <span className="brand__tagline">Tickets that stay with their owner</span>
          </NavLink>

          <nav className="nav" aria-label="Main">
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <WalletButton />
        </div>
      </header>

      <main id="main" className="page">
        <NetworkGuard />
        {children}
      </main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <span>
            Sticket, a student-built demonstration on Monad testnet. No ticket sold here is valid for
            entry to anything, and no payment is taken in real currency.
          </span>
          <span className="site-footer__links">
            <NavLink to="/terms">Terms</NavLink>
            <NavLink to="/privacy">Privacy</NavLink>
            <NavLink to="/refund">Refunds</NavLink>
          </span>
        </div>
      </footer>
    </div>
  );
}
