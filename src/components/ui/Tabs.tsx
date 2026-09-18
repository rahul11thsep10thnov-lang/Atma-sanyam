"use client";

import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabDef {
  key: string;
  label: string;
  content: ReactNode;
}

export default function Tabs({ tabs, defaultKey }: { tabs: TabDef[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-px -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "whitespace-nowrap rounded-t-md px-3.5 py-2.5 text-sm font-semibold border-b-2 -mb-px",
              active === tab.key
                ? "border-brand-navy text-brand-navy"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-5">{activeTab?.content}</div>
    </div>
  );
}
