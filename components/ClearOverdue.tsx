"use client";
import { useState } from "react";
import { clearOverdue } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "./useAct";
import Sheet from "./Sheet";

// 날짜가 지난 일을 한꺼번에 끝냄으로 정리한다. 무엇이 정리되는지 먼저 보여 주고, 지원 신청과 반복 일은 남겨 둔다.
export default function ClearOverdue({ auth, titles }: { auth: Auth; titles: string[] }) {
  const [open, setOpen] = useState(false);
  const { run, pending, err } = useAct();
  if (!titles.length) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 flex min-h-11 w-full items-center justify-center rounded-full bg-accent-soft px-5 text-sm font-semibold text-accent">지난 일 한 번에 정리하기</button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`지난 일 ${titles.length}개 정리`}>
        <p className="text-sm text-muted">아래 일을 끝냄으로 바꿔요. 지원 신청과 반복하는 일은 남겨 둬요.</p>
        <ul className="mt-3 max-h-[45vh] space-y-1.5 overflow-y-auto text-sm">
          {titles.map((t, i) => <li key={i} className="rounded-lg bg-background px-3 py-2">{t}</li>)}
        </ul>
        {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-full bg-background px-5 py-3 font-semibold text-muted">취소</button>
          <button type="button" disabled={pending} onClick={() => run(() => clearOverdue(auth), () => setOpen(false))} className="flex-[2] rounded-full bg-primary px-5 py-3 font-semibold text-ink disabled:opacity-40">{titles.length}개 끝냄으로 정리</button>
        </div>
      </Sheet>
    </>
  );
}
