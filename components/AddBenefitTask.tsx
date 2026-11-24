"use client";
import { useState } from "react";
import { createBenefitTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { shortDate } from "@/lib/due-options";
import DueSheet from "./DueSheet";
import { useAct } from "./useAct";

// 지원 상세에서 이 지원의 신청을 할 일(과 달력)로 넣는다. 날짜는 직접 고른다(마감이 있으면 마감일까지).
export default function AddBenefitTask({ auth, benefitId, today, endDate }: { auth: Auth; benefitId: string; today: string; endDate?: string }) {
  const { run, pending, err } = useAct();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full rounded-full bg-primary px-5 py-3.5 font-semibold text-ink">할 일에 넣기</button>
      <DueSheet open={open} onClose={() => setOpen(false)} today={today} endDate={endDate} pending={pending} err={err}
        confirmText={(d) => `${shortDate(d)} 할 일에 넣기`} onPick={(d) => run(() => createBenefitTask(auth, benefitId, d), () => setOpen(false))} />
    </>
  );
}
