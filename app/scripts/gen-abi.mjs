// Generates app/src/lib/abis/EventTickets.ts from the Foundry build artifact.
//
// The frontend never hand-copies a contract interface: this script reads the compiled
// artifact and emits a typed `as const` array, which is what wagmi needs for inference.
//
// Requires `forge build` to have run in ../contracts first.
// Regenerate with: npm run gen:abi

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const artifactPath = resolve(here, "../../contracts/out/EventTickets.sol/EventTickets.json");
const outPath = resolve(here, "../src/lib/abis/EventTickets.ts");

let artifact;
try {
  artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
} catch (error) {
  console.error(`Could not read the Foundry artifact at:\n  ${artifactPath}\n`);
  console.error("Run `forge build` inside contracts/ first, then retry.");
  throw error;
}

if (!Array.isArray(artifact.abi)) {
  throw new Error(`Artifact has no abi array: ${artifactPath}`);
}

const banner = [
  "// GENERATED FILE - do not edit by hand.",
  "// Source: contracts/out/EventTickets.sol/EventTickets.json",
  "// Regenerate with: npm run gen:abi",
  "",
  "",
].join("\n");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${banner}export const eventTicketsAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`);

const writeFns = artifact.abi.filter((entry) => entry.type === "function" && entry.stateMutability !== "view");
const readFns = artifact.abi.filter((entry) => entry.type === "function" && entry.stateMutability === "view");

console.log(`wrote ${outPath}`);
console.log(`  ${artifact.abi.length} ABI entries: ${writeFns.length} state changing, ${readFns.length} read only`);
