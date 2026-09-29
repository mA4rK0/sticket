import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { hasPrivy, wagmiConfig } from "./lib/wagmi";
import App from "./App";
import "./index.css";

/**
 * Entry point.
 *
 * The app shell is provider agnostic. When an App ID is present, Privy's wrapper (which
 * brings its own wagmi config and embedded wallets) is imported dynamically after the
 * first paint; otherwise the plain injected-wallet config is used and Privy is never
 * fetched.
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 1 },
  },
});

const app = (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>
);

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);

  if (hasPrivy) {
    void import("./providers/PrivyRoot").then(({ default: PrivyRoot }) => {
      root.render(
        <StrictMode>
          <PrivyRoot>{app}</PrivyRoot>
        </StrictMode>,
      );
    });
  } else {
    root.render(
      <StrictMode>
        <WagmiProvider config={wagmiConfig}>{app}</WagmiProvider>
      </StrictMode>,
    );
  }
}
