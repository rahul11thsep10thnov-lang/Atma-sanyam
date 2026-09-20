"use client";

import { useState } from "react";

export function NewDestinationForm() {
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [bestTimeToVisit, setBestTimeToVisit] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, state, shortDescription, bestTimeToVisit })
      });
      const data = await res.json();
      setStatus(data.message ?? (res.ok ? "Submitted." : "Something went wrong."));
    } catch {
      setStatus("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-surface max-w-xl space-y-4 p-5">
      <label className="block text-sm font-medium text-charcoal">
        Name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-forest-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-charcoal">
        State
        <input
          required
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="mt-1 w-full rounded-lg border border-forest-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-charcoal">
        Short description
        <textarea
          required
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-forest-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-charcoal">
        Best time to visit
        <input
          value={bestTimeToVisit}
          onChange={(e) => setBestTimeToVisit(e.target.value)}
          className="mt-1 w-full rounded-lg border border-forest-200 px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-forest-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Save destination"}
      </button>
      {status && <p className="text-sm text-charcoal-light">{status}</p>}
    </form>
  );
}
