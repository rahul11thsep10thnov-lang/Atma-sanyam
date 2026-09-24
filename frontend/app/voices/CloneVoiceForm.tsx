"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Upload flow for a self-hosted Chatterbox voice (build spec section 4:
 * one consistent voice, cloned once, reused for every video — see
 * docs/CHATTERBOX.md). Only relevant when VOICE_PROVIDER=chatterbox. */
export function CloneVoiceForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a short audio clip of the voice first.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/proxy/voices/upload-reference", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Voice clone upload failed.");
      setSuccess(`Voice cloned: ${body.voice_id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice clone upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Clone your voice</h2>
      <p className="text-sm text-slate-500">
        Upload a short (5-30 second), clean, single-speaker audio clip. This becomes your account&apos;s one
        consistent voice for every video — re-uploading replaces it. Requires a running Chatterbox server
        (VOICE_PROVIDER=chatterbox). See docs/CHATTERBOX.md.
      </p>
      <input ref={inputRef} type="file" accept="audio/*" className="text-sm" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}
      <button onClick={submit} disabled={busy} className="btn-primary">
        {busy ? "Uploading…" : "Clone voice"}
      </button>
    </div>
  );
}
