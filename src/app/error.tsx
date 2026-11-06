"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-pad flex flex-col items-center py-24 text-center">
      <h1 className="font-serif text-3xl text-charcoal">Something went wrong</h1>
      <p className="mt-3 max-w-md text-charcoal-muted">
        An unexpected error occurred. Please try again — if it persists, contact support.
      </p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn-burgundy">Try again</button>
        <Link href="/" className="btn-outline">Home</Link>
      </div>
    </div>
  );
}
