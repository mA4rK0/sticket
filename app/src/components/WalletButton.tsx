import { Suspense, lazy, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { hasPrivy } from "../lib/wagmi";
import { monadTestnet } from "../lib/chain";
import { shortAddress } from "../lib/format";

/**
 * Wallet control in the header.
 *
 * With an App ID configured, the primary action is Privy's email login and the module
 * holding that button is fetched on demand. Without one, an injected browser wallet is the
 * path and Privy is never downloaded. Both end up in the same wagmi context, so no other
 * component needs to know which is active.
 */

const PrivyWalletButton = lazy(() => import("./PrivyWalletButton"));

function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  return (
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
  );
}

function NetworkGuard() {
  const { chain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!chain || chain.id === monadTestnet.id) return null;

  return (
    <div className="notice notice--warn" role="status">
      <span>This wallet is on {chain.name ?? `chain ${chain.id}`}. Sticket runs on Monad testnet.</span>
      <button
        type="button"
        className="button button--secondary"
        style={{ marginInlineStart: "0.6rem" }}
        disabled={isPending}
        onClick={() => switchChain({ chainId: monadTestnet.id })}
      >
        {isPending ? "Switching" : "Switch network"}
      </button>
    </div>
  );
}

function InjectedWalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showChoices, setShowChoices] = useState(false);

  if (isConnected && address) {
    return (
      <div className="row">
        <span className="mono" title={address}>
          {shortAddress(address)}
        </span>
        <CopyAddressButton address={address} />
        <button type="button" className="button button--secondary" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  if (connectors.length <= 1) {
    return (
      <button
        type="button"
        className="button"
        disabled={isPending || connectors.length === 0}
        onClick={() => {
          const connector = connectors[0];
          if (connector) connect({ connector });
        }}
      >
        {isPending ? "Connecting" : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="row">
      {showChoices ? null : (
        <button type="button" className="button" onClick={() => setShowChoices(true)}>
          Connect wallet
        </button>
      )}
      {showChoices
        ? connectors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              className="button button--secondary"
              disabled={isPending}
              onClick={() => {
                connect({ connector });
                setShowChoices(false);
              }}
            >
              {connector.name}
            </button>
          ))
        : null}
    </div>
  );
}

export function WalletButton() {
  if (!hasPrivy) return <InjectedWalletButton />;

  return (
    <Suspense
      fallback={
        <button type="button" className="button" disabled>
          Loading
        </button>
      }
    >
      <PrivyWalletButton />
    </Suspense>
  );
}

export { NetworkGuard };
