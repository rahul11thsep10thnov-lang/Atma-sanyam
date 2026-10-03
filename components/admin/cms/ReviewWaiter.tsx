"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, btnPrimary, btnSecondary, Notice } from "./ui";

interface Current {
  id: string;
  name: string;
  stage: string;
}

/** Starts the pipeline for the current destination (if it is not running) and opens its review screen when ready. */
export function ReviewWaiter({ base, current }: { base: string; current: Current | null }) {
  const router = useRouter();
  const [cur, setCur] = useState<Current | null>(current);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!current) return;
    if (current.stage === "FAILED") return;
    let alive = true;
    void api("/api/admin/cms/pipeline", { method: "POST", body: JSON.stringify({ action: "continue" }) }).catch((e) => setError(e instanceof Error ? e.message : "Could not start the pipeline"));
    const t = setInterval(async () => {
      try {
        const o = await api<{ current: Current | null }>("/api/admin/cms/pipeline");
        if (!alive) return;
        setCur(o.current);
        if (o.current?.stage === "AWAITING_APPROVAL") router.replace(`${base}/destinations/${o.current.id}/images`);
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [base, current, router]);

  if (!cur) return <Notice tone="ok">Nothing is waiting for review. <Link href={`${base}/import`} className="font-semibold underline">Import a PDF</Link> or open the <Link href={`${base}/pipeline`} className="font-semibold underline">pipeline</Link>.</Notice>;
  if (cur.stage === "FAILED")
    return (
      <Notice tone="error">
        {cur.name} failed in the pipeline. <Link href={`${base}/pipeline`} className="font-semibold underline">Open the pipeline</Link> to see the error and retry.
      </Notice>
    );
  return (
    <div className="card-surface flex flex-wrap items-center gap-4 p-5">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-forest-200 border-t-forest-700" aria-hidden />
      <div className="flex-1">
        <p className="font-medium text-charcoal">Preparing {cur.name}…</p>
        <p className="text-xs text-charcoal-light">Stage: {cur.stage.replace(/_/g, " ")}. Research, attractions and the image search run automatically — this page opens the review screen as soon as candidates are ready.</p>
        {error && <p className="mt-1 text-xs text-terracotta-700">{error}</p>}
      </div>
      <Link href={`${base}/pipeline`} className={btnSecondary}>Pipeline</Link>
      <Link href={`${base}/destinations/${cur.id}/images`} className={btnPrimary}>Open anyway</Link>
    </div>
  );
}
