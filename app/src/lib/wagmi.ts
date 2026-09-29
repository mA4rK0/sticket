import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "./chain";

/**
 * Wallet configuration for the default path: any injected browser wallet.
 *
 * The Privy binding lives in src/providers/PrivyRoot.tsx and is loaded on demand, so an
 * app running without an App ID never downloads Privy's bundle. See hasPrivy below.
 */

export const privyAppId = import.meta.env.VITE_PRIVY_APP_ID?.trim() || undefined;
export const hasPrivy = Boolean(privyAppId);

const rpcUrl = monadTestnet.rpcUrls.default.http[0];

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: { [monadTestnet.id]: http(rpcUrl) },
  ssr: false,
});
