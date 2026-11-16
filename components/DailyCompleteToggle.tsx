"use client";
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

  if (variant === "setting") {
    return (
      <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-card">
        <div>
          <p className="font-semibold">{completed ? "회복 완료 (데일리 체크 종료됨)" : "데일리 체크 진행 중"}</p>
          <p className="text-xs text-muted mt-0.5">
            {completed
              ? "홈 화면의 매일 안부 체크 카드가 숨겨진 상태예요."
              : "수술·퇴원 후 회복이 안정되면 데일리 체크를 마칠 수 있어요."}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setDailyCompleted(auth, !completed))}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            completed
              ? "bg-accent-soft text-accent hover:opacity-90"
              : "border border-line text-muted hover:text-ink"
          }`}
        >
          {completed ? "기록 다시 시작" : "회복 완료 처리"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(() => setDailyCompleted(auth, !completed))}
      className="inline-flex min-h-11 items-center gap-1 text-xs text-muted underline underline-offset-2 hover:text-accent"
    >
      {completed ? "데일리 체크 다시 시작하기" : "몸이 완전히 회복되셨나요? 데일리 체크 종료하기"}
    </button>
  );
}
