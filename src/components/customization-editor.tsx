"use client";

import React from "react";
import { InvitationPreview } from "@/components/invitation-preview";
import { formatINR } from "@/lib/types-compat";
import type { CustomField } from "@/lib/types";

interface RevisionMeta {
  version: number;
  created_at: string;
}

export function CustomizationEditor(props: {
  id: string;
  initialTitle: string;
  initialConfig: Record<string, unknown>;
  schema: CustomField[];
  status: string;
  version: number;
  slug: string;
  revisions: RevisionMeta[];
  publishPrice?: number | null;
}) {
  const [config, setConfig] = React.useState<Record<string, unknown>>(props.initialConfig);
  const [title, setTitle] = React.useState(props.initialTitle);
  const [status, setStatus] = React.useState(props.status);
  const [version, setVersion] = React.useState(props.version);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [previewWide, setPreviewWide] = React.useState(false);

  function setValue(key: string, value: unknown) {
    setConfig((cur) => ({ ...cur, [key]: value }));
  }

  async function save() {
    setBusy("save");
    setMessage(null);
    try {
      const res = await fetch("/api/customizations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: props.id, title, config }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({ ok: false, text: data.error ?? "Save failed." });
      } else {
        setVersion(data.version);
        setMessage({ ok: true, text: `Draft saved (v${data.version})` });
      }
    } catch {
      setMessage({ ok: false, text: "Network error." });
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!window.confirm("Publish this invitation? Anyone with the link can view it.")) return;
    setBusy("publish");
    setMessage(null);
    try {
      const res = await fetch("/api/customizations/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: props.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({ ok: false, text: data.error ?? "Publish failed." });
      } else {
        setStatus("published");
        setMessage({ ok: true, text: `Live at ${data.url}` });
      }
    } catch {
      setMessage({ ok: false, text: "Network error." });
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(action: "unpublish" | "archive") {
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch("/api/customizations/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: props.id, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) setMessage({ ok: false, text: data.error ?? "Failed." });
      else setStatus(data.status);
    } catch {
      setMessage({ ok: false, text: "Network error." });
    } finally {
      setBusy(null);
    }
  }

  async function restore(versionNo: number) {
    if (!window.confirm(`Restore version ${versionNo}? Your current content is kept in history.`)) return;
    setBusy("restore");
    try {
      const res = await fetch("/api/customizations/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: props.id, action: "restore", version: versionNo }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) setMessage({ ok: false, text: data.error ?? "Restore failed." });
      else {
        setConfig(data.config);
        setVersion(data.version);
        setMessage({ ok: true, text: `Restored — now at v${data.version}.` });
      }
    } catch {
      setMessage({ ok: false, text: "Network error." });
    } finally {
      setBusy(null);
    }
  }

  function renderField(field: CustomField) {
    const value = config[field.key];
    switch (field.type) {
      case "textarea":
        return (
          <textarea
            id={`f-${field.key}`}
            rows={3}
            maxLength={field.maxLength ?? 2000}
            className="input"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
        );
      case "date":
      case "time":
        return (
          <input
            id={`f-${field.key}`}
            type={field.type}
            className="input"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
        );
      case "color":
        return (
          <div className="flex items-center gap-3">
            <input
              id={`f-${field.key}`}
              type="color"
              aria-label={field.label}
              className="h-10 w-14 cursor-pointer rounded-lg border border-[#E0D5C0]"
              value={typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#B08D57"}
              onChange={(e) => setValue(field.key, e.target.value)}
            />
            <code className="text-xs text-charcoal-muted">{typeof value === "string" ? value : "default"}</code>
          </div>
        );
      case "select":
        return (
          <select
            id={`f-${field.key}`}
            className="input"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(field.key, e.target.value)}
          >
            <option value="">— choose —</option>
            {(field.options ?? []).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        );
      case "checkbox":
        return (
          <label className="flex items-center gap-2 text-sm text-charcoal-soft">
            <input
              id={`f-${field.key}`}
              type="checkbox"
              className="accent-burgundy"
              checked={value === true || value === "true"}
              onChange={(e) => setValue(field.key, e.target.checked)}
            />
            Enable
          </label>
        );
      case "url":
        return (
          <input
            id={`f-${field.key}`}
            type="url"
            placeholder="https://…"
            className="input"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
        );
      case "image":
        return (
          <div>
            <input
              id={`f-${field.key}`}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append("file", file);
                setBusy("upload");
                try {
                  const res = await fetch("/api/uploads", { method: "POST", body: fd });
                  const data = await res.json();
                  if (res.ok && data.ok) {
                    setValue(field.key, data.path);
                    setMessage({ ok: true, text: "Photo uploaded." });
                  } else {
                    setMessage({ ok: false, text: data.error ?? "Upload failed." });
                  }
                } catch {
                  setMessage({ ok: false, text: "Upload failed." });
                } finally {
                  setBusy(null);
                  e.target.value = "";
                }
              }}
            />
            {typeof value === "string" && value ? (
              <p className="mt-1 text-xs text-[#2F6B38]">✓ Image set — <span className="font-mono">{value.replace(/^.*\//, "")}</span></p>
            ) : null}
          </div>
        );
      default:
        return (
          <input
            id={`f-${field.key}`}
            type="text"
            maxLength={field.maxLength ?? 200}
            className="input"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setValue(field.key, e.target.value)}
          />
        );
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[400px_1fr]">
      <div className="space-y-5">
        <div className="card space-y-4 p-5">
          <div>
            <label htmlFor="c-title" className="label">Invitation title (private)</label>
            <input id="c-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className="input" />
          </div>
          {props.schema.map((field) => (
            <div key={field.key}>
              <label htmlFor={`f-${field.key}`} className="label">
                {field.label} {field.required ? <span className="text-burgundy">*</span> : null}
              </label>
              {renderField(field)}
              {field.help ? <p className="mt-1 text-xs text-charcoal-muted">{field.help}</p> : null}
            </div>
          ))}
        </div>

        <div className="card space-y-3 p-5">
          <p className="text-sm">
            Status: <strong className="capitalize">{status}</strong> · version {version}
          </p>
          {message ? (
            <p role="status" className={`text-sm ${message.ok ? "text-[#2F6B38]" : "text-burgundy"}`}>{message.text}</p>
          ) : null}
          {status === "published" ? (
            <p className="break-all rounded-lg bg-champagne px-3 py-2 text-xs">
              Live URL: <a href={`/w/${props.slug}`} target="_blank" rel="noreferrer" className="text-burgundy underline">/w/{props.slug}</a>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-gold px-4 py-2 text-xs" disabled={busy !== null} onClick={save}>
              {busy === "save" ? "Saving…" : "Save draft"}
            </button>
            {status !== "published" ? (
              <button type="button" className="btn-burgundy px-4 py-2 text-xs" disabled={busy !== null} onClick={publish}>
                {busy === "publish" ? "Publishing…" : "Publish"}
              </button>
            ) : (
              <button type="button" className="btn-outline px-4 py-2 text-xs" disabled={busy !== null} onClick={() => changeStatus("unpublish")}>
                Unpublish
              </button>
            )}
          </div>
          {props.publishPrice ? (
            <p className="text-xs text-charcoal-muted">Template price: {formatINR(props.publishPrice)}</p>
          ) : null}
        </div>

        {props.revisions.length ? (
          <div className="card p-5">
            <h3 className="font-serif text-lg text-charcoal">Revision history</h3>
            <ul className="mt-3 space-y-2">
              {props.revisions.map((r) => (
                <li key={r.version} className="flex items-center justify-between text-sm">
                  <span className="text-charcoal-soft">
                    v{r.version} · {new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <button type="button" className="text-xs text-burgundy underline" onClick={() => restore(r.version)}>
                    restore
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-xl text-charcoal">Live preview</h2>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setPreviewWide((w) => !w)}>
            {previewWide ? "Switch to mobile view" : "Switch to wide view"}
          </button>
        </div>
        <div className={`mx-auto transition-all ${previewWide ? "max-w-3xl" : "max-w-sm"}`}>
          <InvitationPreview config={config} compact />
        </div>
      </div>
    </div>
  );
}
