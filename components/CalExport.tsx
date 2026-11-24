"use client";
import { useState } from "react";
import CalSyncLink from "./CalSyncLink";

type Scope = "all" | "mine" | "visit";

// 폰 캘린더로 옮길 범위를 고른다. 고른 범위가 주소(?scope=)로 들어가 서버가 그 일정만 담는다.
export default function CalExport({ href, alone, counts }: { href: string; alone: boolean; counts: Record<Scope, number> }) {
  const [scope, setScope] = useState<Scope>("all");
  const opts: [Scope, string][] = [["all", "전체"], ...(alone ? [] : [["mine", "내가 맡은 일"] as [Scope, string]]), ["visit", "병원 일정"]];
  return (
    <>
      <div role="radiogroup" aria-label="캘린더에 넣을 일정" className="mt-3 flex flex-wrap gap-2">
        {opts.map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={scope === k} onClick={() => setScope(k)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${scope === k ? "bg-foreground font-semibold text-white" : "border border-line bg-card text-muted hover:text-ink"}`}>
            {l} <span className="tabular-nums">{counts[k]}</span>
          </button>
        ))}
      </div>
      <CalSyncLink href={scope === "all" ? href : `${href}?scope=${scope}`} downloadName="bravecare-schedule.ics" label="캘린더에 넣기" />
    </>
  );
}
