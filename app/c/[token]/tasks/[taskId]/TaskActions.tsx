"use client";
import { toggleTask, claimTask, unclaimTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";

// 상세 화면의 주 버튼: 끝냈다고 체크하거나, 담당이 없으면 내가 맡기
export default function TaskActions({ auth, id, done, canClaim, mine = false }: { auth: Auth; id: string; done: boolean; canClaim: boolean; mine?: boolean }) {
  const { run, pending, err } = useAct();
  return (
    <div className="mt-4 space-y-2">
      {err && <p role="alert" className="text-sm text-warn">{err}</p>}
      <button disabled={pending} onClick={() => run(() => toggleTask(auth, id, !done))}
        className={done ? "w-full rounded-full bg-accent-soft px-5 py-3.5 font-semibold text-accent" : "w-full rounded-full bg-primary px-5 py-3.5 font-semibold text-ink"}>
        {pending ? "바꾸는 중…" : done ? "아직 안 끝났어요" : "끝냈어요"}
      </button>
      {canClaim && !done && (
        <button disabled={pending} onClick={() => run(() => claimTask(auth, id))} className="w-full rounded-full bg-accent-soft px-5 py-3 font-semibold text-accent">내가 할게</button>
      )}
      {mine && !done && (
        <button disabled={pending} onClick={() => run(() => unclaimTask(auth, id))} className="w-full text-sm text-muted underline underline-offset-2">내가 맡은 것 취소하기</button>
      )}
    </div>
  );
}
