"use client";

import React from "react";

export function RsvpForm({ slug, accent }: { slug: string; accent?: string }) {
  const [state, setState] = React.useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("busy");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: String(fd.get("name") ?? ""),
          attending: String(fd.get("attending") ?? "yes"),
          guests: Number(fd.get("guests") ?? 1),
          message: String(fd.get("message") ?? ""),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) setState("done");
      else {
        setState("error");
        setError(data.error ?? "Could not save your RSVP.");
      }
    } catch {
      setState("error");
      setError("Network error. Please try again.");
    }
  }

  if (state === "done") {
    return <p className="mx-auto max-w-sm rounded-xl bg-white/60 px-4 py-3 text-sm" style={{ color: accent }}>Thank you for your RSVP! ✦</p>;
  }
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm space-y-3 rounded-2xl border p-5 text-left" style={{ borderColor: accent }}>
      <p className="text-center font-serif text-lg" style={{ color: accent }}>Kindly respond</p>
      <input name="name" required maxLength={120} placeholder="Your name" aria-label="Your name" className="input" />
      <div className="flex gap-2">
        <select name="attending" aria-label="Attending" className="input flex-1">
          <option value="yes">Joyfully attending</option>
          <option value="maybe">Maybe</option>
          <option value="no">Regretfully cannot</option>
        </select>
        <input name="guests" type="number" min={1} max={10} defaultValue={1} aria-label="Number of guests" className="input w-20" />
      </div>
      <textarea name="message" rows={2} maxLength={500} placeholder="Wishes (optional)" aria-label="Message" className="input" />
      {state === "error" ? <p role="alert" className="text-xs text-burgundy">{error}</p> : null}
      <button type="submit" disabled={state === "busy"} className="btn-gold w-full">
        {state === "busy" ? "Sending…" : "Send RSVP"}
      </button>
    </form>
  );
}
