"use client";
import { useState } from "react";
import { createBenefitTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { dueOptions, recommendedDue, shortDate } from "@/lib/due-options";
import Sheet from "./Sheet";
import { useAct } from "./useAct";

// 지원 상세에서 이 지원의 신청을 할 일(과 달력)로 넣는다. 날짜는 직접 고른다(마감이 있으면 마감일까지).
export default function AddBenefitTask({ auth, benefitId, today, endDate }: { auth: Auth; benefitId: string; today: string; endDate?: string }) {
  const { run, pending, err } = useAct();
  const opts = dueOptions(today, endDate);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(recommendedDue(opts));
  const custom = !opts.some((o) => o.date === pick);
  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full rounded-full bg-primary px-5 py-3.5 font-semibold text-ink">할 일에 넣기</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="언제까지 신청할까요?">
        {endDate && <p className="mb-3 text-sm text-warn">신청 마감은 {shortDate(endDate)}이에요</p>}
        <div role="radiogroup" aria-label="신청 날짜" className="space-y-2">
          {opts.map((o) => (
            <label key={o.date} className={`flex items-center gap-3 rounded-xl p-3 ${pick === o.date ? "bg-accent-soft font-semibold text-accent ring-[1.5px] ring-primary" : "bg-card shadow-card"}`}>
              <input type="radio" name="due" checked={pick === o.date} onChange={() => setPick(o.date)} className="h-5 w-5" />
              <span className="font-medium">{o.label}</span>
              <span className="ml-auto text-sm text-muted">{shortDate(o.date)}</span>
            </label>
          ))}
          <label className={`block rounded-xl p-3 ${custom ? "bg-accent-soft ring-[1.5px] ring-primary" : "bg-card shadow-card"}`}>
            <span className="font-medium">다른 날짜 고르기</span>
            <input type="date" min={today} max={endDate} value={pick} onChange={(e) => e.target.value && setPick(e.target.value)} className="mt-2 w-full rounded-lg border border-line bg-card px-3 py-2" />
          </label>
        </div>
        {err && <p role="alert" className="mt-2 text-sm text-warn">{err}</p>}
        <button disabled={pending} onClick={() => run(() => createBenefitTask(auth, benefitId, pick), () => setOpen(false))} className="mt-4 w-full rounded-xl bg-primary px-5 py-3.5 font-semibold text-ink disabled:opacity-60">
          {pending ? "넣는 중…" : `${shortDate(pick)}까지 할 일에 넣기`}
        </button>
        <p className="mt-2 text-center text-sm text-muted">날짜는 나중에 할 일에서 바꿀 수 있어요</p>
      </Sheet>
    </>
  );
}
