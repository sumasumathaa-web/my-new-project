"use client";

import React from "react";
import { useSearchParams } from "next/navigation";

function ContactForm() {
  const preset = useSearchParams().get("subject") ?? "";
  const [state, setState] = React.useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setState("busy");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          subject: String(fd.get("subject") ?? ""),
          message: String(fd.get("message") ?? ""),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setState("done");
        setMessage(data.ticket ? "Thank you! A support ticket was created — track replies in your account." : "Thank you! We will reply by email soon.");
        form.reset();
      } else {
        setState("error");
        setMessage(data.error ?? "Could not send your message.");
      }
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="container-pad max-w-2xl py-14">
      <p className="eyebrow mb-2">We love to hear from you</p>
      <h1 className="font-serif text-3xl text-charcoal sm:text-4xl">Contact us</h1>
      <p className="mt-3 text-charcoal-muted">Questions about designs, delivery or custom work — message the studio.</p>

      {state === "done" ? (
        <div className="card mt-8 p-6 text-sm text-[#2F6B38]">{message}</div>
      ) : (
        <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="label">Name *</label>
              <input id="c-name" name="name" required maxLength={120} className="input" />
            </div>
            <div>
              <label htmlFor="c-email" className="label">Email *</label>
              <input id="c-email" name="email" type="email" required maxLength={254} className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="c-subject" className="label">Subject *</label>
            <input id="c-subject" name="subject" required maxLength={160} defaultValue={preset} className="input" />
          </div>
          <div>
            <label htmlFor="c-message" className="label">Message *</label>
            <textarea id="c-message" name="message" required rows={6} maxLength={4000} className="input" />
          </div>
          {state === "error" ? <p role="alert" className="text-sm text-burgundy">{message}</p> : null}
          <button type="submit" disabled={state === "busy"} className="btn-burgundy">
            {state === "busy" ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </div>
  );
}
export default function ContactPage() {
  return (
    <React.Suspense fallback={null}>
      <ContactForm />
    </React.Suspense>
  );
}
