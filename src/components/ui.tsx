"use client";
/** Accessible UI primitives for the design system. */
import React from "react";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function SectionHeading(props: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cx("mb-8 sm:mb-10", props.align === "center" ? "text-center" : "text-left")}>
      {props.eyebrow ? <p className="eyebrow mb-2">{props.eyebrow}</p> : null}
      <h2 className="text-balance font-serif text-2xl sm:text-3xl lg:text-4xl text-charcoal">{props.title}</h2>
      {props.subtitle ? (
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-charcoal-muted {props.align === 'center' ? 'mx-auto' : ''}">
          {props.subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function Field(props: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={props.htmlFor} className="label">
        {props.label} {props.required ? <span className="text-burgundy">*</span> : null}
      </label>
      {props.children}
      {props.help ? <p className="mt-1 text-xs text-charcoal-muted">{props.help}</p> : null}
      {props.error ? (
        <p role="alert" className="mt-1 text-xs text-burgundy">
          {props.error}
        </p>
      ) : null}
    </div>
  );
}

export function Badge(props: { tone?: "gold" | "green" | "red" | "amber" | "blue" | "gray"; children: React.ReactNode }) {
  const tone = props.tone ?? "gray";
  return <span className={`badge-${tone}`}>{props.children}</span>;
}

export function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "gold" | "green" | "red" | "amber" | "blue" | "gray"; label: string }> = {
    pending_payment: { tone: "amber", label: "Pending Payment" },
    paid: { tone: "green", label: "Paid" },
    in_progress: { tone: "blue", label: "In Progress" },
    awaiting_info: { tone: "amber", label: "Awaiting Info" },
    ready_for_review: { tone: "blue", label: "Ready for Review" },
    delivered: { tone: "green", label: "Delivered" },
    cancelled: { tone: "red", label: "Cancelled" },
    refunded: { tone: "gray", label: "Refunded" },
  };
  const entry = map[status] ?? { tone: "gray" as const, label: status };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="aspect-[4/3] animate-pulse bg-champagne" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-champagne" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-champagne" />
      </div>
    </div>
  );
}

export function EmptyState(props: { title: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-champagne text-gold-dark">✦</div>
      <h3 className="font-serif text-xl text-charcoal">{props.title}</h3>
      {props.message ? <p className="mt-2 max-w-sm text-sm text-charcoal-muted">{props.message}</p> : null}
      {props.action ? <div className="mt-6">{props.action}</div> : null}
    </div>
  );
}

export function ConfirmSubmitButton(props: {
  label: string;
  confirmText?: string;
  className?: string;
  name?: string;
  value?: string;
  formAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <button
      type="submit"
      name={props.name}
      value={props.value}
      formAction={props.formAction}
      className={props.className ?? "btn-outline"}
      onClick={(e) => {
        if (!window.confirm(props.confirmText ?? "Are you sure?")) {
          e.preventDefault();
        }
      }}
    >
      {props.label}
    </button>
  );
}
