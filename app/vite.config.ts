import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  /*
   * Privy's bundle references these packages as optional peers, so they must resolve for
   * the bundler to find the named exports it expects. This app is EVM only and never runs
   * a Solana code path, so pre-bundling them would be wasted work.
   */
  optimizeDeps: {
    exclude: [
      "@solana/kit",
      "@solana-program/memo",
      "@solana-program/system",
      "@solana-program/token",
    ],
  },
});
