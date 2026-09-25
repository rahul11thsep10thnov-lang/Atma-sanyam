"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, FileBadge, IdCard, Trophy } from "lucide-react";
import { EXAM_UPDATES } from "@/data/examUpdates";
import { STATES } from "@/data/states";
import { getAccent } from "@/lib/accentColors";
import { cn } from "@/lib/utils";
import type { UpdateType } from "@/types";

const TABS: { key: UpdateType; label: string; icon: typeof Bell }[] = [
  { key: "notification", label: "Notification", icon: FileBadge },
  { key: "admit_card", label: "Admit Card", icon: IdCard },
  { key: "result", label: "Result", icon: Trophy },
];

export default function ExamUpdatesCard() {
  const [tab, setTab] = useState<UpdateType>("notification");
  const rows = EXAM_UPDATES.filter((u) => u.type === tab && u.exam === "constable").slice(0, 5);
  const TabIcon = TABS.find((t) => t.key === tab)!.icon;

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff8e6] text-[#e0a100]">
          <Bell size={24} fill="currentColor" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[1.35rem] font-bold text-brand-dark">Police Exam Updates</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Demo data
            </span>
          </div>
          <p className="mt-0.5 text-[15px] text-slate-500">Notification · admit card · result — official board se verify karein</p>
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-[var(--card-border)]" />

      <div className="flex rounded-2xl bg-brand-orange-light p-1" role="tablist" aria-label="Update type">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-xl py-2.5 font-display text-[15px] font-semibold transition-colors",
              tab === t.key ? "bg-gradient-to-r from-[#ff6a00] to-[#ff8b3d] text-white shadow-md shadow-orange-300/40" : "text-[#9a4a12]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((u) => {
          const idx = STATES.findIndex((s) => s.code === u.state);
          const a = getAccent(idx);
          const st = STATES[idx];
          return (
            <Link
              key={u.id}
              href={`/exam-updates?state=${u.state}`}
              className="flex items-center gap-3.5 rounded-2xl border-[1.5px] bg-white p-3.5 transition-colors hover:bg-slate-50"
              style={{ borderColor: a.tileBorder }}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: a.tileBg, color: a.tileText }}>
                <TabIcon size={22} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[17px] font-bold" style={{ color: a.tileText }}>
                  {st.hinglishName} Police Constable
                </span>
                <span className="block truncate text-[14px] text-slate-500">{u.status}</span>
                <span
                  className="mt-1 inline-block rounded-full px-2.5 py-0.5 font-display text-xs font-semibold"
                  style={{ background: a.tileBg, color: a.tileText }}
                >
                  Awaited
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <Link href="/exam-updates" className="mt-4 block text-center font-display text-[15px] font-semibold text-brand-orange">
        Sabhi updates dekhein ›
      </Link>
    </section>
  );
}
