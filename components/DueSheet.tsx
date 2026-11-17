"use client";
import { useState } from "react";
import { dueOptions, recommendedDue, shortDate } from "@/lib/due-options";
import Sheet from "./Sheet";

// 신청 날짜를 고르는 시트. 마감이 있으면 마감일 안에서만 고르게 한다. 새로 넣을 때와 이미 있는 할 일의 날짜를 바꿀 때 같이 쓴다.
export default function DueSheet({ open, onClose, today, endDate, initial, pending, err, confirmText, onPick }: {
  open: boolean; onClose: () => void; today: string; endDate?: string; initial?: string;
  pending: boolean; err: string; confirmText: (d: string) => string; onPick: (d: string) => void;
}) {
  const opts = dueOptions(today, endDate);
  const [pick, setPick] = useState(initial && initial >= today && (!endDate || initial <= endDate) ? initial : recommendedDue(opts));
  const custom = !opts.some((o) => o.date === pick);
  return (
    <Sheet open={open} onClose={onClose} title="언제까지 신청할까요?">
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
      <button disabled={pending} onClick={() => onPick(pick)} className="mt-4 w-full rounded-xl bg-primary px-5 py-3.5 font-semibold text-ink disabled:opacity-60">
        {pending ? "저장하는 중…" : confirmText(pick)}
      </button>
      <p className="mt-2 text-center text-sm text-muted">날짜는 나중에 할 일에서 바꿀 수 있어요</p>
    </Sheet>
  );
}
