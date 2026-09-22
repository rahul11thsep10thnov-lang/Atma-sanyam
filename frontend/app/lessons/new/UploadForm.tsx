"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UploadForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"file" | "text">("file");
  const [pastedText, setPastedText] = useState("");
  const [subject, setSubject] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      let res: Response;
      if (mode === "file") {
        if (!file) throw new Error("Choose a .txt, .pdf or .docx file first.");
        const form = new FormData();
        form.append("file", file);
        form.append("subject", subject);
        form.append("education_level", educationLevel);
        res = await fetch("/api/proxy/lessons/upload", { method: "POST", body: form });
      } else {
        if (!pastedText.trim()) throw new Error("Paste some lesson text first.");
        res = await fetch("/api/proxy/lessons", {
          method: "POST",
          body: JSON.stringify({ source_text: pastedText, subject, education_level: educationLevel }),
        });
      }
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message || "Upload failed.");
      router.push(`/lessons/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={mode === "file" ? "btn-primary" : "btn-secondary"}
        >
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={mode === "text" ? "btn-primary" : "btn-secondary"}
        >
          Paste text
        </button>
      </div>

      {mode === "file" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) setFile(dropped);
          }}
          className={`rounded-md border-2 border-dashed px-6 py-10 text-center text-sm ${
            dragActive ? "border-slate-500 bg-slate-50" : "border-slate-300"
          }`}
        >
          <p className="text-slate-600 mb-3">Drag and drop a .txt, .pdf or .docx file, or</p>
          <label className="btn-secondary cursor-pointer">
            Choose file
            <input
              type="file"
              accept=".txt,.pdf,.docx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file && <p className="mt-3 text-slate-700 font-medium">{file.name}</p>}
        </div>
      ) : (
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          rows={10}
          placeholder="Paste your teaching material here..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-600">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Physics"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Education level</label>
          <input
            value={educationLevel}
            onChange={(e) => setEducationLevel(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="e.g. Grade 8"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button onClick={submit} disabled={busy} className="btn-primary">
        {busy ? "Uploading…" : "Create Lesson"}
      </button>
    </div>
  );
}
