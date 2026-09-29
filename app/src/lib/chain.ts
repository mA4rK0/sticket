import { defineChain } from "viem";

/**
 * Monad testnet.
 *
 * Defined here rather than imported from viem's chain list so the RPC endpoint comes
 * from configuration: a judge or a deployment can point this at any endpoint without a
 * code change.
 */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: { name: "Monadscan", url: "https://testnet.monadscan.com" },
  },
  testnet: true,
});

export const explorerUrl = monadTestnet.blockExplorers.default.url;

export function explorerAddressUrl(address: string): string {
  return `${explorerUrl}/address/${address}`;
}

export function explorerTxUrl(hash: string): string {
  return `${explorerUrl}/tx/${hash}`;
}
