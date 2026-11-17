"use client";
import { useState } from "react";
import { setDailyCompleted } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "./useAct";

export default function DailyCompleteToggle({
  auth,
  completed,
  variant,
}: {
  auth: Auth;
  completed: boolean;
  variant: "card" | "setting";
}) {
  const { run, pending } = useAct();
  const [ask, setAsk] = useState(false); // 완료 처리 전 한 번 확인(되돌릴 수는 있지만 홈 카드가 사라지는 큰 변화라서)
  const start = () => (completed ? run(() => setDailyCompleted(auth, false)) : setAsk(true));
  const finish = () => run(() => setDailyCompleted(auth, true), () => setAsk(false));

  const confirmPanel = ask && !completed && (
    <div role="alertdialog" aria-label="회복 완료 확인" className="basis-full rounded-xl bg-background p-3">
      <p className="text-sm font-semibold">회복 완료로 처리할까요?</p>
      <p className="mt-0.5 text-xs text-muted">홈의 매일 안부 체크 카드가 숨겨져요. ‘기록 다시 시작’으로 언제든 되돌릴 수 있어요.</p>
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={pending} onClick={finish} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-ink">회복 완료 처리</button>
        <button type="button" onClick={() => setAsk(false)} className="rounded-full bg-card px-4 py-2 text-sm font-semibold text-muted shadow-card">취소</button>
      </div>
    </div>
  );

  if (variant === "setting") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4 shadow-card">
        <div>
          <p className="font-semibold">{completed ? "회복 완료로 기록을 마쳤어요" : "데일리 체크 진행 중"}</p>
          <p className="text-xs text-muted mt-0.5">
            {completed
              ? "홈 화면의 매일 안부 체크 카드가 숨겨진 상태예요."
              : "수술·퇴원 후 회복이 안정되면 데일리 체크를 마칠 수 있어요."}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={start}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            completed
              ? "bg-accent-soft text-accent hover:opacity-90"
              : "border border-line text-muted hover:text-ink"
          }`}
        >
          {completed ? "기록 다시 시작" : "회복 완료 처리"}
        </button>
        {confirmPanel}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={start}
        className="inline-flex min-h-11 items-center gap-1 text-xs text-muted underline underline-offset-2 hover:text-accent"
      >
        {completed ? "데일리 체크 다시 시작하기" : "몸이 완전히 회복되셨나요? 데일리 체크 종료하기"}
      </button>
      {confirmPanel}
    </>
  );
}
