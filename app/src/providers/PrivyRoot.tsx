import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { PrivyProvider } from "@privy-io/react-auth";
import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { monadTestnet } from "../lib/chain";
import { privyAppId } from "../lib/wagmi";

/**
 * Privy wrapper, loaded only when VITE_PRIVY_APP_ID is set.
 *
 * Privy supports arbitrary EVM chains, configured here rather than in the dashboard: the
 * chain is declared with the same definition used everywhere else, and Privy treats it as
 * the default and the only supported network. A custom chain gets no gas sponsorship, so
 * an embedded wallet starts empty and must be funded before it can pay for anything.
 */

const privyWagmiConfig = createConfig({
  chains: [monadTestnet],
  transports: { [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0]) },
  ssr: false,
});

export default function PrivyRoot({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={privyAppId!}
      config={{
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        loginMethods: ["email"],
        appearance: {
          theme: "light",
          accentColor: "#0e4f4a",
          landingHeader: "Log in to Sticket",
          loginMessage: "Your ticket wallet is created for you. No seed phrase to write down.",
        },
      }}
    >
      <WagmiProvider config={privyWagmiConfig}>{children}</WagmiProvider>
    </PrivyProvider>
  );
}
