"use client";

import React from "react";
import { useRouter } from "next/navigation";

export function WishlistButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [state, setState] = React.useState<"idle" | "in" | "busy">("idle");
  return (
    <button
      type="button"
      className="btn-outline"
      aria-pressed={state === "in"}
      onClick={async () => {
        setState("busy");
        try {
          const res = await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });
          if (res.status === 401) {
            router.push("/login?next=/account/favorites");
            return;
          }
          const data = (await res.json()) as { added: boolean };
          setState(data.added ? "in" : "idle");
        } catch {
          setState("idle");
        }
      }}
    >
      {state === "in" ? "♥ In wishlist" : state === "busy" ? "…" : "♡ Wishlist"}
    </button>
  );
}

/** Compact remove button for the favourites grid. */
export function WishlistRemoveButton({ productId, initialSaved }: { productId: string; initialSaved?: boolean }) {
  const router = useRouter();
  void initialSaved;
  const [busy, setBusy] = React.useState(false);
  const [removed, setRemoved] = React.useState(false);
  if (removed) return null;
  return (
    <button
      type="button"
      className="btn-outline w-full w-full px-3 py-1 text-xs"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });
          if (res.ok) {
            const data = (await res.json()) as { added: boolean };
            if (!data.added) {
              setRemoved(true);
              router.refresh();
            }
          }
        } catch {
          /* keep button */
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Removing…" : "♥ Remove from favourites"}
    </button>
  );
}
