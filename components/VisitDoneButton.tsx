"use client";
import { useState } from "react";
import VisitSheet, { type VisitSheetProps } from "./VisitSheet";

// 병원 가는 날 홈 카드의 "진료 끝났어요": 데일리 체크 기록이 없어도 진료 직후 시트를 연다
export default function VisitDoneButton(props: VisitSheetProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-2.5 flex min-h-11 w-full items-center justify-center rounded-full bg-accent-soft px-5 text-sm font-semibold text-accent">진료 끝났어요</button>
      <VisitSheet {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
