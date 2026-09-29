import type { ReactNode } from "react";

/**
 * Loading, error and empty states.
 *
 * Every async read in this app renders a skeleton while pending, so the layout does not
 * jump when data arrives.
 */

export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="stack--tight" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="skeleton skeleton--line"
          style={{ width: `${85 - index * 12}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card" aria-hidden="true">
      <div className="stack--tight">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--block" />
      </div>
    </div>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="card" role="status" aria-live="polite">
      <p className="label">{label}</p>
      <div style={{ marginTop: "0.75rem" }}>
        <SkeletonLines count={3} />
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card notice--danger" role="alert">
      <h2 style={{ fontSize: "1.05rem" }}>{title}</h2>
      <p style={{ marginTop: "0.4rem" }}>{message}</p>
      {onRetry ? (
        <button type="button" className="button button--secondary" style={{ marginTop: "0.9rem" }} onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card card--quiet">
      <h2 style={{ fontSize: "1.05rem" }}>{title}</h2>
      {children ? <div style={{ marginTop: "0.4rem" }}>{children}</div> : null}
    </div>
  );
}
