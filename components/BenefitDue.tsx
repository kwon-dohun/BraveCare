"use client";
import { useState } from "react";
import { setTaskDue } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { shortDate } from "@/lib/due-options";
import DueSheet from "./DueSheet";
import { useAct } from "./useAct";

// 지원 신청 할 일의 날짜를 마감 안에서 다시 고른다(예전에 자동으로 정해진 날짜도 여기서 바꾼다)
export default function BenefitDue({ auth, taskId, today, endDate, current }: { auth: Auth; taskId: string; today: string; endDate?: string; current: string | null }) {
  const { run, pending, err } = useAct();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 w-full rounded-full bg-accent-soft px-5 py-2.5 text-sm font-semibold text-accent">
        {current ? "신청할 날 바꾸기" : "신청할 날 정하기"}
      </button>
      <DueSheet open={open} onClose={() => setOpen(false)} today={today} endDate={endDate} initial={current ?? undefined} pending={pending} err={err}
        confirmText={(d) => `날짜 바꾸기 · ${shortDate(d)}`} onPick={(d) => run(() => setTaskDue(auth, taskId, d), () => setOpen(false))} />
    </>
  );
}
