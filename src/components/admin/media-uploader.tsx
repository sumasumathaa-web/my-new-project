"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const IMAGE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 60 * 1024 * 1024;

/** Admin uploader → POST /api/admin/uploads (public-media bucket, server-validated). */
export function MediaUploader({ prefix }: { prefix: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const router = useRouter();

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const max = isVideo ? VIDEO_MAX : IMAGE_MAX;
    if (file.size > max) {
      setError(`File too large (limit ${isVideo ? "60 MB video" : "5 MB image"}).`);
      return;
    }
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prefix", prefix);
      const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { error?: string; path?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setOk(`Uploaded → ${json.path}`);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-burgundy file:px-4 file:py-2 file:text-sm file:text-cream"
        aria-label="Choose file to upload"
      />
      <button type="button" onClick={upload} disabled={busy} className="btn-gold px-5 py-2 text-sm disabled:opacity-60">
        {busy ? "Uploading…" : "Upload"}
      </button>
      {error ? <p role="alert" className="w-full text-sm text-burgundy">{error}</p> : null}
      {ok ? <p role="status" className="w-full text-sm text-[#2F6B38]">{ok}</p> : null}
    </div>
  );
}
