"use client";

import { useState } from "react";

export default function ReportErrorPage() {
  const [submitted, setSubmitted] = useState(false);
  const [details, setDetails] = useState("");
  const [pageUrl, setPageUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Demo mode: no backend endpoint configured. Once Supabase is wired up,
    // this should insert into `question_reports` (reason: 'other') or a
    // dedicated feedback table.
    setSubmitted(true);
  }

  return (
    <div className="container-page py-10 max-w-xl">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Report an Error</h1>
      <p className="text-sm text-gray-600 mb-6">
        Kisi bhi galat question, jaankari ya broken page ke baare me humein
        batayein.
      </p>

      {submitted ? (
        <div className="card p-5 bg-green-50 border-green-100">
          <p className="text-sm font-semibold text-brand-green">
            Dhanyavaad! Aapki report humein mil gayi hai.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={pageUrl}
            onChange={(e) => setPageUrl(e.target.value)}
            placeholder="Page URL (jahan error hai)"
            className="select"
          />
          <textarea
            required
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Error ki detail likhein..."
            rows={5}
            className="select"
          />
          <button type="submit" className="btn-primary w-full py-3 text-sm">
            Submit Karein
          </button>
        </form>
      )}
    </div>
  );
}
