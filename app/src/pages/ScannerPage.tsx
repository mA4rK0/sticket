import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { useEventActions } from "../hooks/useEventActions";
import { eventTicketsAbi, scannerEventAddress } from "../lib/contracts";
import { monadTestnet, explorerAddressUrl } from "../lib/chain";
import { errorMessage, shortAddress } from "../lib/format";
import { verifyScannedTicket } from "../lib/scanVerification";
import type { ScanVerdict } from "../lib/scanVerification";

/**
 * Door scanner.
 *
 * This page owns the camera and the wallet. The rules that decide whether a scanned code
 * admits someone live in lib/scanVerification.ts, where they are unit tested: the code
 * must be well formed, for this chain and this event; the ticket must exist (checked
 * before the used flag, which answers false for ids that were never minted); it must not
 * already be used; and it must not be sitting in escrow for a resale.
 */

type ScanState = ScanVerdict | { kind: "unknown" };

export function ScannerPage() {
  const client = usePublicClient();
  const { address, isConnected } = useAccount();
  const actions = useEventActions(scannerEventAddress);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handledRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | undefined>();
  const [verdict, setVerdict] = useState<ScanState>({ kind: "unknown" });

  const organizer = useReadContract({
    address: scannerEventAddress,
    abi: eventTicketsAbi,
    functionName: "organizer",
  });
  const isOrganizer =
    Boolean(address) && Boolean(organizer.data) && address!.toLowerCase() === organizer.data!.toLowerCase();

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  async function verify(text: string) {
    if (!client) {
      setVerdict({ kind: "reject", reason: "No connection to the network." });
      return;
    }

    setVerdict(
      await verifyScannedTicket({
        text,
        expectedChainId: monadTestnet.id,
        expectedContract: scannerEventAddress,
        reads: {
          ownerOf: (tokenId) =>
            client.readContract({
              address: scannerEventAddress,
              abi: eventTicketsAbi,
              functionName: "ownerOf",
              args: [tokenId],
            }) as Promise<string>,
          isUsed: (tokenId) =>
            client.readContract({
              address: scannerEventAddress,
              abi: eventTicketsAbi,
              functionName: "isUsed",
              args: [tokenId],
            }) as Promise<boolean>,
        },
      }),
    );
  }

  async function start() {
    handledRef.current = false;
    setCameraError(undefined);
    setVerdict({ kind: "unknown" });

    if (!window.isSecureContext) {
      setCameraError("The camera needs a secure connection. Use https, or localhost during development.");
      return;
    }

    try {
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (!result || handledRef.current) return;
        handledRef.current = true;
        controlsRef.current?.stop();
        controlsRef.current = null;
        setScanning(false);
        void verify(result.getText());
      });
      controlsRef.current = controls;
      setScanning(true);
    } catch (error) {
      setCameraError(errorMessage(error));
      setScanning(false);
    }
  }

  return (
    <div className="stack">
      <div className="stack--tight">
        <h1>Door scanner</h1>
        <p className="lede">
          Point the camera at a ticket code. The check runs against the chain, so a screenshot or a
          forwarded image will not admit anyone but the holder.
        </p>
        <p className="hint">
          Checking in on{" "}
          <a href={explorerAddressUrl(scannerEventAddress)} target="_blank" rel="noreferrer" className="mono">
            {shortAddress(scannerEventAddress)}
          </a>
        </p>
      </div>

      {!isConnected ? (
        <p className="notice notice--warn">Connect the organizer wallet before scanning.</p>
      ) : isOrganizer ? null : (
        <p className="notice notice--warn">
          This wallet is not the organizer, so a check-in would be refused by the contract.
        </p>
      )}

      <section className="card stack">
        <div className="row">
          <button type="button" className="button" onClick={() => void start()} disabled={scanning}>
            {scanning ? "Scanning" : "Start camera"}
          </button>
          {scanning ? (
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                controlsRef.current?.stop();
                controlsRef.current = null;
                setScanning(false);
              }}
            >
              Stop
            </button>
          ) : null}
        </div>

        <div className="scanner-frame">
          <video ref={videoRef} muted playsInline aria-label="Camera preview for ticket scanning" />
        </div>

        {cameraError ? (
          <p className="notice notice--danger" role="alert">
            {cameraError}
          </p>
        ) : null}
      </section>

      {verdict.kind === "ok" ? (
        <section className="card stack--tight notice--ok" role="status">
          <h2 style={{ fontSize: "1.15rem" }}>Valid ticket</h2>
          <p>
            Ticket #{verdict.tokenId.toString()} belongs to{" "}
            <a href={explorerAddressUrl(verdict.owner)} target="_blank" rel="noreferrer" className="mono">
              {shortAddress(verdict.owner)}
            </a>
            . It has not been used yet.
          </p>
          <button
            type="button"
            className="button"
            disabled={!isOrganizer || actions.isBusy}
            onClick={() => {
              void actions.checkIn(verdict.tokenId).catch(() => {
                /* surfaced below */
              });
            }}
          >
            {actions.isBusy && actions.action === "checkIn" ? "Checking in" : "Check in this ticket"}
          </button>
          {actions.error ? (
            <p className="notice notice--danger" role="alert">
              {errorMessage(actions.error)}
            </p>
          ) : null}
        </section>
      ) : null}

      {actions.isConfirmed && actions.action === "checkIn" ? (
        <p className="notice notice--ok" role="status">
          Checked in. Let them through, and scan the next ticket.
        </p>
      ) : null}

      {verdict.kind === "reject" ? (
        <section className="card notice--danger" role="alert">
          <h2 style={{ fontSize: "1.15rem" }}>Refused</h2>
          <p>{verdict.reason}</p>
          {verdict.tokenId !== undefined ? <p className="hint">Ticket #{verdict.tokenId.toString()}</p> : null}
          {verdict.owner ? (
            <p className="hint">
              Registered owner{" "}
              <a href={explorerAddressUrl(verdict.owner)} target="_blank" rel="noreferrer" className="mono">
                {shortAddress(verdict.owner)}
              </a>
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="card card--quiet stack--tight">
        <h2 style={{ fontSize: "1.05rem" }}>Before the doors open</h2>
        <p className="hint">
          Check-in is refused before the event start time, which is what stops tickets from being marked as
          used early. Pick the contract whose start time has already passed if you are rehearsing.
        </p>
      </section>
    </div>
  );
}
