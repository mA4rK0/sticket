import { useState } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { shortAddress } from "../lib/format";

/**
 * The email login control, split into its own module so that Privy's bundle is only
 * fetched when an App ID is configured.
 */
export default function PrivyWalletButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);

  if (!ready) {
    return (
      <button type="button" className="button" disabled>
        Loading
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button type="button" className="button" onClick={() => login()}>
        Log in
      </button>
    );
  }

  return (
    <div className="row">
      <span className="mono" title={address ?? undefined}>
        {address ? shortAddress(address) : (user?.email?.address ?? "Logged in")}
      </span>
      {address ? (
        <button
          type="button"
          className="button button--quiet"
          aria-label="Copy wallet address"
          onClick={() => {
            void navigator.clipboard.writeText(address).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1_500);
            });
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      ) : null}
      <button type="button" className="button button--secondary" onClick={() => logout()}>
        Log out
      </button>
    </div>
  );
}
