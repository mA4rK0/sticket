import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Loading } from "./components/StateBlock";
import { EventPage } from "./pages/EventPage";
import { MyTicketsPage } from "./pages/MyTicketsPage";
import { ResalePage } from "./pages/ResalePage";
import { DashboardPage } from "./pages/DashboardPage";
import { PolicyPage } from "./pages/PolicyPage";

/**
 * Route table. The scanner is loaded on demand: it carries the QR decoding library, which
 * nobody needs on the buying path.
 */
const ScannerPage = lazy(() =>
  import("./pages/ScannerPage").then((module) => ({ default: module.ScannerPage })),
);

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<EventPage />} />
        <Route path="/tickets" element={<MyTicketsPage />} />
        <Route path="/resale" element={<ResalePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/scanner"
          element={
            <Suspense fallback={<Loading label="Loading the scanner" />}>
              <ScannerPage />
            </Suspense>
          }
        />
        <Route path="/terms" element={<PolicyPage kind="terms" />} />
        <Route path="/privacy" element={<PolicyPage kind="privacy" />} />
        <Route path="/refund" element={<PolicyPage kind="refund" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
