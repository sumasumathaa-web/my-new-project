import React from "react";

/**
 * Server-rendered pagination (kept out of the client bundle so pages can pass
 * a `makeHref` closure without serialising a function across the boundary).
 */
export function Pagination(props: { page: number; total: number; pageSize: number; makeHref: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(props.total / props.pageSize));
  if (pages <= 1) return null;
  const items = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - props.page) <= 2) items.push(p);
  }
  const unique = [...new Set(items)];
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
      {unique.map((p, i) => (
        <React.Fragment key={p}>
          {i > 0 && p - unique[i - 1] > 1 ? <span className="text-charcoal-muted">…</span> : null}
          <a
            href={props.makeHref(p)}
            aria-current={p === props.page ? "page" : undefined}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition ${
              p === props.page ? "bg-burgundy text-cream" : "text-charcoal-soft hover:bg-champagne"
            }`}
          >
            {p}
          </a>
        </React.Fragment>
      ))}
    </nav>
  );
}

