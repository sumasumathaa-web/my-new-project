"use client";

import { useRef, useState } from "react";

/** Uploads a finished deliverable file (video/file) to the private bucket and assigns it to an order item. */
export function DeliverableUpload({ itemId, current }: { itemId: string; current: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("order_item_id", itemId);
      const res = await fetch("/api/admin/deliverables", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  void state;

  return (
    <div className="space-y-1">
      {current ? (
        <p className="break-all font-mono text-xs text-[#2F6B38]">✓ {current}</p>
      ) : (
        <p className="text-xs text-charcoal-muted">No deliverable assigned.</p>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="text-xs file:mr-2 file:rounded-full file:border-0 file:bg-champagne file:px-3 file:py-1 file:text-xs"
          aria-label="Choose deliverable file"
        />
        <button type="button" onClick={upload} disabled={busy} className="btn-outline px-3 py-1 text-xs disabled:opacity-60">
          {busy ? "Uploading…" : current ? "Replace" : "Upload"}
        </button>
      </div>
      {error ? <p role="alert" className="text-xs text-burgundy">{error}</p> : null}
    </div>
  );
}
